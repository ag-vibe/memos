import { createFileRoute, redirect } from "@tanstack/react-router";
import { getToken } from "@/lib/auth";
import { AuthPage } from "@/components/auth/auth-page";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (getToken()) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = Route.useNavigate();
  return <AuthPage onSuccess={() => navigate({ to: "/" })} />;
}
