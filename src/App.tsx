import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { useTextProcessing } from "./hooks/useTextProcessing";
import { Auth } from "./components/auth/Auth";
import { UserProfile } from "./components/auth/UserProfile";
import { ThemeToggle } from "./components/ThemeToggle";
import { OAuthCallback } from "./components/OAuthCallback";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Badge } from "./components/ui/badge";

function App() {
  const { loading, isAuthenticated } = useAuth();
  const {
    storedText,
    isProcessing,
    processedText,
    error,
    hasStoredText,
    checkForStoredText,
    clearStoredText,
    processText,
  } = useTextProcessing();

  // Check if we have OAuth callback in URL (code parameter or tokens in hash)
  const urlParams = new URLSearchParams(window.location.search);
  const hasOAuthCode = urlParams.get("code") !== null;
  const hasOAuthCallback =
    hasOAuthCode ||
    window.location.hash.includes("access_token=") ||
    window.location.hash.includes("error=");

  // Check for stored text when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      checkForStoredText();
    }
  }, [isAuthenticated, checkForStoredText]);

  // Show loading state
  if (loading) {
    return (
      <div className="w-96 min-h-[500px] bg-background text-foreground overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show OAuth callback handler if we have tokens in URL
  if (hasOAuthCallback && !isAuthenticated) {
    return <OAuthCallback />;
  }

  // Show authentication if user is not signed in
  if (!isAuthenticated) {
    return <Auth />;
  }

  // Show main app if user is authenticated
  return (
    <div className="w-96 min-h-[500px] bg-background text-foreground overflow-hidden flex flex-col">
      {/* User Profile Header - Always show when authenticated */}
      {isAuthenticated && (
        <div className="flex items-center justify-between p-4 bg-card border-b border-border">
          <UserProfile />
          <ThemeToggle />
        </div>
      )}

      {/* Header */}
      <Card className="rounded-none border-x-0 border-t-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardHeader className="text-center pb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-foreground/20 rounded-xl mb-3">
            <span className="text-xl">✍️</span>
          </div>
          <CardTitle className="text-xl mb-1 text-primary-foreground">
            Baibylon
          </CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Process selected text with AI
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto">
        {/* Selected Text Display */}
        {hasStoredText ? (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Selected Text</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={clearStoredText}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed max-h-24 overflow-y-auto">
                "{storedText?.selectedText}"
              </p>
              {storedText?.sourceUrl && (
                <p className="text-xs text-muted-foreground truncate">
                  Source: {storedText.sourceUrl}
                </p>
              )}

              {/* Processed Text Display */}
              {processedText && (
                <Alert>
                  <AlertDescription className="space-y-2">
                    <p className="text-sm font-semibold">Processed Result:</p>
                    <p className="text-sm leading-relaxed">{processedText}</p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={processText}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-foreground mr-2"></div>
                    Processing...
                  </>
                ) : (
                  "🤖 Process with AI"
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <CardTitle className="text-lg mb-3">No Text Selected</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Select text on any webpage, right-click, and choose "Baibylon:
                Process with AI" from the context menu to get started.
              </CardDescription>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border bg-card mt-auto">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">Version 0.0.1</span>
          <div className="flex items-center space-x-2">
            <Badge
              variant="outline"
              className="h-2 w-2 p-0 bg-green-500 border-green-500"
            ></Badge>
            <span className="font-medium">Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
