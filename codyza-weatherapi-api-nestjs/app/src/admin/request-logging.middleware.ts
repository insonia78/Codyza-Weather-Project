import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { AdminService } from './admin.service.js';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private readonly adminService: AdminService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();

    res.on('finish', () => {
      this.adminService.logRequest({
        requestPath: req.originalUrl || req.url,
        requestMethod: req.method,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        userEmail: this.getHeaderValue(req, 'x-user-id'),
        userAgent: this.getHeaderValue(req, 'user-agent'),
        requestId: this.getHeaderValue(req, 'x-request-id'),
        tokenType: this.getHeaderValue(req, 'x-user-type'),
      }).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to persist request log: ${message}`);
      });
    });

    next();
  }

  private getHeaderValue(req: Request, headerName: string): string | null {
    const headerValue = req.headers[headerName];
    if (typeof headerValue === 'string') {
      const normalizedValue = headerValue.trim();
      return normalizedValue ? normalizedValue : null;
    }

    if (Array.isArray(headerValue)) {
      const firstValue = headerValue[0]?.trim();
      return firstValue || null;
    }

    return null;
  }
}
