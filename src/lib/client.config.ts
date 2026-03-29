import type { Client } from "@/api-gen/client";
import type { CreateClientConfig } from "@/api-gen/client.gen";
import { ensureValidAccessToken, auth } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-base-url";

export function installAuthInterceptors(...clients: Client[]): void {
  auth.applyTo(clients);
}

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: getApiBaseUrl(),
  auth: async (scheme) => {
    if (scheme.scheme === "bearer") {
      return (await ensureValidAccessToken()) ?? undefined;
    }
    return undefined;
  },
});
