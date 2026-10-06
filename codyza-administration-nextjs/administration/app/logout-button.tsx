"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Logout failed." }));
        throw new Error(typeof body.error === "string" ? body.error : "Logout failed.");
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Logout failed.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      className="admin-button admin-button--secondary"
      type="button"
      onClick={handleLogout}
      disabled={isPending}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
