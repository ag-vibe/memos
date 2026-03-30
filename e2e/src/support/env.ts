const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:2910/api/v1";

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() !== "false";
}

export const e2eEnv = {
  baseUrl: process.env.BASE_URL ?? DEFAULT_BASE_URL,
  apiBaseUrl: process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL,
  headless: toBool(process.env.HEADLESS, true),
  slowMo: Number(process.env.SLOW_MO ?? "0"),
  defaultTimeoutMs: Number(process.env.E2E_TIMEOUT_MS ?? "15000"),
};
