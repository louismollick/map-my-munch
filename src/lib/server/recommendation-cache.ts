import { eq } from "drizzle-orm";
import type { RecommendationArtifacts, RecommendationInput } from "../domain";
import {
  cleanRecommendationInput,
  makeRecommendationCacheKey
} from "../recommendation-query";
import { getDb } from "./db/client";
import { recommendationCacheTable } from "./db/schema";

export type RecommendationCache = {
  get(input: RecommendationInput): Promise<RecommendationArtifacts | null>;
  set(artifacts: RecommendationArtifacts): Promise<boolean>;
};

function rowToArtifacts(
  row: typeof recommendationCacheTable.$inferSelect
): RecommendationArtifacts {
  return {
    input: {
      place: row.place,
      category: row.category
    },
    query: row.query,
    generatedAt: row.refreshedAt.toISOString(),
    placeGeocode: row.placeGeocode,
    searchResults: row.searchResults,
    articles: row.articles,
    extractedMentions: row.extractedMentions,
    geocodedMentions: row.geocodedMentions,
    warnings: row.warnings
  };
}

export const recommendationCache: RecommendationCache = {
  async get(input) {
    const db = getDb();
    if (!db) {
      return null;
    }

    const cleaned = cleanRecommendationInput(input);
    const cacheKey = makeRecommendationCacheKey(cleaned);
    const [row] = await db
      .select()
      .from(recommendationCacheTable)
      .where(eq(recommendationCacheTable.cacheKey, cacheKey))
      .limit(1);

    return row ? rowToArtifacts(row) : null;
  },
  async set(artifacts) {
    const db = getDb();
    if (!db) {
      return false;
    }

    const input = cleanRecommendationInput(artifacts.input);
    const cacheKey = makeRecommendationCacheKey(input);
    const now = new Date();
    await db
      .insert(recommendationCacheTable)
      .values({
        cacheKey,
        place: input.place,
        category: input.category,
        normalizedPlace: input.place.toLowerCase(),
        normalizedCategory: input.category.toLowerCase(),
        query: artifacts.query,
        placeGeocode: artifacts.placeGeocode,
        searchResults: artifacts.searchResults,
        articles: artifacts.articles,
        extractedMentions: artifacts.extractedMentions,
        geocodedMentions: artifacts.geocodedMentions,
        warnings: artifacts.warnings,
        refreshedAt: new Date(artifacts.generatedAt),
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: recommendationCacheTable.cacheKey,
        set: {
          place: input.place,
          category: input.category,
          normalizedPlace: input.place.toLowerCase(),
          normalizedCategory: input.category.toLowerCase(),
          query: artifacts.query,
          placeGeocode: artifacts.placeGeocode,
          searchResults: artifacts.searchResults,
          articles: artifacts.articles,
          extractedMentions: artifacts.extractedMentions,
          geocodedMentions: artifacts.geocodedMentions,
          warnings: artifacts.warnings,
          refreshedAt: new Date(artifacts.generatedAt),
          updatedAt: now
        }
      });

    return true;
  }
};
