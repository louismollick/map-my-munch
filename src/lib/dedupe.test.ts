import { describe, expect, it } from "vitest";
import { dedupeMentions, type MentionWithGeocode } from "./dedupe";

function mention(
  name: string,
  placeId: string,
  lat: number,
  lng: number
): MentionWithGeocode {
  return {
    sourceId: placeId,
    sourceTitle: placeId,
    sourceUrl: `https://${placeId}.test`,
    name,
    isRanked: false,
    geocode: {
      formattedAddress: `${placeId} street`,
      lat,
      lng,
      placeId,
      status: "exact"
    }
  };
}

describe("dedupeMentions", () => {
  it("merges alias mentions with the same Google place", () => {
    const groups = dedupeMentions([
      mention("Gelateria Test", "same", 41.9, 12.4),
      mention("Test Gelato", "same", 41.9, 12.4)
    ]);

    expect(groups).toHaveLength(1);
  });

  it("keeps same brand with different addresses separate", () => {
    const groups = dedupeMentions([
      mention("Gelateria Test", "one", 41.9, 12.4),
      mention("Gelateria Test", "two", 41.91, 12.41)
    ]);

    expect(groups).toHaveLength(2);
  });
});
