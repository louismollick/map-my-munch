import { afterEach, describe, expect, it, vi } from "vitest";
import type { RecommendationArtifacts } from "../domain";

function createArtifacts(): RecommendationArtifacts {
  return {
    input: { place: "Rome", category: "gelato" },
    query: "best gelato in Rome",
    generatedAt: "2026-01-01T00:00:00.000Z",
    placeGeocode: {
      lat: 41.9,
      lng: 12.4,
      status: "approximate"
    },
    searchResults: [],
    articles: [],
    extractedMentions: [],
    geocodedMentions: [],
    warnings: []
  };
}

describe("recommendationCache", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
    vi.resetModules();
  });

  it("gracefully disables itself when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;
    vi.resetModules();

    const { recommendationCache } = await import("./recommendation-cache");

    await expect(
      recommendationCache.get({ place: "Rome", category: "gelato" })
    ).resolves.toBeNull();
    await expect(recommendationCache.set(createArtifacts())).resolves.toBe(
      false
    );
  });
});
