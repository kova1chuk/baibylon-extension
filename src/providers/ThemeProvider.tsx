import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem("baibylon-theme") as Theme;
    if (stored === "light" || stored === "dark") {
      return stored;
    }
    // Default to light mode
    return "light";
  });

  useEffect(() => {
    // Apply theme to shadow root if available
    const root = document.getElementById("root");
    if (root?.shadowRoot) {
      const container = root.shadowRoot.getElementById("shadow-root-container");
      if (container) {
        container.setAttribute("data-theme", theme);
      }
    }
    // Also apply to document for any non-shadow elements
    document.documentElement.setAttribute("data-theme", theme);
    // Store in localStorage
    localStorage.setItem("baibylon-theme", theme);
    // Dispatch custom event for theme change
    window.dispatchEvent(new CustomEvent("baibylon-theme-change"));
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
