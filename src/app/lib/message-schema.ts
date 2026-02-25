import { InferUITools, UIMessage, UIMessagePart } from "ai";
import z from "zod";
import { allTools } from "./agent/tools";

export const metadataSchema = z.object({
  timestamp: z.iso.datetime().optional(),
  captchaToken: z.string().optional(),
});

type AgentMetadata = z.infer<typeof metadataSchema>;

export const dataPartSchema = z.object({
  someDataPart: z.object({}),
  anotherDataPart: z.object({}),
});

type AgentDataPart = z.infer<typeof dataPartSchema>;

type AgentTools = InferUITools<typeof allTools>;

export type AgentUIMessage = UIMessage<
  AgentMetadata,
  AgentDataPart,
  AgentTools
>;

export type AgentUIMessagePart = UIMessagePart<AgentDataPart, AgentTools>;
