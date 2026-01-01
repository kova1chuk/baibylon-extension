import React, { useState } from "react";
import { SignIn } from "./SignIn";
import { SignUp } from "./SignUp";
import { ForgotPassword } from "./ForgotPassword";
import { ThemeToggle } from "../ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

type AuthView = "signin" | "signup" | "forgot-password";

export const Auth: React.FC = () => {
  const [currentView, setCurrentView] = useState<AuthView>("signin");

  const renderAuthView = () => {
    switch (currentView) {
      case "signin":
        return (
          <SignIn
            onSwitchToSignUp={() => setCurrentView("signup")}
            onSwitchToForgotPassword={() => setCurrentView("forgot-password")}
          />
        );
      case "signup":
        return <SignUp onSwitchToSignIn={() => setCurrentView("signin")} />;
      case "forgot-password":
        return (
          <ForgotPassword onSwitchToSignIn={() => setCurrentView("signin")} />
        );
      default:
        return (
          <SignIn
            onSwitchToSignUp={() => setCurrentView("signup")}
            onSwitchToForgotPassword={() => setCurrentView("forgot-password")}
          />
        );
    }
  };

  return (
    <div className="w-96 min-h-[500px] bg-background text-foreground overflow-hidden flex flex-col">
      {/* Theme Toggle */}
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>

      {/* Header */}
      <Card className="rounded-none border-x-0 border-t-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardHeader className="text-center pb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-foreground/20 rounded-xl mb-3">
            <span className="text-xl">✍️</span>
          </div>
          <CardTitle className="text-xl mb-1 text-primary-foreground">Baibylon</CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Sign in to continue
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Auth Content */}
      <div className="p-6 flex-1 overflow-y-auto">{renderAuthView()}</div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border bg-card mt-auto">
        <div className="text-center text-xs text-muted-foreground">
          <span className="font-medium">
            Secure authentication powered by Supabase
          </span>
        </div>
      </div>
    </div>
  );
};
