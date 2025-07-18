import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuditServiceModule } from './audit-service.module';

async function bootstrap() {
  const app = await NestFactory.create(AuditServiceModule);

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('StableFlow Audit Service')
    .setDescription('Comprehensive audit and compliance monitoring service for the StableFlow platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Audit Service', 'Transaction logging, system events, and compliance reporting')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3004;
  await app.listen(port);
  
  console.log(`🔍 Audit Service is running on: http://localhost:${port}`);
  console.log(`📚 Swagger Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
