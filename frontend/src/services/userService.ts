// src/services/userService.ts

import { API_ENDPOINTS } from '../config/api';

export interface CreateUserPayload {
    email: string;
    sub?: string;
    companyId?: string;
  }

  export interface UpdateUserPayload {
    userId: string;
    displayName?: string;
    timezone?: string;
    companyId?: string;
    connectedAccounts?: any;
    updateLastLogin?: boolean;
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
          companyId: payload.companyId,
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

  export async function updateUser(payload: UpdateUserPayload) {
    const res = await fetch(
      API_ENDPOINTS.UPDATE_USER,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      throw new Error(`updateUser failed: ${res.status}`);
    }
    return res.json();
  }