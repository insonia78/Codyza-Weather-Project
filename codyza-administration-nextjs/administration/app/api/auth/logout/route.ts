import { NextResponse } from "next/server";

import { fetchGatewayWithRetry } from "../../../../lib/gateway-fetch";
import { clearAdminSessionCookie, getAdminSessionFromCookies } from "../../../../lib/admin-session";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getAdminSessionFromCookies();
  const gatewayBaseUrl = process.env.ADMIN_GATEWAY_BASE_URL?.trim() || "http://localhost:54321/functions/v1/weather-gateway";
  const gatewayApiKey = process.env.ADMIN_GATEWAY_API_KEY?.trim() || "";
  let logoutWarning: string | null = null;

  if (session) {
    const headers = new Headers({
      Authorization: `Bearer ${session.token}`,
    });
    if (gatewayApiKey) {
      headers.set("apikey", gatewayApiKey);
    }

    let revokeResponse: Response;
    try {
      revokeResponse = await fetchGatewayWithRetry(`${gatewayBaseUrl.replace(/\/+$/, "")}/auth/logout`, {
        method: "POST",
        headers,
        cache: "no-store",
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Unable to reach the logout gateway.",
        },
        { status: 502 },
      );
    }

    if (!revokeResponse.ok && ![400, 401, 404].includes(revokeResponse.status)) {
      const revokeBody = await revokeResponse.json().catch(() => null) as { error?: string } | null;
      return NextResponse.json(
        { error: revokeBody?.error || `Admin logout failed (${revokeResponse.status}).` },
        { status: revokeResponse.status },
      );
    }

    if (!revokeResponse.ok) {
      const revokeBody = await revokeResponse.json().catch(() => null) as { error?: string } | null;
      logoutWarning = revokeBody?.error || `Admin logout revoke returned ${revokeResponse.status}.`;
      console.warn("[admin-logout] continuing after non-fatal revoke failure", {
        status: revokeResponse.status,
        warning: logoutWarning,
      });
    }
  }

  const response = NextResponse.json(
    logoutWarning ? { ok: true, warning: logoutWarning } : { ok: true },
    { status: 200 },
  );
  clearAdminSessionCookie(response);
  return response;
}
