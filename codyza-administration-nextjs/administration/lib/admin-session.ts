import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const adminSessionCookieName = "codyza_admin_session";

export type AdminSessionPayload = {
  sub?: string;
  userId?: string;
  role?: string;
  exp?: number;
  email?: string;
};

export type AdminSession = {
  token: string;
  payload: AdminSessionPayload;
};

function decodeBase64UrlSegment(segment: string): string | null {
  try {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

export function decodeAdminSessionToken(token: string): AdminSessionPayload | null {
  const segments = token.split(".");
  if (segments.length < 2) {
    return null;
  }

  const decodedPayload = decodeBase64UrlSegment(segments[1]);
  if (!decodedPayload) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodedPayload) as AdminSessionPayload;
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

export function isAdminSessionExpired(payload: AdminSessionPayload): boolean {
  return typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000);
}

export function isAdminSessionAuthorized(session: AdminSession | null): boolean {
  return Boolean(session && !isAdminSessionExpired(session.payload) && session.payload.role === "admin");
}

export function getAdminSessionFromToken(token: string | null): AdminSession | null {
  if (!token) {
    return null;
  }

  const payload = decodeAdminSessionToken(token);
  if (!payload || isAdminSessionExpired(payload)) {
    return null;
  }

  return {
    token,
    payload,
  };
}

export function getAdminSessionFromRequest(request: NextRequest): AdminSession | null {
  return getAdminSessionFromToken(request.cookies.get(adminSessionCookieName)?.value ?? null);
}

export async function getAdminSessionFromCookies(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  return getAdminSessionFromToken(cookieStore.get(adminSessionCookieName)?.value ?? null);
}

export function getAdminSessionCookieMaxAge(token: string, expiresAt: number | null): number {
  const now = Math.floor(Date.now() / 1000);
  const payload = decodeAdminSessionToken(token);
  const expiration = typeof expiresAt === "number" && Number.isFinite(expiresAt)
    ? expiresAt
    : payload?.exp;

  if (typeof expiration !== "number" || expiration <= now) {
    return 0;
  }

  return expiration - now;
}

export function setAdminSessionCookie(response: NextResponse, token: string, maxAge: number) {
  response.cookies.set(adminSessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(adminSessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}
