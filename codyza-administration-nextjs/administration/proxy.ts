import { NextResponse, type NextRequest } from "next/server";

import {
  getAdminAuthChallengeHeader,
  isAdminAuthConfigured,
  isAuthorizedAdminRequest,
} from "./lib/admin-auth";

export function proxy(request: NextRequest) {
  if (!isAdminAuthConfigured()) {
    return new NextResponse("Missing ADMIN_USERNAME or ADMIN_PASSWORD environment variable.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const authorizationHeader = request.headers.get("authorization");
  if (isAuthorizedAdminRequest(authorizationHeader)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "WWW-Authenticate": getAdminAuthChallengeHeader(),
    },
  });
}

export const config = {
  matcher: ["/", "/api/admin/:path*"],
};
