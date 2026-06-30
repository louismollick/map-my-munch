import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type {
  ExtractedMention,
  GeocodeResult,
  MentionWithGeocode,
  SearchArticleResult,
  SourceArticle
} from "../../domain";

export const recommendationCacheTable = pgTable("recommendation_cache", {
  cacheKey: text("cache_key").primaryKey(),
  place: text("place").notNull(),
  category: text("category").notNull(),
  normalizedPlace: text("normalized_place").notNull(),
  normalizedCategory: text("normalized_category").notNull(),
  query: text("query").notNull(),
  placeGeocode: jsonb("place_geocode").$type<GeocodeResult>().notNull(),
  searchResults: jsonb("search_results")
    .$type<SearchArticleResult[]>()
    .notNull(),
  articles: jsonb("articles").$type<SourceArticle[]>().notNull(),
  extractedMentions: jsonb("extracted_mentions")
    .$type<ExtractedMention[]>()
    .notNull(),
  geocodedMentions: jsonb("geocoded_mentions")
    .$type<MentionWithGeocode[]>()
    .notNull(),
  warnings: jsonb("warnings").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }).notNull()
});
