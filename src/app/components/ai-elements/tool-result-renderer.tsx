"use client";

import { ThemeSwitcher } from "./theme-switcher";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "./tool";
import type { ToolUIPart } from "ai";
import type { ComponentProps } from "react";

export interface ToolResultRendererProps extends ComponentProps<typeof Tool> {
  toolCall: ToolUIPart;
  toolName: string;
}

export const ToolResultRenderer = ({
  toolCall,
  toolName,
  ...props
}: ToolResultRendererProps) => {
  // Special handling for setTheme - render animated switcher
  if (toolName === "setTheme" && toolCall.state === "output-available") {
    const output = toolCall.output as
      | { success: boolean; currentTheme: string }
      | undefined;
    const targetTheme = (output?.currentTheme || "dark") as "light" | "dark";

    return (
      <div className="mb-4 flex items-center justify-center">
        <ThemeSwitcher targetTheme={targetTheme} isAnimating={true} />
      </div>
    );
  }

  // Default tool rendering with collapsible UI
  const renderContent = () => {
    if (toolCall.type === "tool-call-input" && toolCall.input) {
      return (
        <ToolContent>
          <ToolInput input={toolCall.input} />
        </ToolContent>
      );
    }

    if (toolCall.type === "tool-call-output") {
      return (
        <ToolContent>
          <ToolOutput output={toolCall.output} errorText={toolCall.errorText} />
        </ToolContent>
      );
    }

    return null;
  };

  return (
    <Tool {...props}>
      <ToolHeader
        title={toolName}
        type={toolCall.type}
        state={toolCall.state}
      />
      {renderContent()}
    </Tool>
  );
};
