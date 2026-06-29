# Map My Munch

Travel food-planning app that turns scattered editorial restaurant recommendations into a ranked consensus shortlist for a place and food category.

## What It Does

- Runs one recommendation workflow for a free-text place and category.
- Searches Exa with `best {category} in {place}`.
- Reads editorial recommendation articles with Exa contents.
- Uses an OpenRouter LLM to extract restaurant mentions, ranks, snippets, and address hints.
- Deduplicates restaurants by normalized name and Google geocoding evidence.
- Scores results by consensus first, article position second.
- Displays a ranked list beside a Leaflet map.
- Exports Google My Maps-compatible CSV.

## Stack

- TypeScript
- pnpm
- TanStack Start
- React
- Tailwind CSS
- shadcn/ui
- React Leaflet
- Biome
- Vitest

## Setup

```sh
pnpm install
cp .env.example .env
```

Fill `.env`:

```sh
EXA_API_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
GOOGLE_MAPS_API_KEY=
```

## Development

```sh
pnpm dev
```

For UI iteration without spending API quota:

```sh
MAP_MY_MUNCH_USE_FIXTURE=1 pnpm dev
```

## Checks

```sh
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

## Scoring

```txt
score = mentionCount * 100 + averagePositionPoints
```

Ranked positions get `max(0, 20 - position)` points. Unranked mentions get `10` position points.

## CSV Export

Exports:

- `Name`
- `Address`
- `Latitude`
- `Longitude`
- `Category`
- `Score`
- `Mention Count`
- `Sources`
- `Reasoning`
- `Geocode Status`
