const markerTones = ["coral", "amber", "green", "blue", "violet"] as const;

const placeholderTemplates = [
  "A polished stop for %category% with dependable editorial heat and a strong sense of place.",
  "Editors keep circling back to this one for %category%, easy charm, and a memorable first bite.",
  "A reliable pick when %category% is the brief, with atmosphere that reads well on any shortlist.",
  "One of the sharper addresses for %category%, pairing local reputation with an easy, welcoming rhythm.",
  "A crowd-pleasing choice for %category% that feels worth building a day around."
] as const;

export function getMarkerTone(index: number) {
  return markerTones[index % markerTones.length];
}

export function getMarkerLetter(index: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return alphabet[index] ?? `${index + 1}`;
}

export function getPlaceholderDescription(index: number, category?: string) {
  const safeCategory = category?.trim().toLowerCase() || "the specialty";
  return placeholderTemplates[index % placeholderTemplates.length].replace(
    "%category%",
    safeCategory
  );
}

export function buildResultsTitle(place?: string, category?: string) {
  if (!place || !category) {
    return "Search for a place and craving";
  }

  return `Best ${category.trim().toLowerCase()} in ${toDisplayPlace(place)}`;
}

function toDisplayPlace(place: string) {
  return place
    .trim()
    .split(/\s+/u)
    .map((word) =>
      word.length <= 2
        ? word.toUpperCase()
        : `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`
    )
    .join(" ");
}
