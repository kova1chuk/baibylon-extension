import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { GoogleSignIn } from "./GoogleSignIn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { Separator } from "../ui/separator";
import { CheckCircleIcon, MailIcon } from "../icons";
import { Card, CardContent } from "../ui/card";

interface SignUpProps {
  onSwitchToSignIn: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onSwitchToSignIn }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [success, setSuccess] = useState(false);
  const { signUp, loading, error, clearError } = useAuth();

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const result = await signUp(email, password, fullName);
    if (!result.error) {
      setSuccess(true);
    }
  };

  const handleGoogleError = (error: string) => {

    console.error("Google sign-in error:", error);
  };

  if (success) {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl"></div>
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-1 ring-primary/20">
            <CheckCircleIcon className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-semibold">Check your email</h3>
          <p className="text-sm text-muted-foreground">
            We've sent a confirmation link to verify your email.
          </p>
        </div>
        <Button variant="link" onClick={onSwitchToSignIn} className="text-sm h-auto p-0">
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Create account</h2>
        <p className="text-sm text-muted-foreground">Get started with Vocairo</p>
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
              <Label htmlFor="fullName" className="text-xs">Full name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="h-9 text-sm"
              />
            </div>

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
                minLength={6}
                placeholder="Min 6 characters"
                className="h-9 text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="text-center pt-2">
        <div className="text-xs text-muted-foreground">
          Already have an account?{" "}
          <Button
            variant="link"
            onClick={onSwitchToSignIn}
            className="text-xs p-0 h-auto"
          >
            Sign in
          </Button>
        </div>
      </div>
    </div>
  );
};
