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
