import { describe, expect, it } from "vitest";
import type { RestaurantResult } from "./domain";
import { positionPoints, scoreMentions, sortRestaurants } from "./scoring";

function restaurant(overrides: Partial<RestaurantResult>): RestaurantResult {
  return {
    id: "id",
    name: "name",
    displayName: "Name",
    lat: 0,
    lng: 0,
    geocodeStatus: "exact",
    score: 0,
    mentionCount: 0,
    averagePositionPoints: 0,
    reasoning: "",
    category: "gelato",
    sources: [],
    warnings: [],
    ...overrides
  };
}

describe("scoring", () => {
  it("gives unranked mentions equal within-source position weight", () => {
    expect(positionPoints({ isRanked: false })).toBe(10);
  });

  it("lets multiple decent mentions outrank one highly ranked mention", () => {
    const singleTop = scoreMentions([
      {
        sourceId: "a",
        sourceTitle: "A",
        sourceUrl: "https://a.test",
        name: "Solo",
        position: 1,
        isRanked: true
      }
    ]);
    const consensus = scoreMentions([
      {
        sourceId: "b",
        sourceTitle: "B",
        sourceUrl: "https://b.test",
        name: "Many",
        position: 8,
        isRanked: true
      },
      {
        sourceId: "c",
        sourceTitle: "C",
        sourceUrl: "https://c.test",
        name: "Many",
        isRanked: false
      }
    ]);

    expect(consensus.score).toBeGreaterThan(singleTop.score);
  });

  it("uses rank as a tie breaker through average position points", () => {
    const sorted = sortRestaurants([
      restaurant({
        displayName: "Second",
        score: 212,
        mentionCount: 2,
        averagePositionPoints: 12
      }),
      restaurant({
        displayName: "First",
        score: 218,
        mentionCount: 2,
        averagePositionPoints: 18
      })
    ]);

    expect(sorted[0].displayName).toBe("First");
  });
});
