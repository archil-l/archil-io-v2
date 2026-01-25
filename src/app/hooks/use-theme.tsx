import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      setTheme(mediaQueryList.matches ? "dark" : "light");
    };

    mediaQueryList.addEventListener("change", handleChange);

    // Set the initial color scheme based on the current preference
    handleChange();

    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return { theme, toggleTheme };
}
