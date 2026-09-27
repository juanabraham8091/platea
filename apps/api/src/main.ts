import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Identificador de request para trazabilidad (Doc 11 §8).
  app.use((req: Request & { id?: string }, res: Response, next: NextFunction) => {
    req.id = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  });

  app.use(helmet());
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGINS').split(',').map((s) => s.trim()),
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.enableShutdownHooks();

  const port = config.getOrThrow<number>('API_PORT');
  await app.listen(port);
  logger.log(`PLATEA API escuchando en http://localhost:${port}/api/v1 (${config.get('NODE_ENV')})`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fallo al arrancar la API:', err);
  process.exit(1);
});
