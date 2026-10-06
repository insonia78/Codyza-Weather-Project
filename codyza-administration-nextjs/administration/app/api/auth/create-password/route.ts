import { NextResponse } from "next/server";

import { getAdminSessionCookieMaxAge, setAdminSessionCookie } from "../../../../lib/admin-session";

export const dynamic = "force-dynamic";

type CreatePasswordRequestBody = {
  email?: string;
  password?: string;
};

type GatewayCreatePasswordResponse = {
  token?: string;
  tokenRecord?: {
    expiresAt?: number;
  } | null;
  error?: string;
};

function isCreatePasswordRequestBody(value: unknown): value is CreatePasswordRequestBody {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isCreatePasswordRequestBody(requestBody)) {
    return NextResponse.json({ error: "Request body must include email and password." }, { status: 400 });
  }

  const email = typeof requestBody.email === "string" ? requestBody.email.trim() : "";
  const password = typeof requestBody.password === "string" ? requestBody.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const gatewayBaseUrl = process.env.ADMIN_GATEWAY_BASE_URL?.trim() || "http://localhost:54321/functions/v1/weather-gateway";
  const gatewayApiKey = process.env.ADMIN_GATEWAY_API_KEY?.trim() || "";
  const headers = new Headers({
    "Content-Type": "application/json",
  });
  if (gatewayApiKey) {
    headers.set("apikey", gatewayApiKey);
  }

  let gatewayResponse: Response;
  try {
    gatewayResponse = await fetch(`${gatewayBaseUrl.replace(/\/+$/, "")}/admin/create-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to reach the admin password setup gateway." },
      { status: 502 },
    );
  }

  const responseBody = await gatewayResponse.json().catch(() => null) as GatewayCreatePasswordResponse | null;
  if (!gatewayResponse.ok) {
    return NextResponse.json(
      { error: responseBody?.error || `Admin password setup failed (${gatewayResponse.status}).` },
      { status: gatewayResponse.status },
    );
  }

  const token = typeof responseBody?.token === "string" ? responseBody.token : "";
  if (!token) {
    return NextResponse.json({ error: "Admin password setup did not return a token." }, { status: 502 });
  }

  const maxAge = getAdminSessionCookieMaxAge(token, responseBody?.tokenRecord?.expiresAt ?? null);
  if (maxAge <= 0) {
    return NextResponse.json({ error: "Admin password setup returned an expired token." }, { status: 502 });
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  setAdminSessionCookie(response, token, maxAge);
  return response;
}
