import { describe, expect, it } from "vitest";
import type { RecommendationClients } from "./recommendations";
import { runRecommendationWorkflow } from "./recommendations";

describe("runRecommendationWorkflow", () => {
  it("returns partial results with warnings when one extraction fails", async () => {
    const clients: RecommendationClients = {
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

    const result = await runRecommendationWorkflow(
      { place: "Rome", category: "gelato" },
      clients
    );

    expect(result.restaurants).toHaveLength(1);
    expect(
      result.warnings.some((warning) => warning.includes("Extraction failed"))
    ).toBe(true);
  });
});
