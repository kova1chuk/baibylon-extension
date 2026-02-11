import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RecoilRoot } from "recoil";
import "./global.css";
import App from "./App.tsx";
import { AuthProvider } from "./providers/AuthProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { supabase } from "./lib/supabase";

async function handleAuthCallback() {
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      console.error("Error getting session:", error);
    }

  } catch (err) {
    console.error("Error handling auth callback:", err);
  }
}

function initApp() {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("Root element not found");
    return;
  }

  try {

    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    if (urlParams.get("access_token") || urlParams.get("error")) {
      handleAuthCallback();
    }

    const shadowRoot = rootElement.attachShadow({ mode: "open" });

    const theme = localStorage.getItem("vocairo-theme") || "light";

    const shadowContainer = document.createElement("div");
    shadowContainer.id = "shadow-root-container";
    shadowContainer.setAttribute("data-theme", theme);

    if (theme === "dark") {
      shadowContainer.classList.add("dark");
    }
    shadowContainer.style.width = "100%";
    shadowContainer.style.height = "100%";
    shadowRoot.appendChild(shadowContainer);

    const styleTags = Array.from(document.querySelectorAll("style"));
    const linkTags = Array.from(
      document.querySelectorAll('link[rel="stylesheet"]')
    );

    styleTags.forEach((styleTag) => {
      if (styleTag.textContent) {
        const shadowStyle = document.createElement("style");
        shadowStyle.textContent = styleTag.textContent;
        shadowRoot.insertBefore(shadowStyle, shadowContainer);
      }
    });

    linkTags.forEach((linkTag) => {
      if (linkTag instanceof HTMLLinkElement) {
        const shadowLink = document.createElement("link");
        shadowLink.rel = "stylesheet";
        shadowLink.href = linkTag.href;
        shadowRoot.insertBefore(shadowLink, shadowContainer);
      }
    });

    const root = createRoot(shadowContainer);
    root.render(
      <StrictMode>
        <RecoilRoot>
          <ThemeProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ThemeProvider>
        </RecoilRoot>
      </StrictMode>
    );

    const updateTheme = () => {
      const newTheme = localStorage.getItem("vocairo-theme") || "light";
      shadowContainer.setAttribute("data-theme", newTheme);

      if (newTheme === "dark") {
        shadowContainer.classList.add("dark");
      } else {
        shadowContainer.classList.remove("dark");
      }
    };

    window.addEventListener("storage", (e) => {
      if (e.key === "vocairo-theme") {
        updateTheme();
      }
    });

    window.addEventListener("vocairo-theme-change", updateTheme);
  } catch (error) {
    console.error("Error initializing React app:", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {

  initApp();
}
