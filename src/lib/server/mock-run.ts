import type { RecommendationInput, RecommendationRunResult } from "../domain";

const bolognaRestaurants = [
  [
    "Allegra Solo Bar",
    "Via Santo Stefano, 70b, 40124 Bologna BO, Italy",
    44.4917,
    11.352
  ],
  [
    "Aroma Specialty Coffee",
    "Via Porta Nova, 12 b, 40123 Bologna BO, Italy",
    44.4948,
    11.3389
  ],
  [
    "Caffe Terzi",
    "Via Guglielmo Oberdan, 10d, 40126 Bologna BO, Italy",
    44.4966,
    11.345
  ],
  [
    "Caffe Zanarini",
    "Piazza Galvani, 1, 40124 Bologna BO, Italy",
    44.4925,
    11.3434
  ],
  [
    "Forno Brisa",
    "Via Nicolò Dall'Arca, 16, 40129 Bologna BO, Italy",
    44.5096,
    11.3441
  ],
  [
    "Forno Brisa Galliera",
    "Via Galliera, 34d, 40121 Bologna BO, Italy",
    44.5006,
    11.3414
  ],
  ["Zoo", "Strada Maggiore, 50, 40125 Bologna BO, Italy", 44.4928, 11.3549]
] as const;

export function makeMockRecommendationRun(
  input: RecommendationInput
): RecommendationRunResult {
  return {
    input,
    query: `best ${input.category} in ${input.place}`,
    generatedAt: new Date().toISOString(),
    warnings: [
      "Extraction failed for Principe Bologna.",
      "Zoo: Google returned an approximate location."
    ],
    restaurants: bolognaRestaurants.map(([name, address, lat, lng], index) => ({
      id: `${name}-${index}`,
      name: name.toLowerCase().replaceAll(/\s+/g, "-"),
      displayName: name,
      address,
      lat,
      lng,
      geocodeStatus: name === "Zoo" ? "approximate" : "exact",
      score: index < 2 ? 210 : 110,
      mentionCount: index < 2 ? 2 : 1,
      averagePositionPoints: 10,
      reasoning:
        index < 2
          ? "2 sources; positions: unranked, unranked."
          : "1 source; positions: unranked.",
      category: input.category,
      sources: [
        {
          title: "Bologna Breakfast Guide",
          url: "https://example.com/bologna-breakfast",
          isRanked: false,
          snippet: "Recommended in a Bologna breakfast guide."
        }
      ],
      warnings:
        name === "Zoo" ? ["Google returned an approximate location."] : []
    }))
  };
}
