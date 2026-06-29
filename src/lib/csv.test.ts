import { describe, expect, it } from "vitest";
import { restaurantsToCsv } from "./csv";
import type { RestaurantResult } from "./domain";

describe("restaurantsToCsv", () => {
  it("exports Google My Maps columns and approximate geocode status", () => {
    const csv = restaurantsToCsv([
      {
        id: "one",
        name: "gelateria-test",
        displayName: "Gelateria Test",
        address: "Approximate center of Rome",
        lat: 41.9,
        lng: 12.49,
        geocodeStatus: "unmapped",
        score: 210,
        mentionCount: 2,
        averagePositionPoints: 10,
        reasoning: "2 sources; positions: unranked, unranked.",
        category: "gelato",
        sources: [
          { title: "Guide", url: "https://guide.test", isRanked: false }
        ],
        warnings: []
      } satisfies RestaurantResult
    ]);

    expect(csv.split("\n")[0]).toBe(
      "Name,Address,Latitude,Longitude,Category,Score,Mention Count,Sources,Reasoning,Geocode Status"
    );
    expect(csv).toContain("unmapped");
  });
});
