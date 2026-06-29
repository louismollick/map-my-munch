import type { RestaurantResult } from "./domain";

const CSV_HEADERS = [
  "Name",
  "Address",
  "Latitude",
  "Longitude",
  "Category",
  "Score",
  "Mention Count",
  "Sources",
  "Reasoning",
  "Geocode Status"
] as const;

function escapeCsv(value: string | number | undefined) {
  const text = value === undefined ? "" : String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function restaurantsToCsv(restaurants: RestaurantResult[]) {
  const rows = restaurants.map((restaurant) => [
    restaurant.displayName,
    restaurant.address,
    restaurant.lat,
    restaurant.lng,
    restaurant.category,
    restaurant.score.toFixed(2),
    restaurant.mentionCount,
    restaurant.sources.map((source) => source.url).join(" | "),
    restaurant.reasoning,
    restaurant.geocodeStatus
  ]);

  return [CSV_HEADERS, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
}
