import { UnauthorizedException } from '@nestjs/common';

import {
  assertTrustedGatewayHeaders,
  requireGatewayInternalSecret,
} from './gateway-request.util.js';

describe('gateway-request util', () => {
  const originalGatewayInternalSecret = process.env.WEATHER_GATEWAY_INTERNAL_SECRET;

  afterEach(() => {
    if (typeof originalGatewayInternalSecret === 'string') {
      process.env.WEATHER_GATEWAY_INTERNAL_SECRET = originalGatewayInternalSecret;
      return;
    }

    delete process.env.WEATHER_GATEWAY_INTERNAL_SECRET;
  });

  it('reads the configured gateway secret', () => {
    process.env.WEATHER_GATEWAY_INTERNAL_SECRET = 'shared-secret';

    expect(requireGatewayInternalSecret()).toBe('shared-secret');
  });

  it('rejects requests when the shared secret is missing', () => {
    delete process.env.WEATHER_GATEWAY_INTERNAL_SECRET;

    expect(() => requireGatewayInternalSecret()).toThrowError(
      new UnauthorizedException('Missing WEATHER_GATEWAY_INTERNAL_SECRET environment variable'),
    );
  });

  it('accepts trusted gateway headers', () => {
    process.env.WEATHER_GATEWAY_INTERNAL_SECRET = 'shared-secret';

    expect(() => assertTrustedGatewayHeaders((name) => {
      if (name === 'x-weather-gateway-caller') {
        return 'weather-gateway';
      }

      if (name === 'x-weather-gateway-secret') {
        return 'shared-secret';
      }

      return undefined;
    })).not.toThrow();
  });

  it('rejects untrusted gateway headers', () => {
    process.env.WEATHER_GATEWAY_INTERNAL_SECRET = 'shared-secret';

    expect(() => assertTrustedGatewayHeaders((name) => {
      if (name === 'x-weather-gateway-caller') {
        return 'direct-client';
      }

      if (name === 'x-weather-gateway-secret') {
        return 'shared-secret';
      }

      return undefined;
    })).toThrowError(
      new UnauthorizedException('This endpoint only accepts trusted gateway requests'),
    );
  });
});
