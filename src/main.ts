import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AdminGuard } from './common/guards/admin.guard';
import { JwtService } from '@nestjs/jwt';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isDev = process.env.NODE_ENV !== 'production';

  app.use(helmet());
  app.enableShutdownHooks();

  // Apply global admin guard — individual public routes opt out with @Public()
  const jwtService = app.get(JwtService);
  const reflector   = app.get(Reflector);
  app.useGlobalGuards(new AdminGuard(jwtService, reflector));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: isDev ? true : (process.env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()),
    credentials: true,
  });

  if (isDev) {
    const config = new DocumentBuilder()
      .setTitle('PointSell Control Panel API')
      .setDescription(
        'License server, tenant onboarding, and update distribution.\n\n' +
        '**Auth:** `POST /api/auth/login` → copy `access_token` → click Authorize above.',
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`\n  PointSell Control Panel running at http://localhost:${port}\n`);
}
bootstrap();
