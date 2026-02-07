
let supabaseUrl: string | null = null;
let supabaseAnonKey: string | null = null;

async function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase credentials not initialized");
  }
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {

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

      flowType: "pkce",

      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {

      fetch: fetch,
    },
  });
}

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

async function finishUserOAuth(url: string) {
  try {
    console.log("WordFlow: Handling OAuth callback...");
    console.log("WordFlow: Callback URL:", url);

    if (!supabaseUrl || !supabaseAnonKey) {

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

    const urlObj = new URL(url);
    const code = urlObj.searchParams.get("code");
    const errorParam = urlObj.searchParams.get("error");

    if (errorParam) {
      console.error("WordFlow: OAuth error:", errorParam);
      throw new Error(`OAuth error: ${errorParam}`);
    }

    if (code) {
      console.log(
        "WordFlow: Found authorization code, saving for popup to exchange..."
      );
      console.log("WordFlow: Code:", code.substring(0, 20) + "...");

      await chrome.storage.local.set({
        oauthCode: code,
        oauthCodeTimestamp: Date.now(),
        oauthCodeProcessing: false,
      });

      console.log("WordFlow: OAuth code saved, popup will exchange it");
    } else {

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

        const session = {
          access_token,
          refresh_token,
          expires_in: 3600,
          expires_at: Date.now() / 1000 + 3600,
          token_type: "bearer",
          user,
        };

        await chrome.storage.local.set({ session });
        console.log(
          "WordFlow: OAuth successful (implicit flow), session saved"
        );
      } catch (err) {
        console.error("WordFlow: Error processing implicit flow:", err);
        throw err;
      }
    }

    try {
      const redirectUrl = chrome.identity.getRedirectURL();
      const tabs = await chrome.tabs.query({
        url: redirectUrl + "*",
      });
      if (tabs.length > 0 && tabs[0].id) {
        console.log("WordFlow: Closing OAuth tab");
        try {
          await chrome.tabs.remove(tabs[0].id);
        } catch (tabError) {

          console.log(
            "WordFlow: Could not close tab (might already be closed):",
            tabError
          );
        }
      }
    } catch (error) {

      console.log(
        "WordFlow: Could not close OAuth tab (no active window):",
        error
      );
    }

    try {
      await chrome.runtime.sendMessage({
        action: "oauthComplete",
        session: data.session,
      });
    } catch (e) {

      console.log("WordFlow: Could not notify popup (might not be open)");
    }

    console.log(
      "WordFlow: Please reopen the extension to see you're logged in"
    );
  } catch (error) {
    console.error("WordFlow: OAuth error:", error);

  }
}

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {

  if (changeInfo.status !== "complete" && changeInfo.url === undefined) {
    return;
  }

  const redirectUrl = chrome.identity.getRedirectURL();

  const redirectUrlNoSlash = redirectUrl.replace(/\/$/, "");
  const currentUrl = changeInfo.url || tab.url;

  if (!currentUrl) {
    return;
  }

  try {
    const urlObj = new URL(currentUrl);
    const baseUrl =
      `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`.replace(/\/$/, "");

    if (
      baseUrl === redirectUrlNoSlash ||
      baseUrl.startsWith(redirectUrlNoSlash)
    ) {
      console.log("WordFlow: OAuth redirect detected!");
      console.log("WordFlow: Current URL:", currentUrl);
      console.log("WordFlow: Expected redirect URL:", redirectUrl);

      const code = urlObj.searchParams.get("code");
      const errorParam = urlObj.searchParams.get("error");

      const hasTokens = currentUrl.includes("#access_token=");
      const hasError = currentUrl.includes("#error=") || errorParam;

      if (code || hasTokens || hasError) {
        console.log("WordFlow: Processing OAuth callback...");
        finishUserOAuth(currentUrl);
        return;
      }

      console.log(
        "WordFlow: Redirect URL matched but no code/tokens yet, waiting..."
      );
    }

    if (
      currentUrl.includes("#access_token=") ||
      currentUrl.includes("#error=")
    ) {

      if (!urlObj.host.includes("chromiumapp.org")) {
        console.log(
          "WordFlow: Detected OAuth tokens in website URL:",
          currentUrl
        );

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

    console.log("WordFlow: Invalid URL detected, ignoring:", currentUrl);
  }
});

console.log("Baibylon Extension: Background service worker loaded");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Baibylon Extension installed");

  chrome.contextMenus.create({
    id: "baibylon-text-selection",
    title: "Baibylon: Process with AI",
    contexts: ["selection"],
    documentUrlPatterns: ["<all_urls>"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "baibylon-text-selection" && info.selectionText) {

    chrome.storage.local.set({
      selectedText: info.selectionText,
      sourceUrl: tab?.url || "",
      timestamp: Date.now(),
    });

    try {
      await chrome.action.openPopup();
    } catch (error) {

      console.log("WordFlow: Could not open popup automatically:", error);
    }
  }
});

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
