import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  MapPinOff,
  Search
} from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { MapPanel } from "@/components/MapPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { restaurantsToCsv } from "@/lib/csv";
import type { RecommendationRunResult } from "@/lib/domain";
import { runRecommendation } from "@/lib/server-functions";

export const Route = createFileRoute("/")({
  component: Home
});

type RunState = "idle" | "running" | "complete" | "error";

function Home() {
  const [place, setPlace] = useState("Rome");
  const [category, setCategory] = useState("gelato");
  const [runState, setRunState] = useState<RunState>("idle");
  const [result, setResult] = useState<RecommendationRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runRecommendationFn = useServerFn(runRecommendation);

  const csv = useMemo(
    () => (result ? restaurantsToCsv(result.restaurants) : ""),
    [result]
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRunState("running");
    setError(null);
    setResult(null);

    try {
      const data = await runRecommendationFn({ data: { place, category } });
      setResult(data);
      setRunState("complete");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Recommendation run failed."
      );
      setRunState("error");
    }
  }

  function downloadCsv() {
    if (!csv) {
      return;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `map-my-munch-${place}-${category}.csv`
      .replaceAll(/\s+/g, "-")
      .toLowerCase();
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <section className="control-panel">
        <div className="title-row">
          <div>
            <h1>Map My Munch</h1>
            <p>
              Consensus restaurant shortlists from editorial food
              recommendations.
            </p>
          </div>
          {result ? (
            <Badge variant="outline">{result.restaurants.length} places</Badge>
          ) : null}
        </div>

        <form className="search-form" onSubmit={submit}>
          <label htmlFor="place">
            <span>Place</span>
            <Input
              id="place"
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              placeholder="Tokyo"
              required
            />
          </label>
          <label htmlFor="category">
            <span>Category</span>
            <Input
              id="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="ramen"
              required
            />
          </label>
          <Button type="submit" disabled={runState === "running"}>
            <Search />
            {runState === "running" ? "Running" : "Run"}
          </Button>
        </form>

        {runState === "running" ? (
          <div className="progress-box">
            <div className="progress-line" />
            <p>
              Searching Exa, reading sources, extracting mentions, geocoding
              restaurants.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="warning-box">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        {result ? (
          <div className="run-meta">
            <div>
              <span>Query</span>
              <strong>{result.query}</strong>
            </div>
            <Button type="button" variant="outline" onClick={downloadCsv}>
              <Download />
              CSV
            </Button>
          </div>
        ) : null}

        {result?.warnings.length ? (
          <div className="warnings-list">
            {result.warnings.slice(0, 5).map((warning) => (
              <div key={warning}>
                <AlertTriangle size={14} />
                <span>{compactWarning(warning)}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="results-list">
          {result?.restaurants.map((restaurant, index) => (
            <article className="restaurant-row" key={restaurant.id}>
              <div className="rank">{index + 1}</div>
              <div className="restaurant-body">
                <div className="restaurant-header">
                  <h2>{restaurant.displayName}</h2>
                  <div className="score">{restaurant.score.toFixed(1)}</div>
                </div>
                <p>{restaurant.reasoning}</p>
                <div className="restaurant-meta">
                  <Badge variant="secondary">
                    {restaurant.mentionCount} mentions
                  </Badge>
                  {restaurant.geocodeStatus !== "exact" ? (
                    <Badge variant="warning">
                      <MapPinOff size={12} />
                      Approximate
                    </Badge>
                  ) : null}
                  {restaurant.address ? (
                    <span>{restaurant.address}</span>
                  ) : null}
                </div>
                <div className="source-links">
                  {restaurant.sources.map((source) => (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      key={`${restaurant.id}-${source.url}`}
                    >
                      {source.isRanked && source.position
                        ? `#${source.position}`
                        : "unranked"}
                      <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="map-panel">
        {result?.restaurants.length ? (
          <MapPanel restaurants={result.restaurants} />
        ) : (
          <div className="empty-map">
            <Search size={22} />
            <span>Run a search to map consensus picks.</span>
          </div>
        )}
      </section>
    </main>
  );
}

function compactWarning(warning: string) {
  const cleaned = warning
    .replaceAll(/\s+/g, " ")
    .replace(/:\s*\[\s*\{.*$/u, ".")
    .trim();

  return cleaned.length > 140 ? `${cleaned.slice(0, 137)}...` : cleaned;
}
