import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface ServiceConfig {
  name: string;
  url: string;
  healthEndpoint: string;
  isHealthy: boolean;
  lastHealthCheck: Date;
  circuitBreakerOpen: boolean;
  failureCount: number;
  maxFailures: number;
  timeout: number;
}

@Injectable()
export class ServiceRegistryService {
  private readonly logger = new Logger(ServiceRegistryService.name);
  private readonly services: Map<string, ServiceConfig> = new Map();

  constructor(private readonly httpService: HttpService) {
    this.initializeServices();
    this.startHealthChecks();
  }

  private initializeServices(): void {
    const serviceConfigs: ServiceConfig[] = [
      {
        name: 'auth-service',
        url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
        healthEndpoint: '/api/v1/auth/health',
        isHealthy: true,
        lastHealthCheck: new Date(),
        circuitBreakerOpen: false,
        failureCount: 0,
        maxFailures: 5,
        timeout: 5000,
      },
      {
        name: 'wallet-service',
        url: process.env.WALLET_SERVICE_URL || 'http://localhost:3002',
        healthEndpoint: '/api/v1/wallets/health',
        isHealthy: true,
        lastHealthCheck: new Date(),
        circuitBreakerOpen: false,
        failureCount: 0,
        maxFailures: 5,
        timeout: 5000,
      },
      {
        name: 'transaction-service',
        url: process.env.TRANSACTION_SERVICE_URL || 'http://localhost:3003',
        healthEndpoint: '/api/v1/transactions/health',
        isHealthy: true,
        lastHealthCheck: new Date(),
        circuitBreakerOpen: false,
        failureCount: 0,
        maxFailures: 5,
        timeout: 5000,
      },
      {
        name: 'audit-service',
        url: process.env.AUDIT_SERVICE_URL || 'http://localhost:3004',
        healthEndpoint: '/api/v1/audit/health',
        isHealthy: true,
        lastHealthCheck: new Date(),
        circuitBreakerOpen: false,
        failureCount: 0,
        maxFailures: 5,
        timeout: 5000,
      },
      {
        name: 'notification-service',
        url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
        healthEndpoint: '/api/v1/notifications/health',
        isHealthy: true,
        lastHealthCheck: new Date(),
        circuitBreakerOpen: false,
        failureCount: 0,
        maxFailures: 5,
        timeout: 5000,
      },
    ];

    serviceConfigs.forEach(config => {
      this.services.set(config.name, config);
    });

    this.logger.log(`Initialized ${serviceConfigs.length} services in registry`);
  }

  getService(serviceName: string): ServiceConfig | undefined {
    return this.services.get(serviceName);
  }

  getAllServices(): ServiceConfig[] {
    return Array.from(this.services.values());
  }

  getHealthyService(serviceName: string): ServiceConfig | undefined {
    const service = this.services.get(serviceName);
    if (!service) return undefined;

    if (service.circuitBreakerOpen) {
      this.logger.warn(`Circuit breaker open for ${serviceName}`);
      return undefined;
    }

    return service.isHealthy ? service : undefined;
  }

  markServiceHealthy(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (service) {
      service.isHealthy = true;
      service.failureCount = 0;
      service.circuitBreakerOpen = false;
      service.lastHealthCheck = new Date();
    }
  }

  markServiceUnhealthy(serviceName: string, error?: string): void {
    const service = this.services.get(serviceName);
    if (service) {
      service.isHealthy = false;
      service.failureCount++;
      service.lastHealthCheck = new Date();

      if (service.failureCount >= service.maxFailures) {
        service.circuitBreakerOpen = true;
        this.logger.error(`Circuit breaker opened for ${serviceName} after ${service.failureCount} failures`);
      }

      this.logger.warn(`Service ${serviceName} marked unhealthy: ${error || 'Unknown error'}`);
    }
  }

  private startHealthChecks(): void {
    // Check health every 30 seconds
    setInterval(() => {
      this.performHealthChecks();
    }, 30000);
  }

  private async performHealthChecks(): Promise<void> {
    for (const [serviceName, service] of this.services) {
      try {
        const response = await this.httpService
          .get(`${service.url}${service.healthEndpoint}`, {
            timeout: service.timeout,
          })
          .toPromise();

        if (response?.status === 200) {
          this.markServiceHealthy(serviceName);
        } else {
          this.markServiceUnhealthy(serviceName, `HTTP ${response?.status}`);
        }
      } catch (error) {
        this.markServiceUnhealthy(serviceName, error.message);
      }
    }
  }

  getServiceUrl(serviceName: string): string | undefined {
    const service = this.getHealthyService(serviceName);
    return service?.url;
  }

  getServicesStatus(): { [key: string]: any } {
    const status: { [key: string]: any } = {};
    
    this.services.forEach((service, name) => {
      status[name] = {
        healthy: service.isHealthy,
        lastCheck: service.lastHealthCheck,
        circuitBreakerOpen: service.circuitBreakerOpen,
        failureCount: service.failureCount,
        url: service.url,
      };
    });

    return status;
  }

  // Circuit breaker reset - can be called manually or on timer
  resetCircuitBreaker(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (service && service.circuitBreakerOpen) {
      service.circuitBreakerOpen = false;
      service.failureCount = 0;
      this.logger.log(`Circuit breaker reset for ${serviceName}`);
    }
  }
} 