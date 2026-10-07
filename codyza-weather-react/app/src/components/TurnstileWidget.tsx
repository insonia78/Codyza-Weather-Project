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
      existingScript.addEventListener("error", () => reject(new Error("Failed to load the Cloudflare Turnstile challenge.")), {
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
    script.addEventListener("error", () => reject(new Error("Failed to load the Cloudflare Turnstile challenge.")), {
      once: true,
    });
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

type TurnstileWidgetProps = {
  siteKey: string;
  onTokenChange: (token: string) => void;
  containerClassName?: string;
  warningClassName?: string;
};

export function TurnstileWidget({
  siteKey,
  onTokenChange,
  containerClassName,
  warningClassName,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    onTokenChange("");
  }, [onTokenChange]);

  useEffect(() => {
    if (!siteKey.trim()) {
      setLoadError("Cloudflare Turnstile is not configured for this sign-in form.");
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
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load the Cloudflare Turnstile challenge.");
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
  }, [siteKey, onTokenChange]);

  if (loadError) {
    return <p className={warningClassName}>{loadError}</p>;
  }

  return <div ref={containerRef} className={containerClassName} />;
}
