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
  export async function getUserById(userId: string) {
    const res = await fetch(
      `https://2p6sfcnq3rawezlsyhhrbeal2y0uejjp.lambda-url.us-east-1.on.aws/?userId=${userId}`,
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