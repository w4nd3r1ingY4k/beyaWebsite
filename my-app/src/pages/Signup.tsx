// src/pages/SignUp.tsx
import React, { useState } from "react";
import {
  CognitoUserPool,
  CognitoUserAttribute
} from "amazon-cognito-identity-js";
import { useNavigate } from "react-router-dom";
import { createUser } from "./webApp/services/userService";

const poolData = {
  UserPoolId: "us-east-1_APKoKTm2c",
  ClientId:   "6ejd8pdccudbi6s7j64a7lmgar"
};
const userPool = new CognitoUserPool(poolData);

const SignUp: React.FC = () => {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const attributes = [
      new CognitoUserAttribute({ Name: "email", Value: email })
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

        const sub = result.userSub;  // Cognito’s UUID

        // seed our DynamoDB Users table via Lambda
        try {
          await createUser({ email, sub });
        } catch (svcErr: any) {
          console.error("Error calling createUser:", svcErr);
          // optional: setError("…") or ignore and continue
        }

        // redirect to Confirm page
        navigate("/confirm", {
          state: { username: email, sub }
        });
      }
    );
  };

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto", padding: 24, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2>Create Account</h2>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: 8, margin: "8px 0" }}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: 8, margin: "8px 0" }}
        />

        {error && <div style={{ color: "red", margin: "8px 0" }}>{error}</div>}

        <button type="submit" disabled={loading} style={{ width: "100%", padding: 12, marginTop: 12 }}>
          {loading ? "Creating…" : "Create Account"}
        </button>
      </form>
      <p style={{ marginTop: 12, textAlign: "center" }}>
        Already have an account? <a href="/login">Sign in</a>
      </p>
    </div>
  );
};

export default SignUp;