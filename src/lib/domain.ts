export type RecommendationInput = {
  place: string;
  category: string;
};

export type SourceArticle = {
  id: string;
  title: string;
  url: string;
  author?: string;
  publishedDate?: string;
  text: string;
};

export type ExtractedMention = {
  sourceId: string;
  sourceTitle: string;
  sourceUrl: string;
  name: string;
  normalizedName?: string;
  addressOrNeighborhood?: string;
  position?: number;
  isRanked: boolean;
  snippet?: string;
};

export type GeocodeStatus = "exact" | "approximate" | "unmapped";

export type GeocodeResult = {
  formattedAddress?: string;
  lat: number;
  lng: number;
  placeId?: string;
  status: GeocodeStatus;
  warning?: string;
};

export type RestaurantResult = {
  id: string;
  name: string;
  displayName: string;
  address?: string;
  lat: number;
  lng: number;
  geocodeStatus: GeocodeStatus;
  score: number;
  mentionCount: number;
  averagePositionPoints: number;
  reasoning: string;
  category: string;
  sources: Array<{
    title: string;
    url: string;
    position?: number;
    isRanked: boolean;
    snippet?: string;
  }>;
  warnings: string[];
};

export type RecommendationRunResult = {
  input: RecommendationInput;
  query: string;
  generatedAt: string;
  restaurants: RestaurantResult[];
  warnings: string[];
};
