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

    const getInitialSession = async () => {
      try {

        if (typeof chrome !== "undefined" && chrome.storage) {
          const stored = await chrome.storage.local.get([
            "oauthCode",
            "oauthCodeTimestamp",
            "session",
            "oauthCodeProcessing",
            "signedOut",
            "signedOutTimestamp",
          ]);

          if (stored.signedOut && stored.signedOutTimestamp) {
            const signOutAge = Date.now() - stored.signedOutTimestamp;
            if (signOutAge < 5 * 60 * 1000) {

              console.log(
                "Baibylon: User recently signed out, not restoring session"
              );
              setSession(null);
              setUser(null);
              setLoading(false);

              await chrome.storage.local.remove([
                "signedOut",
                "signedOutTimestamp",
              ]);
              return;
            } else {

              await chrome.storage.local.remove([
                "signedOut",
                "signedOutTimestamp",
              ]);
            }
          }

          if (stored.oauthCode && !stored.oauthCodeProcessing) {
            const codeAge = Date.now() - (stored.oauthCodeTimestamp || 0);
            if (codeAge < 5 * 60 * 1000) {

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

                  await chrome.storage.local.remove([
                    "oauthCode",
                    "oauthCodeTimestamp",
                    "oauthCodeProcessing",
                  ]);
                } else if (data.session) {
                  console.log("WordFlow: Session created from code exchange");
                  setSession(data.session);
                  setUser(data.session.user);

                  await chrome.storage.local.set({ session: data.session });
                  await chrome.storage.local.remove([
                    "oauthCode",
                    "oauthCodeTimestamp",
                    "oauthCodeProcessing",
                  ]);
                  setLoading(false);
                  return;
                } else {

                  await chrome.storage.local.remove([
                    "oauthCode",
                    "oauthCodeTimestamp",
                    "oauthCodeProcessing",
                  ]);
                }
              } catch (err) {
                console.error("WordFlow: Exception during code exchange:", err);

                await chrome.storage.local.remove([
                  "oauthCode",
                  "oauthCodeTimestamp",
                  "oauthCodeProcessing",
                ]);
              }
            } else {

              await chrome.storage.local.remove([
                "oauthCode",
                "oauthCodeTimestamp",
                "oauthCodeProcessing",
              ]);
            }
          } else if (stored.oauthCodeProcessing) {

            console.log(
              "WordFlow: OAuth code is being processed by another instance, waiting..."
            );

            await new Promise((resolve) => setTimeout(resolve, 1000));

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

          if (stored.session) {

            const expiresAt = stored.session.expires_at;
            if (expiresAt && expiresAt * 1000 < Date.now()) {

              await chrome.storage.local.remove(["session"]);
            } else {

              const { data, error } = await supabase.auth.setSession(
                stored.session
              );
              if (!error && data.session) {

                setSession(data.session);
                setUser(data.session.user ?? null);

                await chrome.storage.local.set({ session: data.session });
                setLoading(false);
                return;
              } else {

                await chrome.storage.local.remove(["session"]);
              }
            }
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (typeof chrome !== "undefined" && chrome.storage) {
          const signOutCheck = await chrome.storage.local.get([
            "signedOut",
            "signedOutTimestamp",
          ]);
          if (signOutCheck.signedOut && signOutCheck.signedOutTimestamp) {
            const signOutAge = Date.now() - signOutCheck.signedOutTimestamp;
            if (signOutAge < 5 * 60 * 1000) {

              setSession(null);
              setUser(null);
              setLoading(false);
              return;
            }
          }
        }

        if (session) {
          setSession(session);
          setUser(session.user ?? null);

          if (typeof chrome !== "undefined" && chrome.storage) {
            await chrome.storage.local.set({ session });
            await chrome.storage.local.remove([
              "signedOut",
              "signedOutTimestamp",
            ]);
          }
        } else {

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

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session);

      if (event === "SIGNED_OUT" || !session) {
        setLoading(false);
        setSession(null);
        setUser(null);

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

      setLoading(false);

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {

          const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("full_name, email")
            .eq("id", session.user.id)
            .single();

          if (!profileError && profile) {

            console.log("User profile loaded from database:", profile);
          }
        } catch (error) {

          console.log(
            "Could not fetch user profile from database, using user_metadata"
          );
        }
      }

      if (session && typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.set({ session });
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setSession, setLoading]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 10000);

    return () => clearTimeout(timeout);
  }, [setLoading]);

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
