import { NextResponse } from "next/server";

import { clearAdminSessionCookie, getAdminSessionFromCookies } from "../../../../lib/admin-session";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getAdminSessionFromCookies();
  const gatewayBaseUrl = process.env.ADMIN_GATEWAY_BASE_URL?.trim() || "http://localhost:54321/functions/v1/weather-gateway";
  const gatewayApiKey = process.env.ADMIN_GATEWAY_API_KEY?.trim() || "";

  if (session) {
    const headers = new Headers({
      Authorization: `Bearer ${session.token}`,
    });
    if (gatewayApiKey) {
      headers.set("apikey", gatewayApiKey);
    }

    let revokeResponse: Response;
    try {
      revokeResponse = await fetch(`${gatewayBaseUrl.replace(/\/+$/, "")}/auth/logout`, {
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

    if (!revokeResponse.ok && revokeResponse.status !== 401) {
      const revokeBody = await revokeResponse.json().catch(() => null) as { error?: string } | null;
      return NextResponse.json(
        { error: revokeBody?.error || `Admin logout failed (${revokeResponse.status}).` },
        { status: revokeResponse.status },
      );
    }
  }

  const response = NextResponse.json(
    { ok: true },
    { status: 200 },
  );
  clearAdminSessionCookie(response);
  return response;
}
