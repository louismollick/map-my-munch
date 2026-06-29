import type { ExtractedMention, RestaurantResult } from "./domain";

export function positionPoints(
  mention: Pick<ExtractedMention, "position" | "isRanked">
) {
  if (!mention.isRanked || typeof mention.position !== "number") {
    return 10;
  }

  return Math.max(0, 20 - mention.position);
}

export function scoreMentions(mentions: ExtractedMention[]) {
  const mentionCount = mentions.length;
  const totalPositionPoints = mentions.reduce(
    (sum, mention) => sum + positionPoints(mention),
    0
  );
  const averagePositionPoints =
    mentionCount === 0 ? 0 : totalPositionPoints / mentionCount;

  return {
    mentionCount,
    averagePositionPoints,
    score: mentionCount * 100 + averagePositionPoints
  };
}

export function sortRestaurants(restaurants: RestaurantResult[]) {
  return [...restaurants].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    if (b.mentionCount !== a.mentionCount) {
      return b.mentionCount - a.mentionCount;
    }

    if (b.averagePositionPoints !== a.averagePositionPoints) {
      return b.averagePositionPoints - a.averagePositionPoints;
    }

    return a.displayName.localeCompare(b.displayName);
  });
}
