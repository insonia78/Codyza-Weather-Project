import { NextResponse } from "next/server";

import {
  buildAdminGatewayHeaders,
  getAdminDashboardStreamUrl,
  getAdminGatewayConfig,
} from "../../../../../lib/admin-dashboard";
import { fetchGatewayWithRetry } from "../../../../../lib/gateway-fetch";
import { getAdminSessionFromCookies, isAdminSessionAuthorized } from "../../../../../lib/admin-session";

export const dynamic = "force-dynamic";

function buildStreamHeaders(sourceHeaders: Headers) {
  const headers = new Headers();
  headers.set("Content-Type", sourceHeaders.get("content-type") || "text/event-stream; charset=utf-8");
  headers.set("Cache-Control", "no-cache, no-transform");
  headers.set("Connection", "keep-alive");
  headers.set("X-Accel-Buffering", "no");
  return headers;
}

export async function GET() {
  const session = await getAdminSessionFromCookies();
  if (!session || !isAdminSessionAuthorized(session)) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { gatewayBaseUrl, gatewayApiKey } = getAdminGatewayConfig();
  if (!gatewayApiKey) {
    return NextResponse.json(
      { error: "Missing ADMIN_GATEWAY_API_KEY environment variable." },
      { status: 500 },
    );
  }

  const streamUrl = getAdminDashboardStreamUrl(gatewayBaseUrl);

  let response: Response;
  try {
    response = await fetchGatewayWithRetry(streamUrl, {
      cache: "no-store",
      headers: buildAdminGatewayHeaders(session.token, gatewayApiKey, "text/event-stream"),
      method: "GET",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Admin realtime stream is unavailable." },
      { status: 502 },
    );
  }

  if (!response.ok || !response.body) {
    const streamError = await response.text().catch(() => "");
    return NextResponse.json(
      {
        error: streamError || `Admin realtime stream failed (${response.status} ${response.statusText}).`,
      },
      { status: response.status || 502 },
    );
  }

  return new Response(response.body, {
    status: response.status,
    headers: buildStreamHeaders(response.headers),
  });
}
