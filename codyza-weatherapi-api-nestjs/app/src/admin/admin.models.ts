export interface AdminRequestLogRow {
  requestPath: string;
  requestMethod: string;
  statusCode: number;
  durationMs: number;
  userEmail: string | null;
  userAgent: string | null;
  requestId: string | null;
  tokenType: string | null;
  createdAt: Date | string;
}

export interface ApiUsageSummaryRow {
  requestPath: string;
  requestCount: number;
  averageDurationMs: number;
  failureCount: number;
}

export interface TopSearchRow {
  locationLabel: string;
  searchCount: number;
  lastSearchedAt: Date | string;
}

export interface AdminDashboardSnapshot {
  totals: {
    requestsLast24Hours: number;
    failedRequestsLast24Hours: number;
    averageDurationMs: number;
    lastRequestAt: Date | string | null;
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
  failedRequests: AdminRequestLogRow[];
  mostSearchedLocations: TopSearchRow[];
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
}
