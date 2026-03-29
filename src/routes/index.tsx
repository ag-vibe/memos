import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useIsAuthenticated } from "@/lib/auth-store";
import { auth } from "@/lib/auth";
import { MemosPage } from "@/components/memo/memos-page";
import { AuthPage } from "@/components/auth/auth-page";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const [ready, setReady] = useState(false);
  const isAuthenticated = useIsAuthenticated();

  useEffect(() => {
    if (auth.store.persist.hasHydrated()) {
      setReady(true);
    } else {
      const unsub = auth.store.persist.onFinishHydration(() => setReady(true));
      return unsub;
    }
  }, []);

  if (!ready) return null;
  return isAuthenticated ? <MemosPage /> : <AuthPage />;
}
