// src/pages/Confirm.tsx
import React, { useEffect, useState } from "react";
import { CognitoUserPool, CognitoUser } from "amazon-cognito-identity-js";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { createUser } from "../services/userService";
import { poolData } from "../utils";

const userPool = new CognitoUserPool(poolData);

type LocationState = {
  username: string;
  sub:      string;
};

export default function Confirm() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: LocationState };

  const [email,   setEmail]   = useState("");
  const [code,    setCode]    = useState("");
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  // Redirect back if someone hits this page with no state
  useEffect(() => {
    if (!state?.username || !state?.sub) {
      navigate("/signup", { replace: true });
    } else {
      setEmail(state.username);
    }
  }, [state, navigate]);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cognitoUser = new CognitoUser({
      Username: state!.username,
      Pool:     userPool
    });

    cognitoUser.confirmRegistration(code, true, async (err) => {
      setLoading(false);

      if (err) {
        return setError(err.message || JSON.stringify(err));
      }

      // now that Cognito has confirmed, seed your Users table
      try {
        await createUser({
          email: state!.username,
          sub:   state!.sub
        });
      } catch (svcErr: any) {
        console.error("createUser error:", svcErr);
        // you can surface an error here if you like
      }

      setDone(true);
    });
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <h2 className="text-2xl font-semibold mb-4">✅ Email Confirmed!</h2>
        <p className="mb-6 text-gray-700">Your account is now active.</p>
        <button
          onClick={() => navigate("/login")}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 border border-gray-300 rounded-lg">
      <h2 className="text-2xl font-semibold mb-6">Confirm Your Email</h2>
      <form onSubmit={handleConfirm} noValidate>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            disabled
            className="w-full mt-2 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-100"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Confirmation Code
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="w-full mt-2 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {error && (
          <div className="text-red-500 mb-4">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 text-white rounded-lg ${
            loading
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Verifying…" : "Confirm Account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Didn’t get a code?{" "}
        <Link to="/signup" className="text-blue-500 hover:underline">
          Sign Up Again
        </Link>
      </p>
    </div>
  );
}
