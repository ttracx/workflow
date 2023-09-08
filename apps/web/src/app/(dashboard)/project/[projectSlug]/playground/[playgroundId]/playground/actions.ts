"use server";

import { db } from "@seocraft/supabase/db";
import {
  OPENAI_CHAT_MODELS,
  OpenAIChatChatPromptFormat,
  OpenAIChatModel,
  OpenAIChatSettings,
  generateText,
} from "modelfusion";

export const generateTextFn = async ({
  projectId,
  user,
  settings,
}: {
  projectId: string;
  user: string;
  settings: OpenAIChatSettings;
}) => {
  const apiKey = await getApiKeyValue({
    projectId,
    apiKey: "OPENAI_API_KEY",
  });
  if (!apiKey) throw new Error("Missing API Key, `OPENAI_API_KEY`");
  const text = await generateText(
    new OpenAIChatModel({
      apiKey,
      ...settings,
    }).withPromptFormat(OpenAIChatChatPromptFormat()),
    [
      {
        user,
      },
    ]
  );
  return text;
};

export const getApiKeyValue = async (params: {
  projectId: string;
  apiKey: string;
}): Promise<string | null> => {
  const variable = await db.query.variable.findFirst({
    where: (variable, { eq, and }) =>
      and(
        eq(variable.key, params.apiKey),
        eq(variable.project_id, params.projectId)
      ),
  });
  return variable?.value!;
};
