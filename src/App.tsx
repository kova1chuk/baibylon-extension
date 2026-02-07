import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { useTextProcessing } from "./hooks/useTextProcessing";
import { Auth } from "./components/auth/Auth";
import { UserProfile } from "./components/auth/UserProfile";
import { ThemeToggle } from "./components/ThemeToggle";
import { OAuthCallback } from "./components/OAuthCallback";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Alert, AlertDescription } from "./components/ui/alert";
import { PenIcon, DocumentIcon, SparklesIcon, XIcon } from "./components/icons";

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

  const urlParams = new URLSearchParams(window.location.search);
  const hasOAuthCode = urlParams.get("code") !== null;
  const hasOAuthCallback =
    hasOAuthCode ||
    window.location.hash.includes("access_token=") ||
    window.location.hash.includes("error=");

  useEffect(() => {
    if (isAuthenticated) {
      checkForStoredText();
    }
  }, [isAuthenticated, checkForStoredText]);

  if (loading) {
    return (
      <div className="w-96 max-h-[600px] bg-background text-foreground overflow-hidden">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasOAuthCallback && !isAuthenticated) {
    return <OAuthCallback />;
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="w-96 max-h-[600px] bg-background text-foreground overflow-hidden flex flex-col">
      {}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-gradient-to-r from-card via-card to-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm ring-1 ring-primary/10">
            <PenIcon className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            Baibylon
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <UserProfile />
          <ThemeToggle />
        </div>
      </div>

      {}
      <div className="flex-1 overflow-y-auto p-5 bg-muted/20">
        <Card className="bg-card border-border/50 shadow-lg">
          <CardContent className="p-5">
            {hasStoredText ? (
              <div className="space-y-4">
                {}
                <Card className="border-border/50 shadow-md bg-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DocumentIcon className="w-4 h-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-semibold">
                          Selected Text
                        </CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                        onClick={clearStoredText}
                      >
                        <XIcon />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {}
                    <Card className="bg-muted/30 border-border/50 shadow-sm">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground leading-relaxed max-h-40 overflow-y-auto">
                          {storedText?.selectedText}
                        </p>
                      </CardContent>
                    </Card>

                    {storedText?.sourceUrl && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground truncate px-1">
                        <svg
                          className="w-3 h-3 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                          />
                        </svg>
                        <span className="truncate">{storedText.sourceUrl}</span>
                      </div>
                    )}

                    {}
                    {processedText && (
                      <Card className="border-primary/30 bg-primary/5 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <SparklesIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="flex-1 space-y-2">
                              <p className="text-xs font-semibold text-primary">
                                Result:
                              </p>
                              <p className="text-sm leading-relaxed text-foreground">
                                {processedText}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {}
                    {error && (
                      <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
                        <CardContent className="p-4">
                          <p className="text-sm text-destructive">{error}</p>
                        </CardContent>
                      </Card>
                    )}

                    {}
                    <Card className="border-transparent bg-transparent shadow-none p-0">
                      <CardContent className="p-0">
                        <Button
                          onClick={processText}
                          disabled={isProcessing}
                          className="w-full h-11 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          size="default"
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <SparklesIcon className="w-4 h-4 mr-2" />
                              Process with AI
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-border/50 shadow-md bg-card">
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl"></div>
                      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                        <DocumentIcon className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-base font-semibold">
                        No Text Selected
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                        Select text on a webpage, right-click, and choose{" "}
                        <span className="font-medium text-foreground">
                          "Baibylon: Process with AI"
                        </span>{" "}
                        from the context menu to get started.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
