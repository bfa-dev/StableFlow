import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiGatewayModule } from './api-gateway.module';

async function bootstrap() {
  const logger = new Logger('APIGateway');
  const app = await NestFactory.create(ApiGatewayModule);

  // Enable CORS with comprehensive configuration
  app.enableCors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      
      // In production, specify allowed origins
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
        'https://stableflow-app.com',
      ];
      
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-User-ID',
      'X-Request-ID',
      'X-Correlation-ID',
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  // Set global prefix for all routes
  app.setGlobalPrefix('', { exclude: ['health', '/'] });

  // Security headers
  app.use((req: any, res: any, next: any) => {
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');
    
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // HSTS in production
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
  });

  // Swagger documentation configuration
  const config = new DocumentBuilder()
    .setTitle('StableFlow API Gateway')
    .setDescription(`
      StableFlow API Gateway - Single entry point for all StableFlow services
      
      ## Features
      - **Authentication**: JWT-based authentication with role-based access control
      - **Rate Limiting**: Intelligent rate limiting per user and IP
      - **Circuit Breaker**: Automatic failover for unhealthy services
      - **Request Logging**: Comprehensive request/response logging
      - **Service Discovery**: Dynamic service health monitoring
      - **Error Handling**: Standardized error responses
      
      ## Services
      - **Auth Service**: User authentication and authorization
      - **Wallet Service**: Digital wallet management
      - **Transaction Service**: Financial transaction processing
      - **Audit Service**: Compliance and audit logging
      - **Notification Service**: Real-time notifications
      
      ## Authentication
      All protected endpoints require a Bearer token in the Authorization header:
      \`Authorization: Bearer <your-jwt-token>\`
    `)
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter your JWT token',
    })
    .addTag('Gateway', 'API Gateway health and management')
    .addTag('Auth', 'Authentication and authorization')
    .addTag('Wallets', 'Wallet management')
    .addTag('Transactions', 'Transaction processing')
    .addTag('Audit', 'Audit and compliance')
    .addTag('Notifications', 'Notification management')
    .addServer(process.env.API_GATEWAY_URL || 'http://localhost:3000', 'Development server')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });
  
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      tryItOutEnabled: true,
    },
    customSiteTitle: 'StableFlow API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .scheme-container { margin: 20px 0 }
    `,
  });

  // Global error handling
  app.useGlobalFilters({
    catch: (exception: any, host: any) => {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const request = ctx.getRequest();
      
      const status = exception.getStatus ? exception.getStatus() : 500;
      const message = exception.message || 'Internal server error';
      
      logger.error(`${request.method} ${request.url} - ${status} - ${message}`);
      
      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message,
        requestId: request.requestId || 'unknown',
      });
    },
  } as any);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down gracefully');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down gracefully');
    await app.close();
    process.exit(0);
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🌐 API Gateway is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
  logger.log(`❤️  Health Check: http://localhost:${port}/health`);
  
  // Log configuration
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`CORS Origins: ${process.env.ALLOWED_ORIGINS || 'development-mode'}`);
  
  const serviceUrls = {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    wallet: process.env.WALLET_SERVICE_URL || 'http://localhost:3002',
    transaction: process.env.TRANSACTION_SERVICE_URL || 'http://localhost:3003',
    audit: process.env.AUDIT_SERVICE_URL || 'http://localhost:3004',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
  };
  
  logger.log('Service Registry:');
  Object.entries(serviceUrls).forEach(([service, url]) => {
    logger.log(`  ${service}: ${url}`);
  });
}

bootstrap().catch((error) => {
  const logger = new Logger('APIGateway');
  logger.error('Failed to start API Gateway:', error);
  process.exit(1);
});
