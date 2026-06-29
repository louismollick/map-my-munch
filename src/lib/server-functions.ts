import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { makeMockRecommendationRun } from "./server/mock-run";
import { runRecommendationWorkflow } from "./server/recommendations";

const requestSchema = z.object({
  place: z.string().trim().min(1),
  category: z.string().trim().min(1)
});

export const runRecommendation = createServerFn({ method: "POST" })
  .validator((data: unknown) => requestSchema.parse(data))
  .handler(async ({ data }) => {
    if (process.env.MAP_MY_MUNCH_USE_FIXTURE === "1") {
      return makeMockRecommendationRun(data);
    }

    return runRecommendationWorkflow(data);
  });
