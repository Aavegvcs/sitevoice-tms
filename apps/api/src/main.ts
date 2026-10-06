import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind a reverse proxy (Caddy in docker-compose.prod.yml), take the client IP from
  // X-Forwarded-For so per-IP rate limits apply to real clients rather than the proxy.
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  configureApp(app);

  const config = new DocumentBuilder()
    .setTitle('SiteVoice API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
