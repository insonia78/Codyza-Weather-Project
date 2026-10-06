import { NextResponse, type NextRequest } from "next/server";

import {
  clearAdminSessionCookie,
  getAdminSessionFromRequest,
  isAdminSessionAuthorized,
} from "./lib/admin-session";

export function proxy(request: NextRequest) {
  const session = getAdminSessionFromRequest(request);

  if (isAdminSessionAuthorized(session)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/admin/")) {
    const response = NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
    clearAdminSessionCookie(response);
    return response;
  }

  const loginUrl = new URL("/login", request.url);
  if (request.nextUrl.pathname !== "/") {
    loginUrl.searchParams.set("returnTo", request.nextUrl.pathname);
  }

  const response = NextResponse.redirect(loginUrl);
  clearAdminSessionCookie(response);
  return response;
}

export const config = {
  matcher: ["/", "/api/admin/:path*"],
};
