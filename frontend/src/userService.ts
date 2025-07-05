// src/services/userService.ts

export interface CreateUserPayload {
    email: string;
    sub?: string;
  }
  
  const LAMBDA_HANDLER = process.env.REACT_APP_LAMBDA_HANDLER;
  
  export async function createUser(payload: CreateUserPayload) {
    const res = await fetch(
      LAMBDA_HANDLER!,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      throw new Error(`createUser failed: ${res.status}`);
    }
    return res.json() as Promise<{ userId: string }>;
  }