import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { GoogleSignIn } from "./GoogleSignIn";

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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
        <p className="text-gray-600 mt-2">Sign in to your WordFlow account</p>
      </div>

      {/* Google Sign In */}
      <GoogleSignIn onError={handleGoogleError} />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors duration-200"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="text-center space-y-3">
        <button
          onClick={onSwitchToForgotPassword}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Forgot your password?
        </button>

        <div className="text-sm text-gray-600">
          Don't have an account?{" "}
          <button
            onClick={onSwitchToSignUp}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
};
