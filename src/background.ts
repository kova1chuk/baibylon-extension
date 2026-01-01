// Background service worker for the Chrome extension
// Note: We'll use dynamic import for Supabase to avoid issues with service workers

// Get Supabase credentials from environment (passed via message or stored)
let supabaseUrl: string | null = null;
let supabaseAnonKey: string | null = null;

// Initialize Supabase client dynamically
async function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase credentials not initialized");
  }
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Service workers don't have window, so we need to configure storage manually
      storage: {
        getItem: (key: string) => {
          return new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
              resolve(result[key] || null);
            });
          });
        },
        setItem: (key: string, value: string) => {
          chrome.storage.local.set({ [key]: value });
        },
        removeItem: (key: string) => {
          chrome.storage.local.remove([key]);
        },
      },
      // Use PKCE flow
      flowType: "pkce",
      // Don't auto refresh in service worker
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      // Service workers don't have window/fetch, use global fetch
      fetch: fetch,
    },
  });
}

// Helper to parse URL hash parameters
function parseUrlHash(url: string): Map<string, string> {
  const hashParts = new URL(url).hash.slice(1).split("&");
  const hashMap = new Map(
    hashParts
      .filter((part) => part.includes("="))
      .map((part) => {
        const [name, value] = part.split("=");
        return [name, decodeURIComponent(value)];
      })
  );
  return hashMap;
}

// Handle OAuth callback from Supabase
async function finishUserOAuth(url: string) {
  try {
    console.log("WordFlow: Handling OAuth callback...");
    console.log("WordFlow: Callback URL:", url);

    if (!supabaseUrl || !supabaseAnonKey) {
      // Try to get from storage
      const stored = await chrome.storage.local.get([
        "supabaseUrl",
        "supabaseAnonKey",
      ]);
      if (stored.supabaseUrl && stored.supabaseAnonKey) {
        supabaseUrl = stored.supabaseUrl;
        supabaseAnonKey = stored.supabaseAnonKey;
        console.log("WordFlow: Loaded Supabase credentials from storage");
      } else {
        console.error("WordFlow: Supabase credentials not found in storage");
        throw new Error("Supabase credentials not found");
      }
    }

    // Parse URL to get code or tokens
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get("code");
    const errorParam = urlObj.searchParams.get("error");

    // Check for error first
    if (errorParam) {
      console.error("WordFlow: OAuth error:", errorParam);
      throw new Error(`OAuth error: ${errorParam}`);
    }

    // If we have a code (PKCE flow), we can't exchange it here because:
    // 1. PKCE requires code_verifier which is stored in the popup's Supabase client
    // 2. Service workers don't have access to the popup's Supabase instance
    // Instead, we'll save the code and let the popup handle the exchange
    if (code) {
      console.log(
        "WordFlow: Found authorization code, saving for popup to exchange..."
      );
      console.log("WordFlow: Code:", code.substring(0, 20) + "...");

      // Save the code to storage so the popup can exchange it
      // The popup's Supabase client has the code_verifier needed for PKCE
      await chrome.storage.local.set({
        oauthCode: code,
        oauthCodeTimestamp: Date.now(),
      });

      console.log("WordFlow: OAuth code saved, popup will exchange it");
    } else {
      // Fallback: try to extract tokens from URL hash (implicit flow)
      const hashMap = parseUrlHash(url);
      const access_token = hashMap.get("access_token");
      const refresh_token = hashMap.get("refresh_token");

      console.log("WordFlow: Extracted tokens from hash:", {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
        hashKeys: Array.from(hashMap.keys()),
      });

      if (!access_token || !refresh_token) {
        console.error("WordFlow: Missing tokens in URL:", url);
        throw new Error("No Supabase tokens or code found in URL");
      }

      // For implicit flow, we need to get user info from Supabase
      // But we can't use Supabase client in service worker, so we'll use fetch
      try {
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            Authorization: `Bearer ${access_token}`,
            apikey: supabaseAnonKey!,
          },
        });

        if (!userResponse.ok) {
          throw new Error("Failed to get user info");
        }

        const user = await userResponse.json();

        // Create session object
        const session = {
          access_token,
          refresh_token,
          expires_in: 3600, // Default
          expires_at: Date.now() / 1000 + 3600,
          token_type: "bearer",
          user,
        };

        // Persist session to Chrome storage
        await chrome.storage.local.set({ session });
        console.log(
          "WordFlow: OAuth successful (implicit flow), session saved"
        );
      } catch (err) {
        console.error("WordFlow: Error processing implicit flow:", err);
        throw err;
      }
    }

    // Close the OAuth tab and show success message
    // Get the current tab to close it
    const redirectUrl = chrome.identity.getRedirectURL();
    const tabs = await chrome.tabs.query({
      url: redirectUrl + "*",
    });
    if (tabs.length > 0) {
      console.log("WordFlow: Closing OAuth tab");
      await chrome.tabs.remove(tabs[0].id!);
    }

    // Notify the extension popup to reload
    try {
      await chrome.runtime.sendMessage({
        action: "oauthComplete",
        session: data.session,
      });
    } catch (e) {
      // Popup might not be open, that's okay
      console.log("WordFlow: Could not notify popup (might not be open)");
    }

    // Optionally open a success page or notify the user
    console.log(
      "WordFlow: Please reopen the extension to see you're logged in"
    );
  } catch (error) {
    console.error("WordFlow: OAuth error:", error);
    // You could open an error page here
  }
}

