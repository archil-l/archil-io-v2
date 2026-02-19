"use client";

import type {
  UIMessagePart,
  ReasoningUIPart,
  ToolUIPart,
  DynamicToolUIPart,
  TextUIPart,
  FileUIPart,
  SourceUrlUIPart,
  SourceDocumentUIPart,
  StepStartUIPart,
  DataUIPart,
  UIDataTypes,
  UITools,
} from "ai";
import {
  isReasoningUIPart,
  isToolUIPart,
  isTextUIPart,
  isFileUIPart,
} from "ai";
import { MessageResponse } from "~/components/ai-elements/message";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "~/components/ai-elements/reasoning";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "~/components/ai-elements/tool";

interface UIMessagePartRendererProps {
  part: UIMessagePart<UIDataTypes, UITools>;
  index: number;
  messageId: string;
  isStreaming: boolean;
}

export function UIMessagePartRenderer({
  part,
  index,
  messageId,
}: UIMessagePartRendererProps) {
  // Handle text parts
  if (isTextUIPart(part)) {
    const textPart = part as TextUIPart;
    return (
      <MessageResponse key={`${messageId}-text-${index}`}>
        {textPart.text}
      </MessageResponse>
    );
  }

  // Handle reasoning parts
  if (isReasoningUIPart(part)) {
    const reasoningPart = part as ReasoningUIPart;
    const isReasoningStreaming = reasoningPart.state === "streaming";
    return (
      <Reasoning
        key={`${messageId}-reasoning-${index}`}
        isStreaming={isReasoningStreaming}
        defaultOpen={true}
      >
        <ReasoningTrigger />
        <ReasoningContent>{reasoningPart.text}</ReasoningContent>
      </Reasoning>
    );
  }

  // Handle tool parts (both static and dynamic)
  if (isToolUIPart(part)) {
    const toolPart = part as ToolUIPart | DynamicToolUIPart;
    const state = toolPart.state || "input-available";
    const toolIsStreaming = state === "input-streaming";
    const hasOutput = state === "output-available" || state === "output-error";

    const toolHeaderProps =
      toolPart.type === "dynamic-tool"
        ? {
            title:
              (toolPart as DynamicToolUIPart).title ||
              (toolPart as DynamicToolUIPart).toolName,
            type: toolPart.type,
            state,
            toolName: (toolPart as DynamicToolUIPart).toolName,
          }
        : {
            title: (toolPart as ToolUIPart).title || toolPart.type.slice(5),
            type: toolPart.type,
            state,
          };

    return (
      <Tool key={`${messageId}-tool-${index}`}>
        <ToolHeader {...(toolHeaderProps as any)} />
        <ToolContent>
          {(toolPart.input !== undefined || toolIsStreaming) && (
            <ToolInput input={toolPart.input} />
          )}
          {hasOutput && (
            <ToolOutput
              output={toolPart.output}
              errorText={toolPart.errorText || ""}
            />
          )}
        </ToolContent>
      </Tool>
    );
  }

  // Handle file parts
  if (isFileUIPart(part)) {
    const filePart = part as FileUIPart;
    const mediaType = filePart.mediaType || "";
    const isImage = mediaType.startsWith("image/");

    if (isImage && filePart.url) {
      return (
        <img
          key={`${messageId}-file-${index}`}
          alt={filePart.filename || "attachment"}
          src={filePart.url}
          className="max-w-full rounded-lg"
        />
      );
    }

    return (
      <div
        key={`${messageId}-file-${index}`}
        className="rounded-lg border border-muted bg-muted/50 p-4"
      >
        <div className="text-sm">
          <div className="font-medium">{filePart.filename || "File"}</div>
          <div className="text-xs text-muted-foreground">{mediaType}</div>
        </div>
      </div>
    );
  }

  // Handle source-url parts
  if ("type" in part && part.type === "source-url") {
    const sourcePart = part as SourceUrlUIPart;
    return (
      <div
        key={`${messageId}-source-url-${index}`}
        className="rounded-lg border border-muted bg-muted/50 p-3"
      >
        <a
          href={sourcePart.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          {sourcePart.title || sourcePart.url}
        </a>
      </div>
    );
  }

  // Handle source-document parts
  if ("type" in part && part.type === "source-document") {
    const sourcePart = part as SourceDocumentUIPart;
    return (
      <div
        key={`${messageId}-source-doc-${index}`}
        className="rounded-lg border border-muted bg-muted/50 p-3"
      >
        <div className="text-sm">
          <div className="font-medium">{sourcePart.title}</div>
          {sourcePart.filename && (
            <div className="text-xs text-muted-foreground">
              {sourcePart.filename}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Handle step-start parts
  if ("type" in part && part.type === "step-start") {
    const stepPart = part as StepStartUIPart;
    return (
      <div
        key={`${messageId}-step-${index}`}
        className="my-4 border-t border-muted"
      />
    );
  }

  // Handle data parts
  if ("type" in part && part.type.startsWith("data-")) {
    const dataPart = part as DataUIPart<UIDataTypes>;
    return (
      <div
        key={`${messageId}-data-${index}`}
        className="rounded-lg border border-muted bg-muted/50 p-4"
      >
        <pre className="overflow-x-auto text-xs">
          {JSON.stringify(dataPart.data, null, 2)}
        </pre>
      </div>
    );
  }

  // Fallback for unknown part types
  return null;
}
