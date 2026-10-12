import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureNestApp } from './common/setup-app';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  configureNestApp(app);

  const configService = app.get(ConfigService);
  const host = configService.get<string>('API_HOST', '127.0.0.1');
  const port = configService.get<number>('API_PORT', 4000);

  await app.listen(port, host);
  logger.log(
    JSON.stringify({
      event: 'server_started',
      service: configService.get<string>('APP_NAME', 'pdschain-v2'),
      phase: 1,
      url: `http://${host}:${port}/api/v1`,
      timestamp: new Date().toISOString(),
    }),
  );
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start PDSChain v2 API:', error);
  process.exit(1);
});
