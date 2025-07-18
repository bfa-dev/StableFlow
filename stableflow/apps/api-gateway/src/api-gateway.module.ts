import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';

// Services
import { ServiceRegistryService } from './services/service-registry.service';
import { ProxyService } from './services/proxy.service';

// Middleware
import { LoggingMiddleware } from './middleware/logging.middleware';
import { AuthMiddleware } from './middleware/auth.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // requests per TTL
      },
    ]),
  ],
  controllers: [ApiGatewayController],
  providers: [
    ApiGatewayService,
    ServiceRegistryService,
    ProxyService,
    LoggingMiddleware,
    AuthMiddleware,
    RateLimitMiddleware,
  ],
  exports: [
    ApiGatewayService,
    ServiceRegistryService,
    ProxyService,
  ],
})
export class ApiGatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply middleware in order: Logging -> Rate Limiting -> Authentication
    consumer
      .apply(LoggingMiddleware)
      .forRoutes('*') // Log all requests
      .apply(RateLimitMiddleware)
      .forRoutes('*') // Rate limit all requests
      .apply(AuthMiddleware)
      .forRoutes('*'); // Apply authentication (will handle public paths internally)
  }
}
