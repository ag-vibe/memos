import { useStore } from "zustand";
import { useState, useEffect } from "react";
import { auth } from "@/lib/auth";

export function useAuthStore() {
  return useStore(auth.store);
}

export function useIsAuthenticated() {
  return useStore(auth.store, (s) => s.isAuthenticated);
}

export function useSession() {
  return useStore(auth.store, (s) => s.session);
}

export function useIsHydrated() {
  const [hydrated, setHydrated] = useState(() => auth.store.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    return auth.store.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);
  return hydrated;
}

export function signOut() {
  auth.store.getState().clearSession();
}
