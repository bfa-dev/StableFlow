import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { TransactionWorkerModule } from './transaction-worker.module';

async function bootstrap() {
  const app = await NestFactory.create(TransactionWorkerModule);
  const logger = new Logger('TransactionWorker');

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
    .setTitle('StableFlow Transaction Worker')
    .setDescription('Async transaction processing worker service for StableFlow platform - handles Kafka message consumption and transaction processing')
    .setVersion('1.0')
    .addTag('Transaction Worker')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3006;
  await app.listen(port);
  
  logger.log(`🚀 Transaction Worker is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  logger.log(`⚡ Kafka Consumer started and listening for transaction messages`);
}
bootstrap();
