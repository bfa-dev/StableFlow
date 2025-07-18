import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WalletServiceModule } from './wallet-service.module';

async function bootstrap() {
  const app = await NestFactory.create(WalletServiceModule);
  const logger = new Logger('WalletService');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error for unknown properties
      transform: true, // Transform to class instances
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('StableFlow Wallet Service')
    .setDescription('Wallet management service for StableFlow platform')
    .setVersion('1.0')
    .addTag('Wallets')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3002;
  await app.listen(port);
  
  logger.log(`🚀 Wallet Service is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
