import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  userState,
  sessionState,
  loadingState,
  authErrorState,
  isAuthenticatedSelector,
  userProfileSelector,
} from "../store/authStore";

export const useAuth = () => {
  const [user] = useRecoilState(userState);
  const [session] = useRecoilState(sessionState);
  const [loading] = useRecoilState(loadingState);
  const [error] = useRecoilState(authErrorState);

  const isAuthenticated = useRecoilValue(isAuthenticatedSelector);
  const userProfile = useRecoilValue(userProfileSelector);

  const setUserState = useSetRecoilState(userState);
  const setSessionState = useSetRecoilState(sessionState);
  const setLoadingState = useSetRecoilState(loadingState);
  const setErrorState = useSetRecoilState(authErrorState);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoadingState(true);
      setErrorState(null);

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorState(error.message);
          return { error };
        }

        return { error: null };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setErrorState(errorMessage);
        return { error: { message: errorMessage } };
      } finally {
        setLoadingState(false);
      }
    },
    [setLoadingState, setErrorState]
  );

  const signInWithGoogle = useCallback(async () => {
    setLoadingState(true);
    setErrorState(null);

    try {
      // Use Chrome identity API to get the proper redirect URL
      // This generates: https://YOUR_EXTENSION_ID.chromiumapp.org
      const redirectUrl =
        typeof chrome !== "undefined" &&
        chrome.identity &&
        chrome.identity.getRedirectURL
          ? chrome.identity.getRedirectURL().replace(/\/$/, "") // Remove trailing slash
          : window.location.origin + "/index.html";

      console.log("WordFlow: OAuth redirect URL:", redirectUrl);
      console.log(
        "WordFlow: Extension ID:",
        typeof chrome !== "undefined" ? chrome.runtime.id : "N/A"
      );

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
          // Skip browser redirect - we'll handle it manually
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error("WordFlow: OAuth error:", error);
        setErrorState(error.message);
        return { error };
      }

      console.log("WordFlow: OAuth URL generated:", data?.url);

      // Open OAuth in a new tab (more reliable than popup)
      if (data?.url && typeof chrome !== "undefined" && chrome.tabs) {
        await chrome.tabs.create({ url: data.url });
      } else {
        // Fallback for non-extension environments
        window.location.href = data.url;
      }

      return { error: null, data };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("WordFlow: OAuth exception:", err);
      setErrorState(errorMessage);
      return { error: { message: errorMessage } };
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState]);

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      setLoadingState(true);
      setErrorState(null);

      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          setErrorState(error.message);
          return { error };
        }

        return { error: null };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setErrorState(errorMessage);
        return { error: { message: errorMessage } };
      } finally {
        setLoadingState(false);
      }
    },
    [setLoadingState, setErrorState]
  );

  const signOut = useCallback(async () => {
    setErrorState(null);
    // Don't set loading to true - clear immediately for better UX
    // The onAuthStateChange handler will manage loading state

    try {
      // Clear state immediately for better UX
      setUserState(null);
      setSessionState(null);
      setLoadingState(false);

      // Set a sign-out flag in Chrome storage to prevent session restoration
      if (typeof chrome !== "undefined" && chrome.storage) {
        await chrome.storage.local.set({
          signedOut: true,
          signedOutTimestamp: Date.now(),
        });
        // Clear all auth-related storage
        await chrome.storage.local.remove([
          "session",
          "oauthCode",
          "oauthCodeTimestamp",
          "oauthCodeProcessing",
        ]);
      }

      // Sign out from Supabase (this will trigger onAuthStateChange)
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out error:", error);
      }

      // Clear Supabase's internal storage as well
      try {
        // Clear all Supabase auth keys from Chrome storage
        if (typeof chrome !== "undefined" && chrome.storage) {
          const allKeys = await chrome.storage.local.get(null);
          const supabaseKeys = Object.keys(allKeys).filter(
            (key) =>
              key.startsWith("sb-") ||
              key.includes("supabase") ||
              key.includes("auth")
          );
          if (supabaseKeys.length > 0) {
            await chrome.storage.local.remove(supabaseKeys);
          }
        }
      } catch (storageErr) {
        console.error("Error clearing Supabase storage:", storageErr);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("Sign out exception:", err);
      setErrorState(errorMessage);
      // Ensure loading is false even on error
      setLoadingState(false);

      // Still clear Chrome storage even on error
      if (typeof chrome !== "undefined" && chrome.storage) {
        await chrome.storage.local.set({
          signedOut: true,
          signedOutTimestamp: Date.now(),
        });
        await chrome.storage.local.remove([
          "session",
          "oauthCode",
          "oauthCodeTimestamp",
          "oauthCodeProcessing",
        ]);
      }
    }
  }, [setErrorState, setUserState, setSessionState, setLoadingState]);

  const resetPassword = useCallback(
    async (email: string) => {
      setLoadingState(true);
      setErrorState(null);

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: chrome.runtime.getURL("index.html"),
        });

        if (error) {
          setErrorState(error.message);
          return { error };
        }

        return { error: null };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setErrorState(errorMessage);
        return { error: { message: errorMessage } };
      } finally {
        setLoadingState(false);
      }
    },
    [setLoadingState, setErrorState]
  );

  const clearError = useCallback(() => {
    setErrorState(null);
  }, [setErrorState]);

  return {
    // State
    user,
    session,
    loading,
    error,
    isAuthenticated,
    userProfile,

    // Actions
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    resetPassword,
    clearError,

    // State setters (for internal use)
    setUser: setUserState,
    setSession: setSessionState,
    setLoading: setLoadingState,
  };
};
