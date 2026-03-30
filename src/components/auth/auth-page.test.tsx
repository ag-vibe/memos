import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { AuthPage } from "./auth-page";

const { signInMock, signUpMock, setSessionMock } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  signUpMock: vi.fn(),
  setSessionMock: vi.fn(),
}));

vi.mock("@/api-anclax/sdk.gen", () => ({
  signIn: signInMock,
  signUp: signUpMock,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    store: {
      getState: () => ({
        setSession: setSessionMock,
      }),
    },
  },
}));

describe("AuthPage", () => {
  beforeEach(() => {
    signInMock.mockReset();
    signUpMock.mockReset();
    setSessionMock.mockReset();
  });

  it("renders sign-in mode by default and can switch to sign-up mode", () => {
    const { container } = render(<AuthPage />);

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.getByRole("heading", { name: "Create account" })).toBeTruthy();
    expect(container.querySelector('[data-testid="auth-form"]')).not.toBeNull();
  });

  it("submits credentials and stores the returned session", async () => {
    const onSuccess = vi.fn();
    signInMock.mockResolvedValue({
      data: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        tokenType: "Bearer",
      },
    });

    render(<AuthPage onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "e2e-smoke-user" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "pw-smoke-user" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith({
        body: {
          name: "e2e-smoke-user",
          password: "pw-smoke-user",
        },
      });
    });
    expect(setSessionMock).toHaveBeenCalledWith({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
