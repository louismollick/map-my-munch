import type { RecommendationInput } from "./domain";

export function normalizeRecommendationValue(value: string) {
  return value.trim().replaceAll(/\s+/g, " ");
}

export function cleanRecommendationInput(
  input: RecommendationInput
): RecommendationInput {
  return {
    place: normalizeRecommendationValue(input.place),
    category: normalizeRecommendationValue(input.category)
  };
}

export function makeRecommendationQuery(input: RecommendationInput) {
  return `best ${input.category} in ${input.place}`;
}

export function makeRecommendationCacheKey(input: RecommendationInput) {
  return `place:${input.place.toLowerCase()}|category:${input.category.toLowerCase()}`;
}
