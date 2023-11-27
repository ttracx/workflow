import { ModelVersion, Page } from "replicate";
import { z } from "zod";

import { createTRPCRouter, replicateProducer } from "../../trpc";

export const replicateRouter = createTRPCRouter({
  getModelVersion: replicateProducer
    .input(
      z.object({
        owner: z.string(),
        model_name: z.string(),
        version_id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.replicate.models.versions.get(
        input.owner,
        input.model_name,
        input.version_id,
      );
    }),
  versions: replicateProducer
    .input(
      z.object({
        owner: z.string(),
        model_name: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const res = (await ctx.replicate.models.versions.list(
        input.owner,
        input.model_name,
      )) as unknown as Page<ModelVersion>;
      return res;
    }),
  getCollections: replicateProducer
    .input(
      z.object({
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx }) => {
      const data = await ctx.replicate.collections.list();
      return data;
    }),
  getCollection: replicateProducer
    .input(
      z.object({
        collection_slug: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const data = await ctx.replicate.collections.get(input.collection_slug);
      return data;
    }),
});
