// src/services/userService.ts

import { API_ENDPOINTS } from '../config/api';

export interface CreateUserPayload {
    email: string;
    sub?: string;
  }
  
  export async function createUser(payload: CreateUserPayload) {
    const res = await fetch(
      API_ENDPOINTS.CREATE_USER,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          email: payload.email,
          sub: payload.sub,
          displayName: payload.email.split('@')[0],
          connectedAccounts: {}
        }),
      }
    );
    if (!res.ok) {
      throw new Error(`createUser failed: ${res.status}`);
    }
    return res.json() as Promise<{ userId: string }>;
  }
  
  export async function getUserById(userId: string) {
    const res = await fetch(
      `${API_ENDPOINTS.GET_USER}/?userId=${userId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    if (!res.ok) {
      throw new Error(`getUserById failed: ${res.status}`);
    }
    return res.json();
  }