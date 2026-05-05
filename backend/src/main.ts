import helmet from 'helmet';
// cookie-parser usa `export =` (CJS) — sintaxe TS para importar o module.exports raw
import cookieParser = require('cookie-parser');
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

function parseOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());

  // Permite ler req.ip correctamente se houver reverse proxy à frente.
  app.set('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const rawOrigin = process.env.FRONTEND_ORIGIN?.trim();
  if (!rawOrigin) {
    throw new Error(
      'FRONTEND_ORIGIN must be set (single origin or comma-separated list).',
    );
  }
  const allowedOrigins = parseOrigins(rawOrigin);

  app.enableCors({
    origin: (incoming, cb) => {
      if (!incoming) return cb(null, true); // same-origin / curl / mobile apps
      cb(null, allowedOrigins.includes(incoming));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Authorization'],
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Backend a correr em http://localhost:${port}/api`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
}

bootstrap();
