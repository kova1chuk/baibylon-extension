import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";

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
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-2xl">📧</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
        <p className="text-gray-600">
          We've sent you a password reset link. Please check your email and
          follow the instructions.
        </p>
        <button
          onClick={onSwitchToSignIn}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Reset your password
        </h2>
        <p className="text-gray-600 mt-2">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors duration-200"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={onSwitchToSignIn}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
};
