import { createAuthClient } from "@ag-vibe/auth";
import { getApiBaseUrl } from "@/lib/api-base-url";

export type { AuthSession } from "@ag-vibe/auth";

export const auth = createAuthClient({
  baseUrl: getApiBaseUrl,
  appId: "in-memo",
});

export function ensureValidAccessToken(forceRefresh = false): Promise<string | null> {
  return auth.ensureValidAccessToken(forceRefresh);
}
