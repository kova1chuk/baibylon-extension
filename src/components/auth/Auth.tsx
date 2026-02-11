import React, { useState } from "react";
import { SignIn } from "./SignIn";
import { SignUp } from "./SignUp";
import { ForgotPassword } from "./ForgotPassword";
import { ThemeToggle } from "../ThemeToggle";
import { PenIcon } from "../icons";
import { Card, CardContent } from "../ui/card";

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
    <div className="w-96 max-h-[600px] bg-background text-foreground overflow-hidden flex flex-col">
      {}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-gradient-to-r from-card via-card to-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm ring-1 ring-primary/10">
            <PenIcon className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            Vocairo
          </h1>
        </div>
        <ThemeToggle />
      </div>

      {}
      <div className="flex-1 overflow-y-auto p-5 bg-muted/20">
        <Card className="bg-card border-border/50 shadow-lg">
          <CardContent className="p-5">{renderAuthView()}</CardContent>
        </Card>
      </div>
    </div>
  );
};
