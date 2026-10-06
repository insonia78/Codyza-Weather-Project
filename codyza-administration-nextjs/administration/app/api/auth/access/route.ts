import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AccessRequestBody = {
  email?: string;
};

function isAccessRequestBody(value: unknown): value is AccessRequestBody {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isAccessRequestBody(requestBody)) {
    return NextResponse.json({ error: "Request body must include an email." }, { status: 400 });
  }

  const email = typeof requestBody.email === "string" ? requestBody.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
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
    gatewayResponse = await fetch(`${gatewayBaseUrl.replace(/\/+$/, "")}/admin/access`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to reach the admin access gateway." },
      { status: 502 },
    );
  }

  const responseBody = await gatewayResponse.json().catch(() => null) as { error?: string } | null;
  if (!gatewayResponse.ok) {
    return NextResponse.json(
      { error: responseBody?.error || `Admin access lookup failed (${gatewayResponse.status}).` },
      { status: gatewayResponse.status },
    );
  }

  return NextResponse.json(responseBody, { status: 200 });
}
