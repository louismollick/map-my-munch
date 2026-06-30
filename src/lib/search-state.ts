import {
  cleanRecommendationInput,
  makeRecommendationCacheKey
} from "./recommendation-query";

export type HomeSearch = {
  place?: string;
  category?: string;
  refresh?: "1";
};

function cleanSearchValue(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim().replaceAll(/\s+/g, " ");
  return trimmed ? trimmed : undefined;
}

export function validateHomeSearch(
  search: Record<string, unknown>
): HomeSearch {
  return {
    place: cleanSearchValue(search.place),
    category: cleanSearchValue(search.category),
    refresh: search.refresh === "1" ? "1" : undefined
  };
}

export function hasRunnableSearch(
  search: HomeSearch
): search is Required<Pick<HomeSearch, "place" | "category">> & HomeSearch {
  return Boolean(search.place && search.category);
}

export function stripRefreshFromSearch(search: HomeSearch): HomeSearch {
  return {
    place: search.place,
    category: search.category
  };
}

export function makeHomeSearchRunKey(search: HomeSearch) {
  if (!hasRunnableSearch(search)) {
    return null;
  }

  return [
    makeRecommendationCacheKey(
      cleanRecommendationInput({
        place: search.place,
        category: search.category
      })
    ),
    search.refresh === "1" ? "refresh" : "cached"
  ].join("\u0000");
}
