// src/pages/Confirm.tsx
import React, { useState, useEffect } from "react";
import { CognitoUserPool, CognitoUser } from "amazon-cognito-identity-js";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { createUser } from "../../services/userService";

const poolData = {
  UserPoolId: "us-east-1_APKoKTm2c",
  ClientId:   "6ejd8pdccudbi6s7j64a7lmgar"
};
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
}, [state]);

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
      <div style={{ maxWidth: 400, margin: "4rem auto", textAlign: "center" }}>
        <h2>✅ Email Confirmed!</h2>
        <p>Your account is now active.</p>
        <button onClick={() => navigate("/login")}>
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 400,
      margin:    "4rem auto",
      padding:   24,
      border:    "1px solid #ccc",
      borderRadius: 8
    }}>
      <h2>Confirm Your Email</h2>
      <form onSubmit={handleConfirm} noValidate>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            disabled
            style={{ width:"100%", padding:8, marginTop:4 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="code">Confirmation Code</label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            required
            style={{ width:"100%", padding:8, marginTop:4 }}
          />
        </div>

        {error && (
          <div style={{ color:"red", margin:"8px 0" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ width:"100%", padding:12 }}
        >
          {loading ? "Verifying…" : "Confirm Account"}
        </button>
      </form>

      <p style={{ marginTop:12, fontSize:"0.9rem" }}>
        Didn’t get a code? <Link to="/signup">Sign Up Again</Link>
      </p>
    </div>
  );
}