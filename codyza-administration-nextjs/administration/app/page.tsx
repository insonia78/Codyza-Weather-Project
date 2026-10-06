export const dynamic = "force-dynamic";

import { getAdminDashboard } from "../lib/admin-dashboard";
import { getAdminSessionFromCookies } from "../lib/admin-session";
import { LogoutButton } from "./logout-button";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "No recent traffic";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatBytes(value: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default async function Home() {
  const session = await getAdminSessionFromCookies();
  const { data, error } = await getAdminDashboard(session?.token ?? "");
  const signedInAs = session?.payload.sub || session?.payload.userId || "Administrator";

  return (
    <main className="admin-shell">
      <section className="admin-hero">
        <div>
          <p className="admin-eyebrow">Codyza Weather</p>
          <h1>Administration dashboard</h1>
          <p className="admin-subtext">
            Monitor live API usage, failures, search demand, active users, cache effectiveness, and platform health.
          </p>
        </div>
        <div className="admin-hero__meta">
          <span className="admin-user-chip">Signed in as {signedInAs}</span>
          <span className={`status-pill ${data?.systemHealth.status === "ok" ? "status-pill--ok" : "status-pill--warn"}`}>
            {data?.systemHealth.status === "ok" ? "System healthy" : "Attention needed"}
          </span>
          <span className="admin-subtext">Last request: {formatDateTime(data?.totals.lastRequestAt ?? null)}</span>
          <LogoutButton />
        </div>
      </section>

      {error ? (
        <section className="panel panel--danger">
          <h2>Admin API unavailable</h2>
          <p>{error}</p>
          <p className="admin-subtext">
            Set <code>ADMIN_GATEWAY_BASE_URL</code> and <code>ADMIN_GATEWAY_API_KEY</code> in the admin app environment, then make sure the deployed weather-gateway includes the <code>/admin/dashboard</code> route.
          </p>
        </section>
      ) : null}

      {data ? (
        <>
          <section className="metrics-grid">
            <article className="metric-card">
              <h2>Requests</h2>
              <strong>{data.totals.requestsLast24Hours}</strong>
              <span>Last 24 hours</span>
            </article>
            <article className="metric-card">
              <h2>Failed requests</h2>
              <strong>{data.totals.failedRequestsLast24Hours}</strong>
              <span>4xx/5xx responses in 24 hours</span>
            </article>
            <article className="metric-card">
              <h2>Active users</h2>
              <strong>{data.activeUsers.last24Hours}</strong>
              <span>Unique authenticated users in 24 hours</span>
            </article>
            <article className="metric-card">
              <h2>Average latency</h2>
              <strong>{data.totals.averageDurationMs} ms</strong>
              <span>Across all logged requests</span>
            </article>
          </section>

          <section className="panel-grid">
            <article className="panel">
              <div className="panel__header">
                <div>
                  <p className="admin-eyebrow">Cache performance</p>
                  <h2>Provider cache effectiveness</h2>
                </div>
                <strong>{formatPercent(data.cachePerformance.hitRate)}</strong>
              </div>
              <div className="stats-list">
                <div><span>Hits</span><strong>{data.cachePerformance.hits}</strong></div>
                <div><span>Misses</span><strong>{data.cachePerformance.misses}</strong></div>
                <div><span>Bypasses</span><strong>{data.cachePerformance.bypasses}</strong></div>
                <div><span>Writes</span><strong>{data.cachePerformance.writes}</strong></div>
              </div>
            </article>

            <article className="panel">
              <div className="panel__header">
                <div>
                  <p className="admin-eyebrow">System health</p>
                  <h2>Runtime and dependencies</h2>
                </div>
              </div>
              <div className="stats-list">
                <div><span>Google Weather API key</span><strong>{data.systemHealth.googleWeatherApiConfigured ? "Configured" : "Missing"}</strong></div>
                <div><span>Observability DB URL</span><strong>{data.systemHealth.observabilityDatabaseConfigured ? "Configured" : "Missing"}</strong></div>
                <div><span>Database reachable</span><strong>{data.systemHealth.databaseReachable ? "Yes" : "No"}</strong></div>
                <div><span>Uptime</span><strong>{data.systemHealth.uptimeSeconds}s</strong></div>
                <div><span>RSS memory</span><strong>{formatBytes(data.systemHealth.memoryUsage.rss)}</strong></div>
                <div><span>Heap used</span><strong>{formatBytes(data.systemHealth.memoryUsage.heapUsed)}</strong></div>
              </div>
            </article>
          </section>

          <section className="panel-grid">
            <article className="panel">
              <div className="panel__header">
                <div>
                  <p className="admin-eyebrow">Popular demand</p>
                  <h2>Most searched locations</h2>
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Searches</th>
                    <th>Last searched</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mostSearchedLocations.length ? data.mostSearchedLocations.map((entry) => (
                    <tr key={`${entry.locationLabel}-${entry.lastSearchedAt}`}>
                      <td>{entry.locationLabel}</td>
                      <td>{entry.searchCount}</td>
                      <td>{formatDateTime(entry.lastSearchedAt)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3}>No search history has been persisted yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </article>

            <article className="panel">
              <div className="panel__header">
                <div>
                  <p className="admin-eyebrow">API usage</p>
                  <h2>Busiest endpoints</h2>
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Requests</th>
                    <th>Avg latency</th>
                    <th>Failures</th>
                  </tr>
                </thead>
                <tbody>
                  {data.apiUsage.length ? data.apiUsage.map((entry) => (
                    <tr key={entry.requestPath}>
                      <td>{entry.requestPath}</td>
                      <td>{entry.requestCount}</td>
                      <td>{entry.averageDurationMs} ms</td>
                      <td>{entry.failureCount}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4}>No request logs have been recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </article>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <p className="admin-eyebrow">Failures</p>
                <h2>Recent failed requests</h2>
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {data.failedRequests.length ? data.failedRequests.map((entry, index) => (
                  <tr key={`${entry.requestPath}-${entry.createdAt}-${index}`}>
                    <td>{formatDateTime(entry.createdAt)}</td>
                    <td>{entry.requestMethod} {entry.requestPath}</td>
                    <td>{entry.statusCode}</td>
                    <td>{entry.durationMs} ms</td>
                    <td>{entry.userEmail || "Anonymous"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5}>No failed requests logged yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </main>
  );
}
