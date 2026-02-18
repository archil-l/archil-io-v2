"use client";

import { motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { cn } from "~/lib/utils";

export interface ThemeSwitcherProps {
  targetTheme: "light" | "dark";
  isAnimating?: boolean;
  className?: string;
}

export function ThemeSwitcher({
  targetTheme,
  isAnimating = true,
  className,
}: ThemeSwitcherProps) {
  const isLight = targetTheme === "light";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg bg-muted p-3 not-prose",
        className,
      )}
    >
      <motion.div
        animate={{ rotate: isLight ? 0 : 180 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="flex"
      >
        {isLight ? (
          <Sun className="size-5 text-yellow-500" />
        ) : (
          <Moon className="size-5 text-blue-400" />
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="text-sm font-medium"
      >
        Switched to{" "}
        <span className="font-semibold capitalize text-primary">
          {targetTheme}
        </span>{" "}
        mode
      </motion.div>

      {/* Animated background shimmer effect */}
      {isAnimating && (
        <motion.div
          className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white to-transparent opacity-20"
          animate={{ x: ["100%", "-100%"] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}
