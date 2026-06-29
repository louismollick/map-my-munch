import type { ExtractedMention, GeocodeResult } from "./domain";

export type MentionWithGeocode = ExtractedMention & {
  geocode: GeocodeResult;
};

export function normalizeRestaurantName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(restaurant|ristorante|cafe|caffe|bar|the)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function closeCoordinates(a: GeocodeResult, b: GeocodeResult) {
  return Math.abs(a.lat - b.lat) < 0.0002 && Math.abs(a.lng - b.lng) < 0.0002;
}

function sameResolvedPlace(a: GeocodeResult, b: GeocodeResult) {
  if (a.status !== "exact" || b.status !== "exact") {
    return false;
  }

  if (a.placeId && b.placeId && a.placeId === b.placeId) {
    return true;
  }

  return closeCoordinates(a, b);
}

export function dedupeMentions(mentions: MentionWithGeocode[]) {
  const groups: MentionWithGeocode[][] = [];

  for (const mention of mentions) {
    const normalized =
      mention.normalizedName || normalizeRestaurantName(mention.name);
    const existing = groups.find((group) => {
      const first = group[0];
      const firstNormalized =
        first.normalizedName || normalizeRestaurantName(first.name);

      if (sameResolvedPlace(first.geocode, mention.geocode)) {
        return true;
      }

      if (
        first.geocode.status === "exact" &&
        mention.geocode.status === "exact"
      ) {
        return false;
      }

      return firstNormalized === normalized;
    });

    if (existing) {
      existing.push(mention);
    } else {
      groups.push([mention]);
    }
  }

  return groups;
}
