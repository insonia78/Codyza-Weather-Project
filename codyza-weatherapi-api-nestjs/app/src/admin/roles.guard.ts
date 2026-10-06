import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ROLES_KEY } from './roles.decorator.js';

type UserPayload = {
  role?: string;
};

const weatherGatewayCallerValue = 'weather-gateway';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    this.assertTrustedGatewayRequest(request);

    const payload = this.parseUserPayload(request);
    const role = typeof payload.role === 'string' ? payload.role.trim() : '';
    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException('Admin role is required for this endpoint');
    }

    return true;
  }

  private assertTrustedGatewayRequest(request: Request): void {
    const sharedSecret = process.env.WEATHER_GATEWAY_INTERNAL_SECRET?.trim() ?? '';
    const gatewayCaller = request.header('x-weather-gateway-caller') ?? '';
    const gatewaySecret = request.header('x-weather-gateway-secret') ?? '';

    if (!sharedSecret) {
      throw new UnauthorizedException('Missing WEATHER_GATEWAY_INTERNAL_SECRET environment variable');
    }

    if (gatewayCaller !== weatherGatewayCallerValue || gatewaySecret !== sharedSecret) {
      throw new UnauthorizedException('This endpoint only accepts trusted gateway requests');
    }
  }

  private parseUserPayload(request: Request): UserPayload {
    const rawPayload = request.header('x-user-payload');
    if (!rawPayload) {
      throw new UnauthorizedException('Missing X-User-Payload header');
    }

    try {
      const parsed = JSON.parse(rawPayload) as UserPayload;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid user payload');
      }

      return parsed;
    } catch {
      throw new UnauthorizedException('Invalid X-User-Payload header');
    }
  }
}
