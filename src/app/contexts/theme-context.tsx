import { createContext, useContext, useEffect } from "react";
import { useTheme, type Theme } from "../hooks/use-theme";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    console.log(`[ThemeContext] Theme changed to: ${theme}`);
    const root = window.document.documentElement;

    // Remove both classes first
    root.classList.remove("light", "dark");
    console.log(`[ThemeContext] Removed both theme classes`);

    // Add the current theme class
    root.classList.add(theme);
    console.log(`[ThemeContext] Added theme class: ${theme}`);
    console.log(`[ThemeContext] Current HTML classes:`, root.className);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }

  return context;
}
