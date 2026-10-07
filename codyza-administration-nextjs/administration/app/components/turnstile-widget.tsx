"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove?: (widgetId: string) => void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Cloudflare Turnstile.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Failed to load Cloudflare Turnstile.")), {
      once: true,
    });
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

type TurnstileWidgetProps = {
  siteKey: string;
  onTokenChange: (token: string) => void;
};

export function TurnstileWidget({ siteKey, onTokenChange }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const siteKeyMissing = !siteKey.trim();

  useEffect(() => {
    onTokenChange("");
  }, [onTokenChange]);

  useEffect(() => {
    if (siteKeyMissing) {
      return;
    }

    let cancelled = false;

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) {
          return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token) => onTokenChange(token),
          "expired-callback": () => onTokenChange(""),
          "error-callback": () => onTokenChange(""),
        });
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load Cloudflare Turnstile.");
          onTokenChange("");
        }
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, siteKeyMissing, onTokenChange]);

  return (
    <div className="auth-turnstile">
      <span className="auth-turnstile__label">Security check</span>
      {siteKeyMissing
        ? <p className="auth-error">Cloudflare Turnstile is not configured for administrator sign-in.</p>
        : error
          ? <p className="auth-error">{error}</p>
          : <div ref={containerRef} className="auth-turnstile__widget" />}
    </div>
  );
}
