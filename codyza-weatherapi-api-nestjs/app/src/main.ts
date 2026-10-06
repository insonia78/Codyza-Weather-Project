import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { requireGatewayInternalSecret } from './security/gateway-request.util.js';

async function bootstrap() {
  requireGatewayInternalSecret();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
