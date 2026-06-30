import { describe, expect, it } from "vitest";
import {
  hasRunnableSearch,
  makeHomeSearchRunKey,
  stripRefreshFromSearch,
  validateHomeSearch
} from "./search-state";

describe("search-state", () => {
  it("validates and trims supported search params", () => {
    expect(
      validateHomeSearch({
        place: "  Rome  ",
        category: " gelato ",
        refresh: "1",
        ignored: "value"
      })
    ).toEqual({
      place: "Rome",
      category: "gelato",
      refresh: "1"
    });
  });

  it("does not autorun partial searches", () => {
    expect(hasRunnableSearch({ place: "Rome" })).toBe(false);
    expect(hasRunnableSearch({ category: "gelato" })).toBe(false);
    expect(hasRunnableSearch({ place: "Rome", category: "gelato" })).toBe(true);
  });

  it("builds distinct run keys for cached vs refresh loads", () => {
    expect(
      makeHomeSearchRunKey({ place: "Rome", category: "gelato" })
    ).not.toEqual(
      makeHomeSearchRunKey({
        place: "Rome",
        category: "gelato",
        refresh: "1"
      })
    );
  });

  it("strips refresh from the URL state", () => {
    expect(
      stripRefreshFromSearch({
        place: "Rome",
        category: "gelato",
        refresh: "1"
      })
    ).toEqual({
      place: "Rome",
      category: "gelato"
    });
  });
});
