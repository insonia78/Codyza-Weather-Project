import { UnauthorizedException } from '@nestjs/common';

import {
  weatherGatewayCallerHeader,
  weatherGatewayCallerValue,
  weatherGatewayInternalSecretEnvVar,
  weatherGatewaySecretHeader,
} from './gateway-request.constants.js';

export type HeaderValueReader = (name: string) => string | undefined;

export function requireGatewayInternalSecret(): string {
  const sharedSecret = process.env[weatherGatewayInternalSecretEnvVar]?.trim() ?? '';
  if (!sharedSecret) {
    throw new UnauthorizedException(`Missing ${weatherGatewayInternalSecretEnvVar} environment variable`);
  }

  return sharedSecret;
}

export function assertTrustedGatewayHeaders(readHeader: HeaderValueReader): void {
  const sharedSecret = requireGatewayInternalSecret();
  const gatewayCaller = readHeader(weatherGatewayCallerHeader)?.trim() ?? '';
  const gatewaySecret = readHeader(weatherGatewaySecretHeader)?.trim() ?? '';

  if (gatewayCaller !== weatherGatewayCallerValue || gatewaySecret !== sharedSecret) {
    throw new UnauthorizedException('This endpoint only accepts trusted gateway requests');
  }
}
