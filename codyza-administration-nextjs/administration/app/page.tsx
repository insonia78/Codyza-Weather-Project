export const dynamic = "force-dynamic";

import { AdminDashboardLive } from "./components/admin-dashboard-live";
import { getAdminDashboard } from "../lib/admin-dashboard";
import { getAdminSessionFromCookies } from "../lib/admin-session";

export default async function Home() {
  const session = await getAdminSessionFromCookies();
  const { data, error } = await getAdminDashboard(session?.token ?? "");
  const signedInAs = session?.payload.sub || session?.payload.userId || "Administrator";

  return (
    <AdminDashboardLive
      initialData={data}
      initialError={error}
      signedInAs={signedInAs}
    />
  );
}
