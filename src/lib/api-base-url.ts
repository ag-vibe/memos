const DEFAULT_API_BASE_URL = "https://allinone.wibus.ren/api/v1";
const STORAGE_KEY = "in-memo.api-base-url";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(STORAGE_KEY)?.trim();
    if (stored) return stored;
  }
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured;
  return DEFAULT_API_BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  if (typeof window === "undefined") return;
  if (url.trim()) {
    window.localStorage.setItem(STORAGE_KEY, url.trim());
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function getDefaultApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL?.trim() ?? DEFAULT_API_BASE_URL;
}
