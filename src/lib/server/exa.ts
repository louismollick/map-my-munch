import type { SourceArticle } from "../domain";

type ExaSearchResult = {
  id?: string;
  title?: string;
  url: string;
  author?: string;
  publishedDate?: string;
};

type ExaContentsResult = ExaSearchResult & {
  text?: string;
};

const EXCLUDED_SOURCE_HOSTS = [
  "google.",
  "maps.google.",
  "yelp.",
  "tripadvisor.",
  "opentable.",
  "resy.",
  "thefork.",
  "foursquare.",
  "instagram.",
  "tiktok.",
  "facebook.",
  "reddit.",
  "youtube."
];

export type ExaClient = {
  searchArticles(query: string): Promise<Array<Omit<SourceArticle, "text">>>;
  getArticleContents(urls: string[]): Promise<SourceArticle[]>;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function isEditorialResult(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return !EXCLUDED_SOURCE_HOSTS.some((excluded) =>
      hostname.includes(excluded)
    );
  } catch {
    return false;
  }
}

export function createExaClient(): ExaClient {
  const apiKey = requireEnv("EXA_API_KEY");

  async function exaFetch<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`https://api.exa.ai/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(
        `Exa ${path} failed: ${response.status} ${await response.text()}`
      );
    }

    return response.json() as Promise<T>;
  }

  return {
    async searchArticles(query) {
      const data = await exaFetch<{ results: ExaSearchResult[] }>("search", {
        query,
        numResults: 10,
        type: "auto"
      });

      return data.results
        .filter((result) => isEditorialResult(result.url))
        .map((result, index) => ({
          id: result.id || String(index),
          title: result.title || result.url,
          url: result.url,
          author: result.author,
          publishedDate: result.publishedDate
        }));
    },
    async getArticleContents(urls) {
      if (urls.length === 0) {
        return [];
      }

      const data = await exaFetch<{ results: ExaContentsResult[] }>(
        "contents",
        {
          urls,
          text: true
        }
      );

      return data.results
        .filter((result) => result.text?.trim())
        .map((result, index) => ({
          id: result.id || String(index),
          title: result.title || result.url,
          url: result.url,
          author: result.author,
          publishedDate: result.publishedDate,
          text: result.text || ""
        }));
    }
  };
}
