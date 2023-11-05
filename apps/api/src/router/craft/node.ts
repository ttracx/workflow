import { z } from "zod";

import { and, eq, schema } from "@seocraft/supabase/db";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const craftNodeRouter = createTRPCRouter({
  upsert: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        workflowVersionId: z.string(),
        projectId: z.string(),
        data: z.object({
          id: z.string(),
          contextId: z.string(),
          context: z.string().transform((val) => JSON.parse(val)),
          type: z.string(),
          width: z.number(),
          height: z.number(),
          color: z.string(),
          label: z.string(),
          position: z.object({
            x: z.number(),
            y: z.number(),
          }),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log("saveNode", input);
      await ctx.db.transaction(async (tx) => {
        const [contextOfTheNode] = await tx
          .select()
          .from(schema.context)
          .where(eq(schema.context.id, input.data.contextId))
          .limit(1);
        /// This is happens when user deletes the node and then tries to undo it.
        if (!contextOfTheNode) {
          // reincarnate the context
          const [contextUnit] = await tx
            .insert(schema.context)
            .values({
              id: input.data.contextId,
              project_id: input.projectId,
              type: input.data.type,
              state: {},
            })
            .returning();
        }
        await tx
          .insert(schema.workflowNode)
          .values({
            id: input.data.id,
            workflowId: input.workflowId,
            workflowVersionId: input.workflowVersionId,
            projectId: input.projectId,
            contextId: input.data.contextId,
            type: input.data.type,
            width: input.data.width,
            height: input.data.height,
            color: input.data.color,
            label: input.data.label,
            position: input.data.position,
          })
          .onConflictDoUpdate({
            target: schema.workflowNode.id,
            set: {
              contextId: input.data.contextId,
              type: input.data.type,
              width: input.data.width,
              height: input.data.height,
              color: input.data.color,
              label: input.data.label,
              position: input.data.position,
            },
          });
      });
    }),
  delete: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        workflowVersionId: z.string(),
        data: z.object({
          id: z.string(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log("deleteNode", input);
      await ctx.db.transaction(async (tx) => {
        // TODO check this. Delete context if it's not attached to any published version.
        const [version] = await tx
          .select({
            publishedAt: schema.workflowVersion.publishedAt,
          })
          .from(schema.workflowVersion)
          .where(eq(schema.workflowVersion.id, input.workflowVersionId))
          .limit(1);
        if (!version) {
          throw new Error("Workflow version not found");
        }
        if (!version.publishedAt) {
          // delete all the execution data as well.
          await tx
            .delete(schema.nodeExecutionData)
            .where(
              and(
                eq(schema.nodeExecutionData.workflowId, input.workflowId),
                eq(
                  schema.nodeExecutionData.workflowVersionId,
                  input.workflowVersionId,
                ),
                eq(schema.nodeExecutionData.workflowNodeId, input.data.id),
              ),
            );
        }
        const [node] = await tx
          .delete(schema.workflowNode)
          .where(
            and(
              eq(schema.workflowNode.workflowId, input.workflowId),
              eq(
                schema.workflowNode.workflowVersionId,
                input.workflowVersionId,
              ),
              eq(schema.workflowNode.id, input.data.id),
            ),
          )
          .returning();
        if (!node) {
          throw new Error("Node not found");
        }
        await tx
          .delete(schema.context)
          .where(eq(schema.context.id, node.contextId)); // TODO: soft delete
      });
    }),
  setContext: protectedProcedure
    .input(
      z.object({
        contextId: z.string(),
        context: z.string().transform((val) => JSON.parse(val)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.context)
        .set({ state: input.context as any })
        .where(eq(schema.context.id, input.contextId));
    }),
  updateMetadata: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        position: z
          .object({
            x: z.number(),
            y: z.number(),
          })
          .optional(),
        size: z.object({ width: z.number(), height: z.number() }).optional(),
        label: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.workflowNode)
        .set({
          ...(input.size && input.size),
          ...(input.position && { position: input.position }),
          ...(input.label && { label: input.label }),
        })
        .where(eq(schema.workflowNode.id, input.id));
    }),
});