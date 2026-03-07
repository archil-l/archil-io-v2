"use client";

import type { DynamicToolUIPart } from "ai";
import { motion } from "motion/react";
import { cn } from "~/lib/utils";
import { Globe, ExternalLink, Loader2 } from "lucide-react";

export interface WebPreviewToolUIProps {
  tool: DynamicToolUIPart;
  url: string;
  className?: string;
}

/**
 * WebPreviewToolUI - Dynamic UI component for the webpreview tool
 *
 * Renders a web preview interface when the tool is called.
 * The actual web preview functionality is handled by the existing WebPreview component.
 * This component provides the animated feedback and interface.
 */
export function WebPreviewToolUI({
  tool,
  url,
  className,
}: WebPreviewToolUIProps) {
  const state = tool.state || "input-available";
  const isRunning = state === "input-available" || state === "input-streaming";

  return (
    <div className="py-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className={cn("rounded-lg border bg-card p-4 not-prose", className)}
      >
        {/* Header with loading state */}
        <div className="flex items-center justify-between gap-4 border-b pb-3">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: isRunning ? 360 : 0 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="flex"
            >
              {isRunning ? (
                <Loader2 className="size-5 text-primary animate-spin" />
              ) : (
                <Globe className="size-5 text-primary" />
              )}
            </motion.div>
            <div>
              <h3 className="font-medium">Opening Web Preview</h3>
              <p className="text-sm text-muted-foreground">
                {isRunning ? "Loading..." : "Preview ready"}
              </p>
            </div>
          </div>

          {/* URL display */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">URL:</span>
            <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {url}
            </span>
          </div>
        </div>

        {/* Web preview content */}
        <div className="mt-3">
          {isRunning ? (
            <div className="flex items-center justify-center py-8">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-muted-foreground"
              >
                Preparing web preview...
              </motion.div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Web preview opened successfully
                </span>
                <ExternalLink className="size-4 text-muted-foreground" />
              </div>

              {/* Preview frame placeholder - this would be replaced by actual WebPreview component */}
              <div className="relative rounded border bg-muted/50">
                <div className="flex items-center gap-2 border-b bg-muted/30 p-2">
                  <div className="flex gap-1">
                    <div className="size-3 rounded-full bg-red-500/20 border border-red-500" />
                    <div className="size-3 rounded-full bg-yellow-500/20 border border-yellow-500" />
                    <div className="size-3 rounded-full bg-green-500/20 border border-green-500" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    {url}
                  </span>
                </div>
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Web content would be displayed here
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
