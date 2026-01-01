import React, { useEffect } from "react";
import { useSetRecoilState } from "recoil";
import { supabase } from "../lib/supabase";
import { userState, sessionState, loadingState } from "../store/authStore";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const setUser = useSetRecoilState(userState);
  const setSession = useSetRecoilState(sessionState);
  const setLoading = useSetRecoilState(loadingState);

  useEffect(() => {
    // Send Supabase credentials to background script
    if (typeof chrome !== "undefined" && chrome.runtime) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseAnonKey) {
        chrome.runtime.sendMessage({
          action: "setSupabaseCredentials",
          supabaseUrl,
          supabaseAnonKey,
        });
      }
    }

    // Get initial session from Chrome storage first
    const getInitialSession = async () => {
      try {
        // Check for OAuth code first (from background script)
        if (typeof chrome !== "undefined" && chrome.storage) {
          const stored = await chrome.storage.local.get([
            "oauthCode",
            "oauthCodeTimestamp",
            "session",
            "oauthCodeProcessing",
            "signedOut",
            "signedOutTimestamp",
          ]);

          // Check if user recently signed out (within last 5 minutes)
          // If so, don't restore any session
          if (stored.signedOut && stored.signedOutTimestamp) {
            const signOutAge = Date.now() - stored.signedOutTimestamp;
            if (signOutAge < 5 * 60 * 1000) {
              // User signed out recently, clear everything and don't restore
              console.log(
                "Baibylon: User recently signed out, not restoring session"
              );
              setSession(null);
              setUser(null);
              setLoading(false);
              // Clear the sign-out flag after checking
              await chrome.storage.local.remove([
                "signedOut",
                "signedOutTimestamp",
              ]);
              return;
            } else {
              // Sign-out flag is old, remove it
              await chrome.storage.local.remove([
                "signedOut",
                "signedOutTimestamp",
              ]);
            }
          }

          // If we have an OAuth code, exchange it for session
          // Use a lock to prevent multiple instances from processing the same code
          if (stored.oauthCode && !stored.oauthCodeProcessing) {
            const codeAge = Date.now() - (stored.oauthCodeTimestamp || 0);
            if (codeAge < 5 * 60 * 1000) {
              // Code is not too old (5 minutes max)
              // Set processing lock to prevent other instances
              await chrome.storage.local.set({ oauthCodeProcessing: true });

              console.log(
                "WordFlow: Found OAuth code, exchanging for session..."
              );
              try {
                const { data, error: exchangeError } =
                  await supabase.auth.exchangeCodeForSession(stored.oauthCode);

                if (exchangeError) {
                  console.error(
                    "WordFlow: Error exchanging code:",
                    exchangeError
                  );
                  // Remove invalid code to prevent retry loop
                  await chrome.storage.local.remove([
                    "oauthCode",
                    "oauthCodeTimestamp",
                    "oauthCodeProcessing",
                  ]);
                } else if (data.session) {
                  console.log("WordFlow: Session created from code exchange");
                  setSession(data.session);
                  setUser(data.session.user);
                  // Save session and clear code
                  await chrome.storage.local.set({ session: data.session });
                  await chrome.storage.local.remove([
                    "oauthCode",
                    "oauthCodeTimestamp",
                    "oauthCodeProcessing",
                  ]);
                  setLoading(false);
                  return;
                } else {
                  // No session returned, clear everything
                  await chrome.storage.local.remove([
                    "oauthCode",
                    "oauthCodeTimestamp",
                    "oauthCodeProcessing",
                  ]);
                }
              } catch (err) {
                console.error("WordFlow: Exception during code exchange:", err);
                // Remove code on error to prevent retry loop
                await chrome.storage.local.remove([
                  "oauthCode",
                  "oauthCodeTimestamp",
                  "oauthCodeProcessing",
                ]);
              }
            } else {
              // Code is too old, remove it
              await chrome.storage.local.remove([
                "oauthCode",
                "oauthCodeTimestamp",
                "oauthCodeProcessing",
              ]);
            }
          } else if (stored.oauthCodeProcessing) {
            // Another instance is processing the code, wait a bit and check for session
            console.log(
              "WordFlow: OAuth code is being processed by another instance, waiting..."
            );
            // Wait a moment for the other instance to finish
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // Check if session was created by the other instance
            const updated = await chrome.storage.local.get(["session"]);
            if (updated.session) {
              const { error } = await supabase.auth.setSession(updated.session);
              if (!error) {
                setSession(updated.session);
                setUser(updated.session.user ?? null);
                setLoading(false);
                return;
              }
            }
          }

          // Try to get session from Chrome storage (set by background script)
          // But first verify it's still valid with Supabase
          if (stored.session) {
            // Check if session is expired
            const expiresAt = stored.session.expires_at;
            if (expiresAt && expiresAt * 1000 < Date.now()) {
              // Session expired, remove it
              await chrome.storage.local.remove(["session"]);
            } else {
              // Try to set the session and verify it's still valid
              const { data, error } = await supabase.auth.setSession(
                stored.session
              );
              if (!error && data.session) {
                // Session is valid
                setSession(data.session);
                setUser(data.session.user ?? null);
                // Update stored session in case it was refreshed
                await chrome.storage.local.set({ session: data.session });
                setLoading(false);
                return;
              } else {
                // Session is invalid, remove it
                await chrome.storage.local.remove(["session"]);
              }
            }
          }
        }

        // Fallback to Supabase session (this will be null if signed out)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Check sign-out flag again before restoring session
        if (typeof chrome !== "undefined" && chrome.storage) {
          const signOutCheck = await chrome.storage.local.get([
            "signedOut",
            "signedOutTimestamp",
          ]);
          if (signOutCheck.signedOut && signOutCheck.signedOutTimestamp) {
            const signOutAge = Date.now() - signOutCheck.signedOutTimestamp;
            if (signOutAge < 5 * 60 * 1000) {
              // User signed out recently, don't restore session
              setSession(null);
              setUser(null);
              setLoading(false);
              return;
            }
          }
        }

        // Only set session if it exists and is valid
        if (session) {
          setSession(session);
          setUser(session.user ?? null);
          // Save to Chrome storage and clear sign-out flag
          if (typeof chrome !== "undefined" && chrome.storage) {
            await chrome.storage.local.set({ session });
            await chrome.storage.local.remove([
              "signedOut",
              "signedOutTimestamp",
            ]);
          }
        } else {
          // No session - ensure everything is cleared
          setSession(null);
          setUser(null);
          if (typeof chrome !== "undefined" && chrome.storage) {
            await chrome.storage.local.remove([
              "session",
              "signedOut",
              "signedOutTimestamp",
            ]);
          }
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
      } finally {
        setLoading(false);
      }
    };

    // Only run once on mount
    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session);

      // For sign out events, immediately set loading to false and clear state
      if (event === "SIGNED_OUT" || !session) {
        setLoading(false);
        setSession(null);
        setUser(null);

        // Set sign-out flag and clear Chrome storage on sign out
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

          // Clear all Supabase-related keys
          try {
            const allKeys = await chrome.storage.local.get(null);
            const supabaseKeys = Object.keys(allKeys).filter(
              (key) =>
                key.startsWith("sb-") ||
                key.includes("supabase") ||
                (key.includes("auth") &&
                  key !== "signedOut" &&
                  key !== "signedOutTimestamp")
            );
            if (supabaseKeys.length > 0) {
              await chrome.storage.local.remove(supabaseKeys);
            }
          } catch (storageErr) {
            console.error("Error clearing Supabase storage:", storageErr);
          }
        }

        return;
      }

      // Always set loading to false first to prevent infinite loops
      setLoading(false);

      setSession(session);
      setUser(session?.user ?? null);

      // If user is authenticated, try to fetch/update user profile from database
      if (session?.user) {
        try {
          // Optionally fetch user profile from user_profiles table if it exists
          // This ensures we have the latest user data
          const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("full_name, email")
            .eq("id", session.user.id)
            .single();

          if (!profileError && profile) {
            // Update user metadata if profile exists in database
            // Note: This doesn't modify the auth user, just ensures we have the data
            console.log("User profile loaded from database:", profile);
          }
        } catch (error) {
          // Silently fail if user_profiles table doesn't exist or query fails
          // This is okay - we'll use user_metadata as fallback
          console.log(
            "Could not fetch user profile from database, using user_metadata"
          );
        }
      }

      // Save session to Chrome storage when it changes
      if (session && typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.set({ session });
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setSession, setLoading]);

  // Safety mechanism: ensure loading is always set to false after a timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 10000); // 10 second safety timeout

    return () => clearTimeout(timeout);
  }, [setLoading]);

  // Listen for OAuth completion message from background script
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      const messageListener = (message: any) => {
        if (message.action === "oauthComplete" && message.session) {
          console.log("WordFlow: Received OAuth completion message");
          setSession(message.session);
          setUser(message.session.user);
          if (typeof chrome !== "undefined" && chrome.storage) {
            chrome.storage.local.set({ session: message.session });
          }
        }
      };

      chrome.runtime.onMessage.addListener(messageListener);
      return () => {
        chrome.runtime.onMessage.removeListener(messageListener);
      };
    }
  }, [setUser, setSession]);

  return <>{children}</>;
};
