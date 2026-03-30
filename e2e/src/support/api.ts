import { e2eEnv } from "./env.js";

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface E2EUser {
  name: string;
  password: string;
}

export function uniqueUser(prefix: string): E2EUser {
  const timestamp = Date.now();
  const suffix = Math.random().toString(36).slice(2, 8);
  return {
    name: `e2e-${prefix}-${timestamp}-${suffix}`,
    password: `pw-${timestamp}-${suffix}`,
  };
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

async function authRequest(
  path: "/auth/sign-in" | "/auth/sign-up",
  user: E2EUser,
): Promise<AuthSession> {
  const response = await fetch(`${e2eEnv.apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  if (!response.ok) {
    throw new Error(`Auth request failed for ${path}: ${response.status}`);
  }

  return (await parseJson(response)) as AuthSession;
}

export async function signUp(user: E2EUser): Promise<AuthSession> {
  return authRequest("/auth/sign-up", user);
}

export async function signIn(user: E2EUser): Promise<AuthSession> {
  return authRequest("/auth/sign-in", user);
}
