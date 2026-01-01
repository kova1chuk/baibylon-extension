import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RecoilRoot } from "recoil";
import "./index.css"; // Import CSS - Vite will bundle it
import App from "./App.tsx";
import { AuthProvider } from "./providers/AuthProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { supabase } from "./lib/supabase";

// Handle OAuth callback from Supabase
async function handleAuthCallback() {
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      console.error("Error getting session:", error);
    }
    // The session is automatically handled by Supabase
  } catch (err) {
    console.error("Error handling auth callback:", err);
  }
}

// Create shadow DOM and initialize React
function initApp() {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("Root element not found");
    return;
  }

  try {
    // Handle OAuth callback if present in URL
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    if (urlParams.get("access_token") || urlParams.get("error")) {
      handleAuthCallback();
    }

    // Create shadow root
    const shadowRoot = rootElement.attachShadow({ mode: "open" });

    // Get theme from localStorage
    const theme = localStorage.getItem("baibylon-theme") || "light";

    // Create container inside shadow DOM
    const shadowContainer = document.createElement("div");
    shadowContainer.id = "shadow-root-container";
    shadowContainer.setAttribute("data-theme", theme);
    shadowContainer.style.width = "100%";
    shadowContainer.style.height = "100%";
    shadowRoot.appendChild(shadowContainer);

    // Inject styles into shadow DOM
    // Get styles from the document (Vite injects them)
    const styleTags = Array.from(document.querySelectorAll("style"));
    const linkTags = Array.from(
      document.querySelectorAll('link[rel="stylesheet"]')
    );

    // Copy style tags to shadow DOM
    styleTags.forEach((styleTag) => {
      if (styleTag.textContent) {
        const shadowStyle = document.createElement("style");
        shadowStyle.textContent = styleTag.textContent;
        shadowRoot.insertBefore(shadowStyle, shadowContainer);
      }
    });

    // Copy link tags to shadow DOM
    linkTags.forEach((linkTag) => {
      if (linkTag instanceof HTMLLinkElement) {
        const shadowLink = document.createElement("link");
        shadowLink.rel = "stylesheet";
        shadowLink.href = linkTag.href;
        shadowRoot.insertBefore(shadowLink, shadowContainer);
      }
    });

    // Create React root inside shadow DOM
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

    // Listen for theme changes and update shadow root
    const updateTheme = () => {
      const newTheme = localStorage.getItem("baibylon-theme") || "light";
      shadowContainer.setAttribute("data-theme", newTheme);
    };

    window.addEventListener("storage", (e) => {
      if (e.key === "baibylon-theme") {
        updateTheme();
      }
    });

    // Also listen for custom theme change events
    window.addEventListener("baibylon-theme-change", updateTheme);
  } catch (error) {
    console.error("Error initializing React app:", error);
  }
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  // DOM is already ready
  initApp();
}
