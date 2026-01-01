import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { GoogleSignIn } from "./GoogleSignIn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { Separator } from "../ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

interface SignUpProps {
  onSwitchToSignIn: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onSwitchToSignIn }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [success, setSuccess] = useState(false);
  const { signUp, loading, error, clearError } = useAuth();

  // Clear error when component mounts or when switching views
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
    // Google sign-in errors are handled by the component itself
    console.error("Google sign-in error:", error);
  };

  if (success) {
    return (
      <Card>
        <CardContent className="text-center space-y-4 pt-6">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">✅</span>
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We've sent you a confirmation link to verify your email address.
          </CardDescription>
          <Button variant="link" onClick={onSwitchToSignIn}>
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          Create your account
        </h2>
        <p className="text-muted-foreground mt-2">
          Join WordFlow to start processing text with AI
        </p>
      </div>

      {/* Google Sign In */}
      <GoogleSignIn onError={handleGoogleError} />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-background text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Create a password (min 6 characters)"
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <div className="text-center">
        <div className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Button
            variant="link"
            onClick={onSwitchToSignIn}
            className="text-sm p-0 h-auto"
          >
            Sign in
          </Button>
        </div>
      </div>
    </div>
  );
};
