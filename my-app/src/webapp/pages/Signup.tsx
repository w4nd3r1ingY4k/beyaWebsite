// src/pages/SignUp.tsx
import React, { useState } from "react";
import {
  CognitoUserPool,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";
import { useNavigate } from "react-router-dom";
import { createUser } from "../services/userService";
import { poolData } from "../utils";

const userPool = new CognitoUserPool(poolData);

const SignUp: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const attributes = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
    ];

    userPool.signUp(
      email,
      password,
      attributes,
      [],
      async (err, result) => {
        setLoading(false);
        if (err || !result) {
          setError(err?.message || JSON.stringify(err));
          return;
        }

        const sub = result.userSub; // Cognito’s UUID

        // seed our DynamoDB Users table via Lambda
        try {
          await createUser({ email, sub });
        } catch (svcErr: any) {
          console.error("Error calling createUser:", svcErr);
          // optional: setError("…") or ignore and continue
        }

        // redirect to Confirm page
        navigate("/confirm", {
          state: { username: email, sub },
        });
      }
    );
  };

  return (
    <div className="max-w-[400px] mx-auto my-8 p-6 border border-gray-300 rounded-lg">
      <h2 className="text-2xl font-semibold mb-4">Create Account</h2>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 my-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 my-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {error && <div className="text-red-500 my-2">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className={`w-full p-3 mt-3 text-white rounded-lg ${
            loading
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "Creating…" : "Create Account"}
        </button>
      </form>
      <p className="mt-3 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <a href="/login" className="text-blue-500 hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
};

export default SignUp;
