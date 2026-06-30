import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Download,
  LoaderCircle,
  MapPin,
  Search,
  Star,
  UtensilsCrossed,
  X
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPanel } from "@/components/MapPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { restaurantsToCsv } from "@/lib/csv";
import type { RecommendationRunResult } from "@/lib/domain";
import {
  buildResultsTitle,
  getMarkerLetter,
  getMarkerTone,
  getPlaceholderDescription
} from "@/lib/presentation";
import type { HomeSearch } from "@/lib/search-state";
import {
  hasRunnableSearch,
  makeHomeSearchRunKey,
  stripRefreshFromSearch,
  validateHomeSearch
} from "@/lib/search-state";
import { runRecommendation } from "@/lib/server-functions";

export const Route = createFileRoute("/")({
  validateSearch: validateHomeSearch,
  component: Home
});

type RunState = "idle" | "running" | "complete" | "error";

function Home() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [place, setPlace] = useState(() => search.place ?? "");
  const [category, setCategory] = useState(() => search.category ?? "");
  const [runState, setRunState] = useState<RunState>("idle");
  const [result, setResult] = useState<RecommendationRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runRecommendationFn = useServerFn(runRecommendation);
  const lastExecutedSearchKeyRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const csv = useMemo(
    () => (result ? restaurantsToCsv(result.restaurants) : ""),
    [result]
  );

  async function executeSearch(
    nextSearch: Required<Pick<HomeSearch, "place" | "category">> & HomeSearch
  ) {
    const requestId = ++requestIdRef.current;
    setRunState("running");
    setError(null);
    setResult(null);

    try {
      const data = await runRecommendationFn({
        data: {
          place: nextSearch.place,
          category: nextSearch.category,
          refresh: nextSearch.refresh === "1"
        }
      });
      if (requestId !== requestIdRef.current) {
        return;
      }

      setResult(data);
      setRunState("complete");

      if (nextSearch.refresh === "1") {
        lastExecutedSearchKeyRef.current = makeHomeSearchRunKey(
          stripRefreshFromSearch(nextSearch)
        );
        void navigate({
          to: "/",
          replace: true,
          search: stripRefreshFromSearch(nextSearch)
        });
      }
    } catch (caught) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError(
        caught instanceof Error ? caught.message : "Recommendation run failed."
      );
      setRunState("error");
    }
  }

  useEffect(() => {
    setPlace(search.place ?? "");
    setCategory(search.category ?? "");

    if (!hasRunnableSearch(search)) {
      return;
    }

    const runKey = makeHomeSearchRunKey(search);
    if (!runKey || lastExecutedSearchKeyRef.current === runKey) {
      return;
    }

    lastExecutedSearchKeyRef.current = runKey;
    void executeSearch(search);
  }, [search.category, search.place, search.refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSearch = {
      place: place.trim().replaceAll(/\s+/g, " "),
      category: category.trim().replaceAll(/\s+/g, " ")
    } satisfies HomeSearch;

    if (!hasRunnableSearch(nextSearch)) {
      setError("Place and category are required.");
      setRunState("error");
      return;
    }

    const runKey = makeHomeSearchRunKey(nextSearch);

    setPlace(nextSearch.place);
    setCategory(nextSearch.category);

    if (runKey && lastExecutedSearchKeyRef.current === runKey) {
      void executeSearch(nextSearch);
      return;
    }

    await navigate({
      to: "/",
      search: nextSearch
    });
  }

  function downloadCsv() {
    if (!csv || !result) {
      return;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      `map-my-munch-${result.input.place}-${result.input.category}.csv`
        .replaceAll(/\s+/g, "-")
        .toLowerCase();
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const resultWarnings = result?.warnings.slice(0, 4) ?? [];

  return (
    <main className="editorial-shell">
      <section className="editorial-sidebar">
        <header className="editorial-hero">
          <div className="brand-lockup">
            <img
              className="brand-logo"
              src="/logo.png"
              alt="Map My Munch logo"
              width={72}
              height={72}
            />
            <div className="brand-copy">
              <h1>Map My Munch</h1>
              <div className="brand-subtitle">
                <p>Curated picks from editorial food recommendations.</p>
                <p>Plan delicious days, one bite at a time.</p>
              </div>
            </div>
          </div>
          <div className="hero-art-frame" aria-hidden="true">
            <img
              className="hero-art"
              src="/hero.png"
              alt=""
              width={520}
              height={174}
            />
          </div>
        </header>

        <form className="search-card" onSubmit={submit}>
          <div className="search-grid">
            <label className="search-field" htmlFor="place">
              <span>Where?</span>
              <div className="search-input-shell">
                <MapPin className="search-input-icon" size={17} />
                <Input
                  id="place"
                  value={place}
                  onChange={(event) => setPlace(event.target.value)}
                  placeholder="Rome, Italy"
                  className="search-input"
                  autoComplete="off"
                  required
                />
                {place ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => setPlace("")}
                    aria-label="Clear place"
                  >
                    <X size={15} />
                  </button>
                ) : null}
              </div>
            </label>

            <label className="search-field" htmlFor="category">
              <span>What are you craving?</span>
              <div className="search-input-shell">
                <UtensilsCrossed className="search-input-icon" size={17} />
                <Input
                  id="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="gelato"
                  className="search-input"
                  autoComplete="off"
                  required
                />
              </div>
            </label>

            <Button
              type="submit"
              disabled={runState === "running"}
              className="search-submit"
            >
              {runState === "running" ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Search size={18} />
              )}
              {runState === "running" ? "Searching" : "Search"}
            </Button>
          </div>
        </form>

        <section
          className={`results-section${result || runState !== "idle" ? "" : " results-section-empty"}`}
        >
          {result || runState !== "idle" ? (
            <div className="results-header">
              <div className="results-heading">
                <img
                  className="results-heading-art"
                  src="/sun.png"
                  alt=""
                  aria-hidden="true"
                  width={30}
                  height={30}
                />
                <div>
                  <h2>
                    {result
                      ? buildResultsTitle(
                          result.input.place,
                          result.input.category
                        )
                      : "Best spots near you"}
                  </h2>
                </div>
              </div>

              <div className="results-actions">
                {result ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadCsv}
                    className="export-button"
                  >
                    <Download size={16} />
                    Export
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {runState === "running" ? (
            <div className="editorial-note editorial-note-loading">
              <LoaderCircle size={16} className="animate-spin" />
              <span>
                Searching editorial sources, extracting mentions, and mapping
                the shortlist.
              </span>
            </div>
          ) : null}

          {error ? (
            <div className="editorial-note editorial-note-error" role="alert">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          ) : null}

          {result ? (
            <div className="results-list">
              {result.restaurants.map((restaurant, index) => {
                const tone = getMarkerTone(index);
                const letter = getMarkerLetter(index);

                return (
                  <article
                    className="editorial-card"
                    key={restaurant.id}
                    data-tone={tone}
                  >
                    <div className="editorial-marker">{letter}</div>
                    <div className="editorial-thumb" aria-hidden="true" />
                    <div className="editorial-card-body">
                      <div className="editorial-card-header">
                        <h3>{restaurant.displayName}</h3>
                      </div>
                      <div className="editorial-mentions">
                        <Star
                          size={14}
                          fill="currentColor"
                          className="editorial-mentions-star"
                        />
                        <span>
                          {restaurant.mentionCount} editorial{" "}
                          {restaurant.mentionCount === 1
                            ? "mention"
                            : "mentions"}
                        </span>
                      </div>
                      <p>
                        {getPlaceholderDescription(
                          index,
                          result.input.category
                        )}
                      </p>
                      {restaurant.address ? (
                        <div className="editorial-address">
                          <MapPin size={14} />
                          <span>{restaurant.address}</span>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
              {resultWarnings.length ? (
                <div className="warnings-stack warnings-stack-after">
                  {resultWarnings.map((warning) => (
                    <div
                      className="editorial-note editorial-note-warning"
                      key={warning}
                    >
                      <AlertTriangle size={16} />
                      <span>{compactWarning(warning)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-results" aria-hidden="true" />
          )}
        </section>
      </section>

      <section className="editorial-map-pane">
        <MapPanel restaurants={result?.restaurants ?? []} />
      </section>
    </main>
  );
}

function compactWarning(warning: string) {
  const cleaned = warning
    .replaceAll(/\s+/g, " ")
    .replace(/:\s*\[\s*\{.*$/u, ".")
    .trim();

  return cleaned.length > 160 ? `${cleaned.slice(0, 157)}...` : cleaned;
}
