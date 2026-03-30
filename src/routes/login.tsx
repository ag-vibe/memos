import { createFileRoute, redirect } from "@tanstack/react-router";
import { getToken, waitForHydration } from "@/lib/auth";
import { AuthPage } from "@/components/auth/auth-page";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    await waitForHydration();
    if (getToken()) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = Route.useNavigate();
  return <AuthPage onSuccess={() => navigate({ to: "/" })} />;
}
