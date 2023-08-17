"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import {
  db,
  eq,
  inArray,
  nodeData,
  nodeToPlayground,
  playground,
  and,
  dataRow,
  gt,
} from "@seocraft/supabase/db";
import { cookies } from "next/headers";
import { NodeTypes } from "./playground/types";
import ReactGridLayout from "react-grid-layout";

export const getPlayground = async (params: { playgroundId: string }) => {
  const supabase = createServerActionClient({ cookies });
  const session = await supabase.auth.getSession();
  console.log({ params });
  return await db.query.playground.findFirst({
    where: (playground, { eq }) => eq(playground.id, params.playgroundId),
    with: {
      project: true,
    },
  });
};

export const savePlaygroundLayout = async (params: {
  playgroundId: string;
  layout: ReactGridLayout.Layout[];
}) => {
  return await db
    .update(playground)
    .set({ layout: params.layout })
    .where(eq(playground.id, params.playgroundId))
    .returning();
};

export const savePlayground = async (params: {
  projectSlug: string;
  playgroundId: string;
  nodes: any[];
  edges: any[];
}): Promise<void> => {
  try {
    console.log({ nodes: params.nodes, edges: params.edges });
    const supabase = createServerActionClient({ cookies });
    const session = await supabase.auth.getSession();
    await db.transaction(async (tx) => {
      const project = await tx.query.project.findFirst({
        where: (project, { eq }) => eq(project.slug, params.projectSlug),
      });
      if (!project) {
        throw new Error("Project not found");
      }
      await tx
        .update(playground)
        .set({
          edges: params.edges,
          nodes: params.nodes,
          updatedAt: new Date(),
        })
        .where(eq(playground.id, params.playgroundId));

      const playgroundNodes = await tx.query.nodeToPlayground.findMany({
        where: (nodeToPlayground, { eq }) =>
          eq(nodeToPlayground.playground_id, params.playgroundId),
      });

      const nodeToPlaygroundsDelete = playgroundNodes.filter((node) => {
        return !params.nodes.find((n) => n.id === node.node_id);
      });

      if (nodeToPlaygroundsDelete.length > 0) {
        await tx.delete(nodeToPlayground).where(
          inArray(
            nodeToPlayground.id,
            nodeToPlaygroundsDelete.map((node) => node.id)
          )
        );
        // Delete orphaned nodes
        const orphanNodes = nodeToPlaygroundsDelete.filter(async (node) => {
          const relation = await tx.query.nodeToPlayground.findMany({
            where: (nodeToPlayground, { eq }) =>
              eq(nodeToPlayground.node_id, node.id),
          });
          return relation.length === 0;
        });
        console.log({ orphanNodes });
        if (orphanNodes.length > 0) {
          await tx.delete(nodeData).where(
            inArray(
              nodeData.id,
              orphanNodes.map((node) => node.node_id)
            )
          );
        }
      }
    });
  } catch (err) {
    console.log(err);
  }
};

export const createNodeInDB = async (params: {
  playgroundId: string;
  projectSlug: string;
  type: NodeTypes;
}) => {
  const supabase = createServerActionClient({ cookies });

  const project = await db.query.project.findFirst({
    where: (project, { eq }) => eq(project.slug, params.projectSlug),
  });
  if (!project) {
    throw new Error("Project not found");
  }
  return await db.transaction(async (tx) => {
    const nodes = await tx
      .insert(nodeData)
      .values({
        project_id: project?.id,
        type: params.type,
      })
      .returning();

    await tx.insert(nodeToPlayground).values({
      node_id: nodes[0].id,
      playground_id: params.playgroundId,
    });
    return nodes[0];
  });
};

export const getDataSets = async (projectId: string) => {
  console.log({ projectId });
  return await db.query.dataSet.findMany({
    where: (dataSet, { eq }) => eq(dataSet.project_id, projectId),
  });
};

export const getDataSet = async (dataSetId: string) => {
  try {
    return await db.query.dataSet.findFirst({
      where: (dataSet, { eq }) => eq(dataSet.id, dataSetId),
      with: {
        rows: true,
      },
    });
  } catch (err) {
    console.log("err", err);
  }
};

export const insertDataSet = async (params: { id: string; data: any }) => {
  return await db.transaction(async (tx) => {
    const row = tx
      .insert(dataRow)
      .values({
        data_set_id: params.id,
        data: params.data,
      })
      .returning();

    return row;
  });
};

export const deleteDataRow = async (params: { id: string }) => {
  return await db.delete(dataRow).where(eq(dataRow.id, params.id));
};

export const getDatasetPaginated = async (params: {
  datasetId: string;
  cursor?: string;
  limit?: number;
}) => {
  const cursorCondition = params.cursor
    ? gt(dataRow.id, params.cursor)
    : undefined;
  console.log("cursorCondition", cursorCondition);
  const data = await db
    .select()
    .from(dataRow)
    .where(and(eq(dataRow.data_set_id, params.datasetId), cursorCondition))
    .orderBy(dataRow.id)
    .limit(params?.limit || 10);

  return {
    data,
    nextCursor: data[data.length - 1]?.id,
  };
};

export const getNodeData = async (nodeId: string) => {
  console.log("getNodeData", { nodeId });

  return await db.query.nodeData.findFirst({
    where: (nodeData, { eq }) => eq(nodeData.id, nodeId),
  });
};

export const setNodeData = async ({
  nodeId,
  state,
}: {
  nodeId: string;
  state: any;
}) => {
  return await db
    .update(nodeData)
    .set({ state: JSON.parse(state) })
    .where(eq(nodeData.id, nodeId))
    .returning();
};
