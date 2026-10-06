import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import { RolesGuard } from './roles.guard.js';

function createExecutionContext(headers: Record<string, string>): ExecutionContext {
  const request = {
    header(name: string) {
      return headers[name.toLowerCase()];
    },
  };

  return {
    getClass: vi.fn(),
    getHandler: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: vi.fn(),
      getNext: vi.fn(),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows requests with the admin role from the trusted gateway', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    process.env.WEATHER_GATEWAY_INTERNAL_SECRET = 'shared-secret';

    const result = guard.canActivate(createExecutionContext({
      'x-weather-gateway-caller': 'weather-gateway',
      'x-weather-gateway-secret': 'shared-secret',
      'x-user-payload': JSON.stringify({ role: 'admin' }),
    }));

    expect(result).toBe(true);
  });

  it('rejects requests without the trusted gateway headers', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    process.env.WEATHER_GATEWAY_INTERNAL_SECRET = 'shared-secret';

    expect(() =>
      guard.canActivate(createExecutionContext({
        'x-user-payload': JSON.stringify({ role: 'admin' }),
      })),
    ).toThrow(UnauthorizedException);
  });

  it('rejects requests without the admin role', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    process.env.WEATHER_GATEWAY_INTERNAL_SECRET = 'shared-secret';

    expect(() =>
      guard.canActivate(createExecutionContext({
        'x-weather-gateway-caller': 'weather-gateway',
        'x-weather-gateway-secret': 'shared-secret',
        'x-user-payload': JSON.stringify({ role: 'user' }),
      })),
    ).toThrow(ForbiddenException);
  });
});
