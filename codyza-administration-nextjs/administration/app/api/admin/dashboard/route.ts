import { NextResponse } from "next/server";

import { getAdminDashboard } from "../../../../lib/admin-dashboard";
import { getAdminSessionFromCookies, isAdminSessionAuthorized } from "../../../../lib/admin-session";

export const dynamic = "force-dynamic";

async function handleDashboardRequest() {
  const session = await getAdminSessionFromCookies();
  if (!session || !isAdminSessionAuthorized(session)) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const result = await getAdminDashboard(session.token);

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: 502 },
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}

export async function GET() {
  return handleDashboardRequest();
}

export async function POST() {
  return handleDashboardRequest();
}
