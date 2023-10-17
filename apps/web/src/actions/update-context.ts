"use server";

import { action } from "@/lib/safe-action";
import { db, context, eq } from "@seocraft/supabase/db";
import { z } from "zod";

export const setContext = action(
  z.object({
    contextId: z.string(),
    context: z.string().transform((val) => JSON.parse(val)),
  }),
  async (params) => {
    return await db
      .update(context)
      .set({ state: params.context as any })
      .where(eq(context.id, params.contextId))
      .returning();
  }
);