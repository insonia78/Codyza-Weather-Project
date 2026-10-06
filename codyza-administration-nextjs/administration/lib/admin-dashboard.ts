export type AdminDashboard = {
  totals: {
    requestsLast24Hours: number;
    failedRequestsLast24Hours: number;
    averageDurationMs: number;
    lastRequestAt: string | null;
  };
  activeUsers: {
    last24Hours: number;
  };
  cachePerformance: {
    hits: number;
    misses: number;
    bypasses: number;
    writes: number;
    hitRate: number;
  };
  apiUsage: Array<{
    requestPath: string;
    requestCount: number;
    averageDurationMs: number;
    failureCount: number;
  }>;
  failedRequests: Array<{
    requestPath: string;
    requestMethod: string;
    statusCode: number;
    durationMs: number;
    userEmail: string | null;
    createdAt: string;
  }>;
  mostSearchedLocations: Array<{
    locationLabel: string;
    searchCount: number;
    lastSearchedAt: string;
  }>;
  systemHealth: {
    status: string;
    uptimeSeconds: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    googleWeatherApiConfigured: boolean;
    observabilityDatabaseConfigured: boolean;
    databaseReachable: boolean;
  };
};

export async function getAdminDashboard(): Promise<{ data: AdminDashboard | null; error: string | null }> {
  const gatewayBaseUrl = process.env.ADMIN_GATEWAY_BASE_URL?.trim() || "http://localhost:54321/functions/v1/weather-gateway";
  const gatewaySecret = process.env.ADMIN_DASHBOARD_GATEWAY_SECRET?.trim() || "";
  const gatewayApiKey = process.env.ADMIN_GATEWAY_API_KEY?.trim() || "";
  const dashboardUrl = `${gatewayBaseUrl.replace(/\/+$/, "")}/admin/dashboard`;

  if (!gatewaySecret) {
    return {
      data: null,
      error: "Missing ADMIN_DASHBOARD_GATEWAY_SECRET environment variable.",
    };
  }

  try {
    const headers = new Headers({
      "x-admin-dashboard-secret": gatewaySecret,
    });

    if (gatewayApiKey) {
      headers.set("apikey", gatewayApiKey);
    }

    const response = await fetch(dashboardUrl, {
      cache: "no-store",
      headers,
    });
    if (!response.ok) {
      return {
        data: null,
        error: `Admin API request failed (${response.status} ${response.statusText}).`,
      };
    }

    return {
      data: (await response.json()) as AdminDashboard,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
