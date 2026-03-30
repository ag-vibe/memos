import { createAuthClient } from "@ag-vibe/auth";
import { getApiBaseUrl } from "@/lib/api-base-url";

export type { AuthSession } from "@ag-vibe/auth";

export const auth = createAuthClient({
  baseUrl: getApiBaseUrl,
  appId: "in-memo",
});

export function getToken(): string | null {
  const { session } = auth.store.getState();
  return session?.accessToken ?? null;
}

export function setAuthSession(session: {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
}): void {
  auth.store.getState().setSession(session);
}

export function clearToken(): void {
  auth.store.getState().clearSession();
}

export function subscribeAuth(fn: () => void): () => void {
  return auth.store.subscribe((_state, prev) => {
    const cur = auth.store.getState();
    if (prev.isAuthenticated !== cur.isAuthenticated) fn();
  });
}

export function ensureValidAccessToken(forceRefresh = false): Promise<string | null> {
  return auth.ensureValidAccessToken(forceRefresh);
}

export function waitForHydration(): Promise<void> {
  if (auth.store.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = auth.store.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
