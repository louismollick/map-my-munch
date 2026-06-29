import { describe, expect, it } from "vitest";
import { parseExtractionJson } from "./openrouter";

describe("parseExtractionJson", () => {
  it("parses fenced JSON from free models", () => {
    const parsed = parseExtractionJson(`
\`\`\`json
{
  "mentions": [
    {
      "name": "Caffe Test",
      "addressOrNeighborhood": "Via Test 1",
      "position": 2,
      "isRanked": true,
      "snippet": "nearby text"
    }
  ]
}
\`\`\`
`);

    expect(parsed.mentions[0].name).toBe("Caffe Test");
    expect(parsed.mentions[0].position).toBe(2);
  });

  it("accepts null optional fields from extraction responses", () => {
    const parsed = parseExtractionJson(
      JSON.stringify({
        mentions: [
          {
            name: "Null Cafe",
            addressOrNeighborhood: null,
            position: null,
            isRanked: false,
            snippet: null
          }
        ]
      })
    );

    expect(parsed.mentions[0]).toMatchObject({
      name: "Null Cafe",
      isRanked: false
    });
    expect(parsed.mentions[0].addressOrNeighborhood).toBeUndefined();
    expect(parsed.mentions[0].position).toBeUndefined();
  });
});
