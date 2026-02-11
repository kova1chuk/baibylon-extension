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

    const stored = localStorage.getItem("vocairo-theme") as Theme;
    if (stored === "light" || stored === "dark") {
      return stored;
    }

    return "light";
  });

  useEffect(() => {

    const root = document.getElementById("root");
    if (root?.shadowRoot) {
      const container = root.shadowRoot.getElementById("shadow-root-container");
      if (container) {
        container.setAttribute("data-theme", theme);

        if (theme === "dark") {
          container.classList.add("dark");
        } else {
          container.classList.remove("dark");
        }
      }
    }

    document.documentElement.setAttribute("data-theme", theme);

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    localStorage.setItem("vocairo-theme", theme);

    window.dispatchEvent(new CustomEvent("vocairo-theme-change"));
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
