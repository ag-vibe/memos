import { useState } from "react";
import { Button, Card, Input, Label, TextField } from "@heroui/react";
import { signIn, signUp } from "@/api-anclax/sdk.gen";
import { auth } from "@/lib/auth";

type AuthMode = "signin" | "signup";

export function AuthPage({ onSuccess }: { onSuccess?: () => void }) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const fn = mode === "signin" ? signIn : signUp;
      const res = await fn({ body: { name, password } });
      if (res.data) {
        auth.store.getState().setSession({
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
          tokenType: res.data.tokenType,
        });
        onSuccess?.();
      } else {
        setError(mode === "signin" ? "Invalid credentials." : "Username already taken.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background texture */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <img src="/logo512.png" alt="in-memo" className="w-10 h-10 rounded-xl" />
          <span className="text-xl font-semibold tracking-tight text-foreground">in-memo</span>
        </div>

        <Card>
          <Card.Header>
            <Card.Title>{mode === "signin" ? "Welcome back" : "Create account"}</Card.Title>
            <Card.Description>
              {mode === "signin"
                ? "Sign in to your account to continue"
                : "Start capturing your thoughts today"}
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <form onSubmit={handleSubmit} className="space-y-4">
              <TextField isRequired>
                <Label>Username</Label>
                <Input
                  type="text"
                  placeholder="your-username"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete={mode === "signin" ? "username" : "new-username"}
                  fullWidth
                />
              </TextField>

              <TextField isRequired>
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  fullWidth
                />
              </TextField>

              {error && <p className="text-sm text-danger">{error}</p>}

              <Button type="submit" variant="primary" fullWidth isPending={isPending}>
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
          </Card.Content>
          <Card.Footer>
            <p className="text-sm text-center w-full text-foreground/60">
              {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="text-accent font-medium hover:underline"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                }}
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </Card.Footer>
        </Card>
      </div>
    </div>
  );
}
