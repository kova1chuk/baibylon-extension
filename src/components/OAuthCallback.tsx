import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "./ui/button";
import { AlertTriangleIcon } from "./icons";

/**
 * Component to handle OAuth callback if user is redirected to the extension popup
 * This is a fallback in case the background script doesn't catch the redirect
 */
export const OAuthCallback: React.FC = () => {
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          console.error("Baibylon: OAuth error:", errorParam);
          setError(errorParam);
          setProcessing(false);
          return;
        }
        
        if (oauthCode) {
          console.log("Baibylon: OAuth code found, exchanging for session...");
          
          // Exchange code for session using Supabase client (has code_verifier)
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(oauthCode);
          
          if (exchangeError) {
            console.error("Baibylon: Error exchanging code:", exchangeError);
            setError(exchangeError.message);
            setProcessing(false);
            return;
          }
          
          if (data.session) {
            console.log("Baibylon: Session created from code exchange");
            
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
          console.log("Baibylon: OAuth callback detected in popup (implicit flow)");
          
          // Parse hash to get tokens
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const hashError = params.get("error");
          
          if (hashError) {
            console.error("Baibylon: OAuth error:", hashError);
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
              console.error("Baibylon: Error setting session:", sessionError);
              setError(sessionError.message);
              setProcessing(false);
              return;
            }

            if (data.session) {
              console.log("Baibylon: Session restored from callback");
              
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
          if (!data.session) {
            setProcessing(false);
          }
        }
      } catch (err) {
        console.error("Baibylon: Error handling OAuth callback:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setProcessing(false);
      }
    };

    handleCallback();
  }, []);

  if (error) {
    return (
      <div className="w-96 max-h-[600px] bg-background text-foreground overflow-hidden flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 bg-destructive/10 rounded-2xl blur-xl"></div>
          <div className="relative w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center ring-1 ring-destructive/20">
            <AlertTriangleIcon className="w-8 h-8 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-semibold">Authentication Error</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          size="default"
          className="h-10 text-sm"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-96 max-h-[600px] bg-background text-foreground overflow-hidden flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="relative">
        {processing && (
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="text-base font-semibold">Completing sign in...</h3>
        <p className="text-sm text-muted-foreground">
          {processing 
            ? "Please wait..."
            : "Redirecting..."}
        </p>
      </div>
    </div>
  );
};

