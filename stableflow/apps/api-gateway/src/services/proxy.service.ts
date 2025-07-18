import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { Observable, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { ServiceRegistryService } from './service-registry.service';

export interface ProxyRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  data?: any;
  headers?: { [key: string]: string };
  params?: { [key: string]: any };
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly defaultTimeout = 30000; // 30 seconds

  constructor(
    private readonly httpService: HttpService,
    private readonly serviceRegistry: ServiceRegistryService,
  ) {}

  async forwardRequest(
    serviceName: string,
    request: ProxyRequest,
    requestId: string,
  ): Promise<any> {
    const service = this.serviceRegistry.getHealthyService(serviceName);
    
    if (!service) {
      this.logger.error(`Service ${serviceName} is unavailable`);
      throw new HttpException(
        {
          message: `Service ${serviceName} is temporarily unavailable`,
          error: 'Service Unavailable',
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          requestId,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const url = `${service.url}${request.path}`;
    const requestOptions = {
      timeout: service.timeout || this.defaultTimeout,
      headers: {
        ...request.headers,
        'X-Request-ID': requestId,
        'X-Forwarded-By': 'api-gateway',
      },
      params: request.params,
    };

    this.logger.log(`Forwarding ${request.method} ${url} [${requestId}]`);

    try {
      let response: AxiosResponse;

      switch (request.method) {
        case 'GET':
          response = await this.httpService.get(url, requestOptions).toPromise();
          break;
        case 'POST':
          response = await this.httpService.post(url, request.data, requestOptions).toPromise();
          break;
        case 'PUT':
          response = await this.httpService.put(url, request.data, requestOptions).toPromise();
          break;
        case 'DELETE':
          response = await this.httpService.delete(url, requestOptions).toPromise();
          break;
        case 'PATCH':
          response = await this.httpService.patch(url, request.data, requestOptions).toPromise();
          break;
        default:
          throw new HttpException('Unsupported HTTP method', HttpStatus.METHOD_NOT_ALLOWED);
      }

      // Mark service as healthy after successful request
      this.serviceRegistry.markServiceHealthy(serviceName);

      this.logger.log(`Response from ${serviceName}: ${response.status} [${requestId}]`);
      
      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      this.logger.error(`Error forwarding to ${serviceName}: ${error.message} [${requestId}]`);
      
      // Mark service as unhealthy
      this.serviceRegistry.markServiceUnhealthy(serviceName, error.message);

      // Handle different types of errors
      if (error.response) {
        // Service responded with error status
        throw new HttpException(
          {
            message: error.response.data?.message || 'Service error',
            error: error.response.data?.error || 'Internal Service Error',
            statusCode: error.response.status,
            requestId,
            service: serviceName,
          },
          error.response.status,
        );
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        // Service is down
        throw new HttpException(
          {
            message: `Service ${serviceName} is unreachable`,
            error: 'Service Connection Failed',
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            requestId,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      } else if (error.code === 'ETIMEDOUT') {
        // Request timeout
        throw new HttpException(
          {
            message: `Request to ${serviceName} timed out`,
            error: 'Gateway Timeout',
            statusCode: HttpStatus.GATEWAY_TIMEOUT,
            requestId,
          },
          HttpStatus.GATEWAY_TIMEOUT,
        );
      } else {
        // Unknown error
        throw new HttpException(
          {
            message: 'An unexpected error occurred',
            error: 'Internal Gateway Error',
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            requestId,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  // Utility method to determine service name from path
  getServiceNameFromPath(path: string): string | null {
    const pathSegments = path.split('/').filter(segment => segment.length > 0);
    
    if (pathSegments.length < 3) return null; // /api/v1/...
    
    const apiSegment = pathSegments[0]; // should be 'api'
    const versionSegment = pathSegments[1]; // should be 'v1'
    const serviceSegment = pathSegments[2]; // service identifier
    
    if (apiSegment !== 'api' || versionSegment !== 'v1') {
      return null;
    }

    // Map service segments to actual service names
    const serviceMap: { [key: string]: string } = {
      'auth': 'auth-service',
      'wallets': 'wallet-service',
      'transactions': 'transaction-service',
      'audit': 'audit-service',
      'notifications': 'notification-service',
    };

    return serviceMap[serviceSegment] || null;
  }

  // Remove gateway-specific headers before forwarding
  sanitizeHeaders(headers: { [key: string]: string }): { [key: string]: string } {
    const sanitized = { ...headers };
    
    // Remove headers that should not be forwarded
    delete sanitized['host'];
    delete sanitized['connection'];
    delete sanitized['content-length'];
    delete sanitized['x-forwarded-by'];
    
    return sanitized;
  }
} 