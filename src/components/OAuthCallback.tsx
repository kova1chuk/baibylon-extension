import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

/**
 * Component to handle OAuth callback if user is redirected to the extension popup
 * This is a fallback in case the background script doesn't catch the redirect
 */
export const OAuthCallback: React.FC = () => {
  const { setUser, setSession } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setProcessing(true);
        
        // Check for code in URL (PKCE flow)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const errorParam = urlParams.get("error");
        
        // Also check for code in Chrome storage (set by background script)
        let oauthCode = code;
        if (!oauthCode && typeof chrome !== "undefined" && chrome.storage) {
          const stored = await chrome.storage.local.get(["oauthCode", "oauthCodeTimestamp"]);
          if (stored.oauthCode) {
            // Check if code is not too old (5 minutes max)
            const codeAge = Date.now() - (stored.oauthCodeTimestamp || 0);
            if (codeAge < 5 * 60 * 1000) {
              oauthCode = stored.oauthCode;
              // Clear the stored code
              chrome.storage.local.remove(["oauthCode", "oauthCodeTimestamp"]);
            }
          }
        }
        
        if (errorParam) {
          console.error("WordFlow: OAuth error:", errorParam);
          setError(errorParam);
          setProcessing(false);
          return;
        }
        
        if (oauthCode) {
          console.log("WordFlow: OAuth code found, exchanging for session...");
          
          // Exchange code for session using Supabase client (has code_verifier)
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(oauthCode);
          
          if (exchangeError) {
            console.error("WordFlow: Error exchanging code:", exchangeError);
            setError(exchangeError.message);
            setProcessing(false);
            return;
          }
          
          if (data.session) {
            console.log("WordFlow: Session created from code exchange");
            setSession(data.session);
            setUser(data.session.user);
            
            // Save to Chrome storage
            if (typeof chrome !== "undefined" && chrome.storage) {
              chrome.storage.local.set({ session: data.session });
            }
            
            // Clear URL parameters
            window.history.replaceState(null, "", window.location.pathname);
            
            // Reload to show main app
            setTimeout(() => {
              window.location.reload();
            }, 500);
            return;
          }
        }
        
        // Fallback: Check for tokens in URL hash (implicit flow)
        const hash = window.location.hash.substring(1);
        if (hash && (hash.includes("access_token=") || hash.includes("error="))) {
          console.log("WordFlow: OAuth callback detected in popup (implicit flow)");
          
          // Parse hash to get tokens
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const hashError = params.get("error");
          
          if (hashError) {
            console.error("WordFlow: OAuth error:", hashError);
            setError(hashError);
            setProcessing(false);
            return;
          }
          
          if (accessToken && refreshToken) {
            // Set session with tokens
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (sessionError) {
              console.error("WordFlow: Error setting session:", sessionError);
              setError(sessionError.message);
              setProcessing(false);
              return;
            }

            if (data.session) {
              console.log("WordFlow: Session restored from callback");
              setSession(data.session);
              setUser(data.session.user);
              
              // Save to Chrome storage
              if (typeof chrome !== "undefined" && chrome.storage) {
                chrome.storage.local.set({ session: data.session });
              }
              
              // Clear the hash from URL
              window.history.replaceState(null, "", window.location.pathname);
              
              // Reload to show main app
              setTimeout(() => {
                window.location.reload();
              }, 500);
            }
          }
        } else {
          // No code or tokens, try to get existing session
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setSession(data.session);
            setUser(data.session.user);
          } else {
            setProcessing(false);
          }
        }
      } catch (err) {
        console.error("WordFlow: Error handling OAuth callback:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setProcessing(false);
      }
    };

    handleCallback();
  }, [setUser, setSession]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              window.location.reload();
            }}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completing sign in...</CardTitle>
        <CardDescription>
          {processing 
            ? "Please wait while we complete your authentication."
            : "Authentication complete! Redirecting..."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {processing && (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

