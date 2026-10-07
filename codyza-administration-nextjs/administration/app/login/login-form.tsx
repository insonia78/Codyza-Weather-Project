"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { TurnstileWidget } from "../components/turnstile-widget";

type AccessResponse = {
  email: string;
  passwordSetupRequired: boolean;
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [step, setStep] = useState<"email" | "password">(initialEmail ? "password" : "email");
  const [turnstileToken, setTurnstileToken] = useState("");
  const handleTurnstileTokenChange = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/auth/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const body = await response.json().catch(() => null) as AccessResponse | { error?: string } | null;
      if (!response.ok) {
        throw new Error(body && "error" in body && typeof body.error === "string" ? body.error : "Unable to continue.");
      }

      if (body && "passwordSetupRequired" in body && body.passwordSetupRequired) {
        router.replace(`/create-password?email=${encodeURIComponent(email.trim())}`);
        return;
      }

      setStep("password");
      setPassword("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to continue.");
    } finally {
      setIsPending(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!turnstileToken) {
      setError("Complete the security check before signing in.");
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, turnstileToken }),
      });

      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(body && typeof body.error === "string" ? body.error : "Unable to sign in.");
      }

      const returnTo = searchParams.get("returnTo");
      router.replace(returnTo && returnTo.startsWith("/") ? returnTo : "/");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setIsPending(false);
    }
  }

  if (step === "password") {
    return (
      <form className="auth-form" onSubmit={handlePasswordSubmit}>
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            readOnly
          />
        </div>
        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>
        <TurnstileWidget
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
          onTokenChange={handleTurnstileTokenChange}
        />
        {error ? <div className="auth-error">{error}</div> : null}
        <div className="auth-actions">
          <button
            className="admin-button admin-button--secondary"
            type="button"
            onClick={() => {
              setStep("email");
              setPassword("");
            }}
            disabled={isPending}
          >
            Change email
          </button>
          <button className="admin-button admin-button--primary" type="submit" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleEmailSubmit}>
      <div className="auth-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      {error ? <div className="auth-error">{error}</div> : null}
      <button className="admin-button admin-button--primary" type="submit" disabled={isPending}>
        {isPending ? "Checking account..." : "Continue"}
      </button>
    </form>
  );
}
