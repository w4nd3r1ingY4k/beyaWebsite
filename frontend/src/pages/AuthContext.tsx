// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession
} from "amazon-cognito-identity-js";
import { API_ENDPOINTS } from "../config/api";

const poolData = {
    UserPoolId: "us-east-1_APKoKTm2c",
    ClientId:   "6ejd8pdccudbi6s7j64a7lmgar"
  };const userPool = new CognitoUserPool(poolData);

export interface User {
  email: string;
  userId: string;
  subscriber_email: string;
  createdAt: string;
  lastLoginAt: string;
  companyId: string | null;
  timezone: string | null;
  displayName: string | null;
  connectedAccounts: Record<string, string>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// helper to fetch your Dynamo record
async function fetchUserRecord(sub: string): Promise<User> {
  const res = await fetch(`${API_ENDPOINTS.GET_USER}/?userId=${sub}`);
  if (!res.ok) throw new Error("Could not load user profile");
  return await res.json();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // on mount check for existing token & hydrate
  useEffect(() => {
    const token = localStorage.getItem("id_token");
    if (!token) return void setLoading(false);

    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) return void setLoading(false);

    cognitoUser.getSession(async (err: any, session: any) => {
      if (!err && session.isValid()) {
        const payload = session.getIdToken().payload;
        const email   = payload.email as string;
        const sub     = payload.sub as string;

        try {
          const profile = await fetchUserRecord(sub);
          setUser(profile);
        } catch (e) {
          console.error(e);
          // fallback to minimal
          setUser({ email, userId: sub, subscriber_email: email, createdAt: "", lastLoginAt: "", companyId: null, timezone: null, displayName: null, connectedAccounts: {} });
        }
      }
      setLoading(false);
    });
  }, []);

  const login = (email: string, password: string) =>
    new Promise<void>((resolve, reject) => {
      setLoading(true);
      const authDetails = new AuthenticationDetails({ Username: email, Password: password });
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: async (session) => {
          localStorage.setItem("id_token", session.getIdToken().getJwtToken());
          const payload = session.getIdToken().payload;
          const email   = payload.email as string;
          const sub     = payload.sub as string;

          try {
            const profile = await fetchUserRecord(sub);
            setUser(profile);
            setLoading(false);
            resolve();
          } catch (e) {
            console.log("User profile not found, creating new record...");
            // Create user record if it doesn't exist
            try {
              const createResponse = await fetch(API_ENDPOINTS.CREATE_USER, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'create',
                  email: email,
                  sub: sub,
                  displayName: email.split('@')[0],
                  connectedAccounts: {}
                })
              });
              
              if (createResponse.ok) {
                // Now try to fetch the profile again
                const profile = await fetchUserRecord(sub);
                setUser(profile);
              } else {
                // Fallback to minimal user object
                setUser({ email, userId: sub, subscriber_email: email, createdAt: "", lastLoginAt: "", companyId: null, timezone: null, displayName: null, connectedAccounts: {} });
              }
            } catch (createError) {
              console.error("Failed to create user record:", createError);
              // Fallback to minimal user object
              setUser({ email, userId: sub, subscriber_email: email, createdAt: "", lastLoginAt: "", companyId: null, timezone: null, displayName: null, connectedAccounts: {} });
            }
            setLoading(false);
            resolve();
          }
        },
        onFailure: err => {
          setLoading(false);
          reject(err);
        }
      });
    });

  const logout = () => {
    setUser(null);
    localStorage.removeItem("id_token");
    userPool.getCurrentUser()?.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}