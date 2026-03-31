import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, Input, Label, TextField } from "@heroui/react";
import { deviceAuthorizeMutation, deviceTokenMutation } from "@/api-gen/@tanstack/react-query.gen";
import { auth } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-base-url";

export function AuthPage({ onSuccess }: { onSuccess?: () => void }) {
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Preparing device login...");
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const authorizeMutation = useMutation(deviceAuthorizeMutation());
  const tokenMutation = useMutation(deviceTokenMutation());

  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const resolvedVerificationUrl = useMemo(() => {
    if (!verificationUrl) return null;
    try {
      return new URL(verificationUrl, apiBase).toString();
    } catch {
      return verificationUrl;
    }
  }, [verificationUrl, apiBase]);

  const displayCode = useMemo(() => userCode ?? "—", [userCode]);
  const isLoading = authorizeMutation.isPending || tokenMutation.isPending;

  useEffect(() => {
    mountedRef.current = true;
    void startDeviceLogin();
    return () => {
      mountedRef.current = false;
      if (pollTimerRef.current) {
        window.clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  async function startDeviceLogin() {
    setError(null);
    setStatus("Requesting device code...");
    try {
      const res = await authorizeMutation.mutateAsync({
        body: {
          clientId: "memos",
        },
      });
      if (!mountedRef.current) return;
      setUserCode(res.userCode);
      setVerificationUrl(res.verificationUriComplete);
      setStatus("Device code ready. Open the verification page.");
      schedulePoll(res.deviceCode, res.interval || 5);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Unable to start device login.");
      setStatus("Failed to request device code.");
    }
  }

  function schedulePoll(code: string, interval: number) {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
    }
    pollTimerRef.current = window.setTimeout(
      () => {
        void pollToken(code, interval);
      },
      Math.max(1, interval) * 1000,
    );
  }

  async function pollToken(code: string, interval: number) {
    try {
      const res = await tokenMutation.mutateAsync({
        body: { deviceCode: code },
      });

      if (res.accessToken && res.refreshToken && res.tokenType) {
        setStatus("Login approved. Redirecting...");
        if (pollTimerRef.current) {
          window.clearTimeout(pollTimerRef.current);
        }
        auth.store.getState().setSession({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          tokenType: res.tokenType,
        });
        onSuccess?.();
        return;
      }

      if (res.error === "slow_down") {
        setStatus(res.errorDescription ?? "Waiting for approval...");
        schedulePoll(code, interval + 2);
        return;
      }

      if (res.error === "expired_token") {
        setStatus("Device code expired. Restarting...");
        void startDeviceLogin();
        return;
      }

      if (res.error === "access_denied") {
        setStatus("Access denied. Restarting...");
        void startDeviceLogin();
        return;
      }

      setStatus(res.errorDescription ?? "Waiting for approval...");
      schedulePoll(code, interval);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Polling failed.");
      schedulePoll(code, interval + 2);
    }
  }

  function handleOpenVerification() {
    if (!resolvedVerificationUrl) return;
    window.open(resolvedVerificationUrl, "_blank", "width=480,height=640");
  }

  return (
    <div
      data-testid="auth-page"
      className="min-h-screen bg-background flex items-center justify-center p-4"
    >
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
            <Card.Title>Continue on another device</Card.Title>
            <Card.Description>
              Open the verification page, sign in, and we will finish here automatically.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              <TextField>
                <Label>User code</Label>
                <Input type="text" value={displayCode} fullWidth readOnly />
              </TextField>

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  isDisabled={!resolvedVerificationUrl}
                  onPress={handleOpenVerification}
                >
                  Open verification page
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  isDisabled={isLoading}
                  onPress={() => void startDeviceLogin()}
                >
                  Refresh code
                </Button>
              </div>
            </div>
          </Card.Content>
          <Card.Footer>
            <p className="text-sm text-center w-full text-foreground/60">{status}</p>
          </Card.Footer>
        </Card>
      </div>
    </div>
  );
}
