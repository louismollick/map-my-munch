import { z } from "zod";
import { normalizeRestaurantName } from "../dedupe";
import type { ExtractedMention, SourceArticle } from "../domain";

const optionalStringSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) => value ?? undefined);
const optionalPositionSchema = z
  .number()
  .int()
  .positive()
  .nullable()
  .optional()
  .transform((value) => value ?? undefined);

const mentionSchema = z.object({
  name: z.string().min(1),
  addressOrNeighborhood: optionalStringSchema,
  position: optionalPositionSchema,
  isRanked: z.boolean(),
  snippet: optionalStringSchema
});

const extractionSchema = z.object({
  mentions: z.array(mentionSchema)
});

export type ExtractionClient = {
  extractMentions(
    article: SourceArticle,
    place: string,
    category: string
  ): Promise<ExtractedMention[]>;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function truncateArticle(text: string) {
  return text.length > 24_000 ? text.slice(0, 24_000) : text;
}

export function parseExtractionJson(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced?.[1] ?? trimmed;

  try {
    return extractionSchema.parse(JSON.parse(jsonText));
  } catch (error) {
    throw new Error(
      `Could not parse extraction JSON: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export function createOpenRouterExtractionClient(): ExtractionClient {
  const apiKey = requireEnv("OPENROUTER_API_KEY");
  const model = requireEnv("OPENROUTER_MODEL");

  return {
    async extractMentions(article, place, category) {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://map-my-munch.local",
            "X-Title": "Map My Munch"
          },
          body: JSON.stringify({
            model,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "Extract restaurant recommendations from editorial food/travel articles. Return only JSON with a mentions array. Preserve explicit ranks. If the article is unranked, set isRanked false and omit position."
              },
              {
                role: "user",
                content: JSON.stringify({
                  place,
                  category,
                  sourceTitle: article.title,
                  sourceUrl: article.url,
                  articleText: truncateArticle(article.text),
                  outputShape: {
                    mentions: [
                      {
                        name: "Restaurant name",
                        addressOrNeighborhood:
                          "Address or neighborhood if present",
                        position: 1,
                        isRanked: true,
                        snippet: "Short quote or nearby evidence"
                      }
                    ]
                  }
                })
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error(
          `OpenRouter extraction failed: ${response.status} ${await response.text()}`
        );
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        return [];
      }

      const parsed = parseExtractionJson(content);
      return parsed.mentions.map((mention) => ({
        ...mention,
        sourceId: article.id,
        sourceTitle: article.title,
        sourceUrl: article.url,
        normalizedName: normalizeRestaurantName(mention.name)
      }));
    }
  };
}
