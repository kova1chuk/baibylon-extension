import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { GoogleSignIn } from "./GoogleSignIn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { Separator } from "../ui/separator";
import { Card, CardContent } from "../ui/card";

interface SignInProps {
  onSwitchToSignUp: () => void;
  onSwitchToForgotPassword: () => void;
}

export const SignIn: React.FC<SignInProps> = ({
  onSwitchToSignUp,
  onSwitchToForgotPassword,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, loading, error, clearError } = useAuth();

  // Clear error when component mounts or when switching views
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    await signIn(email, password);
  };

  const handleGoogleError = (error: string) => {
    // Google sign-in errors are handled by the component itself
    console.error("Google sign-in error:", error);
  };

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Sign in to continue</p>
      </div>

      {/* Google Sign In - Nested Card */}
      <Card className="border-border/50 shadow-sm bg-card">
        <CardContent className="p-0">
          <GoogleSignIn onError={handleGoogleError} />
        </CardContent>
      </Card>

      {/* Divider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-card text-muted-foreground">or</span>
        </div>
      </div>

      {/* Form - Nested Card */}
      <Card className="border-border/50 shadow-sm bg-card">
        <CardContent className="p-4 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="h-9 text-sm"
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-11 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="text-center space-y-2 pt-2">
        <Button
          variant="link"
          onClick={onSwitchToForgotPassword}
          className="text-xs h-auto p-0"
        >
          Forgot password?
        </Button>

        <div className="text-xs text-muted-foreground">
          Don't have an account?{" "}
          <Button
            variant="link"
            onClick={onSwitchToSignUp}
            className="text-xs p-0 h-auto"
          >
            Sign up
          </Button>
        </div>
      </div>
    </div>
  );
};
