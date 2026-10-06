import { NextResponse } from "next/server";

import { getAdminDashboard } from "../../../../lib/admin-dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getAdminDashboard();

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: 502 },
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}
