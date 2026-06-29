import {
  dedupeMentions,
  type MentionWithGeocode,
  normalizeRestaurantName
} from "../dedupe";
import type {
  ExtractedMention,
  GeocodeResult,
  RecommendationInput,
  RecommendationRunResult,
  RestaurantResult
} from "../domain";
import { scoreMentions, sortRestaurants } from "../scoring";
import { createExaClient, type ExaClient } from "./exa";
import { createGoogleGeocodeClient, type GeocodeClient } from "./google";
import {
  createOpenRouterExtractionClient,
  type ExtractionClient
} from "./openrouter";

export type RecommendationClients = {
  exa: ExaClient;
  extraction: ExtractionClient;
  geocode: GeocodeClient;
};

export function createDefaultRecommendationClients(): RecommendationClients {
  return {
    exa: createExaClient(),
    extraction: createOpenRouterExtractionClient(),
    geocode: createGoogleGeocodeClient()
  };
}

const runCache = new Map<
  string,
  { expiresAt: number; result: RecommendationRunResult }
>();
const CACHE_TTL_MS = 1000 * 60 * 20;

function cleanInput(input: RecommendationInput): RecommendationInput {
  return {
    place: input.place.trim(),
    category: input.category.trim()
  };
}

function makeQuery(input: RecommendationInput) {
  return `best ${input.category} in ${input.place}`;
}

function cacheKey(input: RecommendationInput) {
  return `${input.place.toLowerCase()}\u0000${input.category.toLowerCase()}`;
}

function displayNameForGroup(group: MentionWithGeocode[]) {
  return group.sort((a, b) => a.name.length - b.name.length)[0].name;
}

async function extractMentions(
  clients: RecommendationClients,
  articles: Awaited<ReturnType<ExaClient["getArticleContents"]>>,
  input: RecommendationInput,
  warnings: string[]
) {
  const mentions: ExtractedMention[] = [];

  for (const article of articles) {
    try {
      mentions.push(
        ...(await clients.extraction.extractMentions(
          article,
          input.place,
          input.category
        ))
      );
    } catch {
      warnings.push(`Extraction failed for ${article.title}.`);
    }
  }

  return mentions;
}

async function geocodeMentions(
  clients: RecommendationClients,
  mentions: ExtractedMention[],
  input: RecommendationInput,
  placeGeocode: GeocodeResult,
  warnings: string[]
) {
  const geocoded: MentionWithGeocode[] = [];

  for (const mention of mentions) {
    try {
      const geocode = await clients.geocode.geocodeRestaurant(
        mention.name,
        input.place,
        mention.addressOrNeighborhood
      );
      geocoded.push({ ...mention, geocode });
      if (geocode.warning) {
        warnings.push(`${mention.name}: ${geocode.warning}`);
      }
    } catch {
      warnings.push(`${mention.name}: using approximate place coordinates.`);
      geocoded.push({
        ...mention,
        geocode: {
          ...placeGeocode,
          status: "unmapped",
          warning:
            "Could not confidently geocode restaurant; using approximate place coordinates."
        }
      });
    }
  }

  return geocoded;
}

function groupToRestaurant(
  group: MentionWithGeocode[],
  input: RecommendationInput
): RestaurantResult {
  const displayName = displayNameForGroup(group);
  const geocode =
    group.find((mention) => mention.geocode.status === "exact")?.geocode ||
    group[0].geocode;
  const score = scoreMentions(group);
  const normalizedName = normalizeRestaurantName(displayName);
  const warnings = group.flatMap((mention) =>
    mention.geocode.warning ? [mention.geocode.warning] : []
  );
  const sources = group.map((mention) => ({
    title: mention.sourceTitle,
    url: mention.sourceUrl,
    position: mention.position,
    isRanked: mention.isRanked,
    snippet: mention.snippet
  }));
  const ranked = sources
    .map((source) =>
      source.isRanked && source.position ? `#${source.position}` : "unranked"
    )
    .join(", ");

  return {
    id: geocode.placeId || `${normalizedName}-${geocode.lat}-${geocode.lng}`,
    name: normalizedName,
    displayName,
    address:
      geocode.formattedAddress ||
      group.find((mention) => mention.addressOrNeighborhood)
        ?.addressOrNeighborhood,
    lat: geocode.lat,
    lng: geocode.lng,
    geocodeStatus: geocode.status,
    score: score.score,
    mentionCount: score.mentionCount,
    averagePositionPoints: score.averagePositionPoints,
    reasoning: `${score.mentionCount} source${score.mentionCount === 1 ? "" : "s"}; positions: ${ranked}.`,
    category: input.category,
    sources,
    warnings
  };
}

export async function runRecommendationWorkflow(
  rawInput: RecommendationInput,
  clients = createDefaultRecommendationClients()
): Promise<RecommendationRunResult> {
  const input = cleanInput(rawInput);
  if (!input.place || !input.category) {
    throw new Error("Place and category are required.");
  }

  const query = makeQuery(input);
  const key = cacheKey(input);
  const cached = runCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const warnings: string[] = [];
  const placeGeocode = await clients.geocode.geocodePlace(input.place);

  let searchResults: Awaited<ReturnType<ExaClient["searchArticles"]>> = [];
  try {
    searchResults = await clients.exa.searchArticles(query);
  } catch (error) {
    warnings.push(
      `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  let articles: Awaited<ReturnType<ExaClient["getArticleContents"]>> = [];
  try {
    articles = await clients.exa.getArticleContents(
      searchResults.map((result) => result.url)
    );
  } catch (error) {
    warnings.push(
      `Contents retrieval failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  const extractedMentions = await extractMentions(
    clients,
    articles,
    input,
    warnings
  );
  const geocodedMentions = await geocodeMentions(
    clients,
    extractedMentions,
    input,
    placeGeocode,
    warnings
  );
  const restaurants = sortRestaurants(
    dedupeMentions(geocodedMentions).map((group) =>
      groupToRestaurant(group, input)
    )
  );

  const result = {
    input,
    query,
    generatedAt: new Date().toISOString(),
    restaurants,
    warnings
  };
  runCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result });

  return result;
}