// Listen for tab updates to catch OAuth redirects
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  // Only process when URL actually changes (not just loading state)
  if (changeInfo.status !== "complete" && changeInfo.url === undefined) {
    return;
  }

  const redirectUrl = chrome.identity.getRedirectURL();
  // Remove trailing slash for comparison
  const redirectUrlNoSlash = redirectUrl.replace(/\/$/, "");
  const currentUrl = changeInfo.url || tab.url;

  if (!currentUrl) {
    return;
  }

  // Get the base URL without hash/query for comparison
  try {
    const urlObj = new URL(currentUrl);
    const baseUrl =
      `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`.replace(/\/$/, "");

    // Check if the base URL exactly matches the redirect URL
    // This prevents matching Google sign-in pages that have redirect_to as a parameter
    if (
      baseUrl === redirectUrlNoSlash ||
      baseUrl.startsWith(redirectUrlNoSlash)
    ) {
      console.log("WordFlow: OAuth redirect detected!");
      console.log("WordFlow: Current URL:", currentUrl);
      console.log("WordFlow: Expected redirect URL:", redirectUrl);

      // Check if we have a code parameter (PKCE flow)
      const code = urlObj.searchParams.get("code");
      const errorParam = urlObj.searchParams.get("error");

      // Check if we have tokens in the hash (implicit flow)
      const hasTokens = currentUrl.includes("#access_token=");
      const hasError = currentUrl.includes("#error=") || errorParam;

      if (code || hasTokens || hasError) {
        console.log("WordFlow: Processing OAuth callback...");
        finishUserOAuth(currentUrl);
        return;
      }

      // If no code/tokens yet, wait for it (might be loading)
      console.log(
        "WordFlow: Redirect URL matched but no code/tokens yet, waiting..."
      );
    }

    // Also check if Supabase redirected to your website with tokens in hash
    // This can happen if Supabase uses Site URL instead of redirectTo
    if (
      currentUrl.includes("#access_token=") ||
      currentUrl.includes("#error=")
    ) {
      // Only process if it's NOT the chromiumapp.org URL (already handled above)
      if (!urlObj.host.includes("chromiumapp.org")) {
        console.log(
          "WordFlow: Detected OAuth tokens in website URL:",
          currentUrl
        );
        // Extract the hash and construct the proper redirect URL
        const hash = urlObj.hash;
        if (hash) {
          const properRedirectUrl = redirectUrl + hash;
          console.log("WordFlow: Constructed redirect URL:", properRedirectUrl);
          finishUserOAuth(properRedirectUrl);
          return;
        }
      }
    }
  } catch (e) {
    // Invalid URL, ignore
    console.log("WordFlow: Invalid URL detected, ignoring:", currentUrl);
  }
});

console.log("WordFlow Extension: Background service worker loaded");

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("WordFlow Extension installed");

  // Create context menu for text selection
  chrome.contextMenus.create({
    id: "wordflow-text-selection",
    title: "WordFlow: Process with AI",
    contexts: ["selection"],
    documentUrlPatterns: ["<all_urls>"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "wordflow-text-selection" && info.selectionText) {
    // Store selected text for popup access
    chrome.storage.local.set({
      selectedText: info.selectionText,
      sourceUrl: tab?.url || "",
      timestamp: Date.now(),
    });

    // Open the extension popup
    chrome.action.openPopup();
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "getStoredText") {
    chrome.storage.local.get(
      ["selectedText", "sourceUrl", "timestamp"],
      (result) => {
        sendResponse(result);
      }
    );
    return true;
  }

  if (request.action === "clearStoredText") {
    chrome.storage.local.remove(
      ["selectedText", "sourceUrl", "timestamp"],
      () => {
        sendResponse({ success: true });
      }
    );
    return true;
  }

  // Store Supabase credentials from popup
  if (request.action === "setSupabaseCredentials") {
    supabaseUrl = request.supabaseUrl;
    supabaseAnonKey = request.supabaseAnonKey;
    chrome.storage.local.set({
      supabaseUrl,
      supabaseAnonKey,
    });
    sendResponse({ success: true });
    return true;
  }
});
