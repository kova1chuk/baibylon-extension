import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";

export const UserProfile: React.FC = () => {
  const { userProfile, user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const displayName =
    userProfile?.fullName ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";
  const initials = displayName.charAt(0).toUpperCase();

  if (!user && !userProfile) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-7 w-7">
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 hidden sm:block">
        <p className="text-xs font-medium text-foreground truncate">
          {displayName}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSignOut}
        className="h-7 w-7"
        title="Sign out"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </Button>
    </div>
  );
};
