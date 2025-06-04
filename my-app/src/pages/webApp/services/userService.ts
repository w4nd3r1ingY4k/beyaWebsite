// src/services/userService.ts

export interface CreateUserPayload {
    email: string;
    sub?: string;
  }
  
  export async function createUser(payload: CreateUserPayload) {
    const res = await fetch(
      "https://qfk6yjyzg6utzok6gpels4cyhy0vhrmg.lambda-url.us-east-1.on.aws/",
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