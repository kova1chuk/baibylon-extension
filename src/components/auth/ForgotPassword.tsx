import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

interface ForgotPasswordProps {
  onSwitchToSignIn: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onSwitchToSignIn,
}) => {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const { resetPassword, loading, error, clearError } = useAuth();

  // Clear error when component mounts or when switching views
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const result = await resetPassword(email);
    if (!result.error) {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="text-center space-y-4 pt-6">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">📧</span>
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We've sent you a password reset link. Please check your email and
            follow the instructions.
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
          Reset your password
        </h2>
        <p className="text-muted-foreground mt-2">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <div className="text-center">
        <Button
          variant="link"
          onClick={onSwitchToSignIn}
          className="text-sm"
        >
          Back to sign in
        </Button>
      </div>
    </div>
  );
};
