import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecommendationArtifacts } from "../domain";
import type { RecommendationClients } from "./recommendations";
import {
  buildRecommendationResultFromArtifacts,
  runRecommendationWorkflow
} from "./recommendations";

function createClients(): RecommendationClients {
  return {
    exa: {
      async searchArticles() {
        return [
          { id: "a", title: "A", url: "https://a.test" },
          { id: "b", title: "B", url: "https://b.test" }
        ];
      },
      async getArticleContents() {
        return [
          { id: "a", title: "A", url: "https://a.test", text: "Gelato One" },
          { id: "b", title: "B", url: "https://b.test", text: "Gelato One" }
        ];
      }
    },
    extraction: {
      async extractMentions(article) {
        if (article.id === "b") {
          throw new Error("model unavailable");
        }

        return [
          {
            sourceId: article.id,
            sourceTitle: article.title,
            sourceUrl: article.url,
            name: "Gelato One",
            position: 1,
            isRanked: true
          }
        ];
      }
    },
    geocode: {
      async geocodePlace() {
        return { lat: 41.9, lng: 12.4, status: "approximate" };
      },
      async geocodeRestaurant() {
        return {
          lat: 41.901,
          lng: 12.401,
          placeId: "gelato-one",
          formattedAddress: "1 Test St",
          status: "exact"
        };
      }
    }
  };
}

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
    searchResults: [{ id: "a", title: "A", url: "https://a.test" }],
    articles: [
      { id: "a", title: "A", url: "https://a.test", text: "Gelato One" }
    ],
    extractedMentions: [
      {
        sourceId: "a",
        sourceTitle: "A",
        sourceUrl: "https://a.test",
        name: "Gelato One",
        position: 1,
        isRanked: true
      }
    ],
    geocodedMentions: [
      {
        sourceId: "a",
        sourceTitle: "A",
        sourceUrl: "https://a.test",
        name: "Gelato One",
        position: 1,
        isRanked: true,
        geocode: {
          lat: 41.901,
          lng: 12.401,
          placeId: "gelato-one",
          formattedAddress: "1 Test St",
          status: "exact"
        }
      }
    ],
    warnings: []
  };
}

describe("runRecommendationWorkflow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns partial results with warnings when one extraction fails", async () => {
    const result = await runRecommendationWorkflow(
      { place: "Rome", category: "gelato" },
      createClients(),
      {
        cache: {
          async get() {
            return null;
          },
          async set() {
            return true;
          }
        }
      }
    );

    expect(result.restaurants).toHaveLength(1);
    expect(
      result.warnings.some((warning) => warning.includes("Extraction failed"))
    ).toBe(true);
  });

  it("reuses cached artifacts without calling upstream services", async () => {
    const clients = createClients();
    const searchSpy = vi.spyOn(clients.exa, "searchArticles");

    const result = await runRecommendationWorkflow(
      { place: "Rome", category: "gelato" },
      clients,
      {
        cache: {
          async get() {
            return createArtifacts();
          },
          async set() {
            return true;
          }
        }
      }
    );

    expect(searchSpy).not.toHaveBeenCalled();
    expect(result.generatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(result.restaurants[0]?.displayName).toBe("Gelato One");
  });

  it("bypasses cache reads on refresh and persists viable live artifacts", async () => {
    const clients = createClients();
    const cacheGet = vi.fn(async () => createArtifacts());
    const cacheSet = vi.fn(async () => true);

    const result = await runRecommendationWorkflow(
      { place: "Rome", category: "gelato" },
      clients,
      {
        refresh: true,
        cache: {
          get: cacheGet,
          set: cacheSet
        }
      }
    );

    expect(cacheGet).not.toHaveBeenCalled();
    expect(cacheSet).toHaveBeenCalledTimes(1);
    expect(result.restaurants).toHaveLength(1);
  });

  it("does not overwrite cache with weak refresh results", async () => {
    const cacheSet = vi.fn(async () => true);

    await runRecommendationWorkflow(
      { place: "Rome", category: "gelato" },
      {
        exa: {
          async searchArticles() {
            return [{ id: "a", title: "A", url: "https://a.test" }];
          },
          async getArticleContents() {
            return [];
          }
        },
        extraction: {
          async extractMentions() {
            return [];
          }
        },
        geocode: {
          async geocodePlace() {
            return { lat: 41.9, lng: 12.4, status: "approximate" };
          },
          async geocodeRestaurant() {
            return {
              lat: 41.901,
              lng: 12.401,
              placeId: "gelato-one",
              formattedAddress: "1 Test St",
              status: "exact"
            };
          }
        }
      },
      {
        refresh: true,
        cache: {
          async get() {
            return createArtifacts();
          },
          set: cacheSet
        }
      }
    );

    expect(cacheSet).not.toHaveBeenCalled();
  });

  it("falls back to live results when cache read and write fail", async () => {
    const logger = {
      error: vi.fn()
    };

    const result = await runRecommendationWorkflow(
      { place: "Rome", category: "gelato" },
      createClients(),
      {
        cache: {
          async get() {
            throw new Error("db read failed");
          },
          async set() {
            throw new Error("db write failed");
          }
        },
        logger
      }
    );

    expect(result.restaurants).toHaveLength(1);
    expect(
      result.warnings.some((warning) =>
        warning.includes("Cache persistence unavailable")
      )
    ).toBe(true);
    expect(logger.error).toHaveBeenCalledTimes(2);
  });

  it("recomputes final results from artifacts", () => {
    const artifacts = createArtifacts();

    artifacts.geocodedMentions.push({
      sourceId: "b",
      sourceTitle: "B",
      sourceUrl: "https://b.test",
      name: "Gelato One",
      position: 2,
      isRanked: true,
      geocode: {
        lat: 41.901,
        lng: 12.401,
        placeId: "gelato-one",
        formattedAddress: "1 Test St",
        status: "exact"
      }
    });

    const result = buildRecommendationResultFromArtifacts(artifacts);

    expect(result.restaurants[0]?.mentionCount).toBe(2);
  });
});
