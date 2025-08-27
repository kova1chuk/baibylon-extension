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
  const [user, setUser] = useRecoilState(userState);
  const [session, setSession] = useRecoilState(sessionState);
  const [loading, setLoading] = useRecoilState(loadingState);
  const [error, setError] = useRecoilState(authErrorState);

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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: chrome.runtime.getURL("index.html"),
          queryParams: {
            access_type: "offline",
            prompt: "consent",
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
    setLoadingState(true);
    setErrorState(null);

    try {
      await supabase.auth.signOut();
      setUserState(null);
      setSessionState(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setErrorState(errorMessage);
    } finally {
      setLoadingState(false);
    }
  }, [setLoadingState, setErrorState, setUserState, setSessionState]);

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
