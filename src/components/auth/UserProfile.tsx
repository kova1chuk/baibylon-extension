import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";

export const UserProfile: React.FC = () => {
  const { userProfile, user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  // Always show user profile if authenticated, even if userProfile is null
  // Fallback to user data if userProfile is not available
  const displayName = userProfile?.fullName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const displayEmail = userProfile?.email || user?.email || "";
  const initials = displayName.charAt(0).toUpperCase();

  if (!user && !userProfile) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3 flex-1 min-w-0">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {displayName}
        </p>
        {displayEmail && (
          <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="flex-shrink-0"
      >
        Sign out
      </Button>
    </div>
  );
};
