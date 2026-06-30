import { dedupeMentions, normalizeRestaurantName } from "../dedupe";
import type {
  ExtractedMention,
  GeocodeResult,
  MentionWithGeocode,
  RecommendationArtifacts,
  RecommendationInput,
  RecommendationRunResult,
  RestaurantResult
} from "../domain";
import {
  cleanRecommendationInput,
  makeRecommendationQuery
} from "../recommendation-query";
import { scoreMentions, sortRestaurants } from "../scoring";
import { createExaClient, type ExaClient } from "./exa";
import { createGoogleGeocodeClient, type GeocodeClient } from "./google";
import {
  createOpenRouterExtractionClient,
  type ExtractionClient
} from "./openrouter";
import {
  type RecommendationCache,
  recommendationCache
} from "./recommendation-cache";

export type RecommendationClients = {
  exa: ExaClient;
  extraction: ExtractionClient;
  geocode: GeocodeClient;
};

export type RecommendationWorkflowOptions = {
  refresh?: boolean;
  cache?: RecommendationCache;
  logger?: Pick<Console, "error">;
};

const CACHE_WRITE_WARNING =
  "Cache persistence unavailable; returned live results without saving.";

export function createDefaultRecommendationClients(): RecommendationClients {
  return {
    exa: createExaClient(),
    extraction: createOpenRouterExtractionClient(),
    geocode: createGoogleGeocodeClient()
  };
}

function displayNameForGroup(group: MentionWithGeocode[]) {
  return group.sort((a, b) => a.name.length - b.name.length)[0].name;
}

async function extractMentions(
  clients: RecommendationClients,
  articles: RecommendationArtifacts["articles"],
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

export async function fetchRecommendationArtifacts(
  rawInput: RecommendationInput,
  clients = createDefaultRecommendationClients()
): Promise<RecommendationArtifacts> {
  const input = cleanRecommendationInput(rawInput);
  const warnings: string[] = [];
  const placeGeocode = await clients.geocode.geocodePlace(input.place);
  const query = makeRecommendationQuery(input);

  let searchResults: RecommendationArtifacts["searchResults"] = [];
  try {
    searchResults = await clients.exa.searchArticles(query);
  } catch (error) {
    warnings.push(
      `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  let articles: RecommendationArtifacts["articles"] = [];
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

  return {
    input,
    query,
    generatedAt: new Date().toISOString(),
    placeGeocode,
    searchResults,
    articles,
    extractedMentions,
    geocodedMentions,
    warnings
  };
}

export function buildRecommendationResultFromArtifacts(
  artifacts: RecommendationArtifacts
): RecommendationRunResult {
  const restaurants = sortRestaurants(
    dedupeMentions(artifacts.geocodedMentions).map((group) =>
      groupToRestaurant(group, artifacts.input)
    )
  );

  return {
    input: artifacts.input,
    query: artifacts.query,
    generatedAt: artifacts.generatedAt,
    restaurants,
    warnings: [...artifacts.warnings]
  };
}

export function hasViableRecommendationArtifacts(
  artifacts: RecommendationArtifacts
) {
  return artifacts.articles.length > 0 && artifacts.geocodedMentions.length > 0;
}

export async function runRecommendationWorkflow(
  rawInput: RecommendationInput,
  clients = createDefaultRecommendationClients(),
  options: RecommendationWorkflowOptions = {}
): Promise<RecommendationRunResult> {
  const input = cleanRecommendationInput(rawInput);
  if (!input.place || !input.category) {
    throw new Error("Place and category are required.");
  }

  const cache = options.cache ?? recommendationCache;
  const logger = options.logger ?? console;
  let artifacts: RecommendationArtifacts | null = null;
  let liveArtifacts: RecommendationArtifacts | null = null;
  let shouldAppendCacheWriteWarning = false;

  if (!options.refresh) {
    try {
      artifacts = await cache.get(input);
    } catch (error) {
      logger.error("Recommendation cache read failed", error);
    }
  }

  if (!artifacts) {
    liveArtifacts = await fetchRecommendationArtifacts(input, clients);
    artifacts = liveArtifacts;

    if (hasViableRecommendationArtifacts(liveArtifacts)) {
      try {
        const persisted = await cache.set(liveArtifacts);
        shouldAppendCacheWriteWarning = persisted === false;
      } catch (error) {
        logger.error("Recommendation cache write failed", error);
        shouldAppendCacheWriteWarning = true;
      }
    }
  }

  const result = buildRecommendationResultFromArtifacts(artifacts);
  if (liveArtifacts && shouldAppendCacheWriteWarning) {
    result.warnings.push(CACHE_WRITE_WARNING);
  }

  return result;
}
