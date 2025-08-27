import React from "react";
import { useAuth } from "../../hooks/useAuth";

export const UserProfile: React.FC = () => {
  const { userProfile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!userProfile) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {userProfile.fullName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {userProfile.fullName}
          </p>
          <p className="text-xs text-gray-500">{userProfile.email}</p>
        </div>
      </div>

      <button
        onClick={handleSignOut}
        className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors duration-200"
      >
        Sign out
      </button>
    </div>
  );
};
