import { fetchGatewayWithRetry } from "./gateway-fetch";

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

export type AdminDashboardStreamPayload = {
  dashboard: AdminDashboard;
  generatedAt: string;
};

export function getAdminGatewayConfig() {
  return {
    gatewayBaseUrl: process.env.ADMIN_GATEWAY_BASE_URL?.trim() || "http://localhost:54321/functions/v1/weather-gateway",
    gatewayApiKey: process.env.ADMIN_GATEWAY_API_KEY?.trim() || "",
  };
}

export function getAdminDashboardUrl(gatewayBaseUrl: string): string {
  return `${gatewayBaseUrl.replace(/\/+$/, "")}/admin/dashboard`;
}

export function getAdminDashboardStreamUrl(gatewayBaseUrl: string): string {
  return `${gatewayBaseUrl.replace(/\/+$/, "")}/admin/dashboard/stream`;
}

export function buildAdminGatewayHeaders(token: string, gatewayApiKey: string, accept?: string) {
  const headers = new Headers({
    apikey: gatewayApiKey,
  });
  headers.set("Authorization", "Bearer ".concat(token));

  if (accept) {
    headers.set("Accept", accept);
  }

  return headers;
}

export async function getAdminDashboard(token: string): Promise<{ data: AdminDashboard | null; error: string | null }> {
  const { gatewayBaseUrl, gatewayApiKey } = getAdminGatewayConfig();
  const dashboardUrl = getAdminDashboardUrl(gatewayBaseUrl);

  if (!token) {
    return {
      data: null,
      error: "Missing admin session token.",
    };
  }

  if (!gatewayApiKey) {
    return {
      data: null,
      error: "Missing ADMIN_GATEWAY_API_KEY environment variable.",
    };
  }

  try {
    const response = await fetchGatewayWithRetry(dashboardUrl, {
      cache: "no-store",
      headers: buildAdminGatewayHeaders(token, gatewayApiKey),
      method: "POST",
    });
    if (!response.ok) {
      if (response.status === 404) {
        return {
          data: null,
          error: `Admin API request failed (404 Not Found). Verify ADMIN_GATEWAY_BASE_URL points to the weather-gateway function and redeploy the gateway so the /admin/dashboard route exists at ${dashboardUrl}.`,
        };
      }

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
