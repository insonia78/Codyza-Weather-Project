import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { assertTrustedGatewayHeaders } from './gateway-request.util.js';

@Injectable()
export class GatewayRequestMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction): void {
    assertTrustedGatewayHeaders((name) => request.header(name) ?? undefined);
    next();
  }
}
