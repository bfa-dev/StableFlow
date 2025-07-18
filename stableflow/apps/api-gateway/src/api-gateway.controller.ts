import { 
  Controller, 
  All, 
  Req, 
  Res, 
  Get, 
  HttpStatus,
  Logger,
  HttpException
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiGatewayService } from './api-gateway.service';
import { ProxyService } from './services/proxy.service';
import { ServiceRegistryService } from './services/service-registry.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
  requestId?: string;
}

@ApiTags('API Gateway')
@Controller()
export class ApiGatewayController {
  private readonly logger = new Logger(ApiGatewayController.name);

  constructor(
    private readonly apiGatewayService: ApiGatewayService,
    private readonly proxyService: ProxyService,
    private readonly serviceRegistry: ServiceRegistryService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Gateway health check' })
  @ApiResponse({ status: 200, description: 'Gateway and services health status' })
  async getHealth(): Promise<any> {
    const gatewayHealth = this.apiGatewayService.getHealth();
    const servicesStatus = this.serviceRegistry.getServicesStatus();

    return {
      gateway: gatewayHealth,
      services: servicesStatus,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('api/docs')
  @ApiOperation({ summary: 'API documentation redirect' })
  async getDocs(@Res() res: Response): Promise<void> {
    // Redirect to Swagger UI
    res.redirect('/api-docs');
  }

  @All('api/v1/auth/*')
  @ApiOperation({ summary: 'Route requests to auth service' })
  async routeToAuthService(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    await this.forwardRequest('auth-service', req, res);
  }

  @All('api/v1/wallets/*')
  @ApiOperation({ summary: 'Route requests to wallet service' })
  async routeToWalletService(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    await this.forwardRequest('wallet-service', req, res);
  }

  @All('api/v1/transactions/*')
  @ApiOperation({ summary: 'Route requests to transaction service' })
  async routeToTransactionService(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    await this.forwardRequest('transaction-service', req, res);
  }

  @All('api/v1/audit/*')
  @ApiOperation({ summary: 'Route requests to audit service' })
  async routeToAuditService(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    await this.forwardRequest('audit-service', req, res);
  }

  @All('api/v1/notifications/*')
  @ApiOperation({ summary: 'Route requests to notification service' })
  async routeToNotificationService(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    await this.forwardRequest('notification-service', req, res);
  }

  // Catch-all route for unmatched API requests
  @All('api/*')
  @ApiOperation({ summary: 'Handle unmatched API requests' })
  async handleUnmatchedApi(@Req() req: Request, @Res() res: Response): Promise<void> {
    const requestId = (req as any).requestId || 'unknown';
    
    this.logger.warn(`Unmatched API route: ${req.method} ${req.path} [${requestId}]`);
    
    res.status(HttpStatus.NOT_FOUND).json({
      message: 'API endpoint not found',
      error: 'Not Found',
      statusCode: 404,
      path: req.path,
      method: req.method,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  // Default route for non-API requests
  @All('*')
  @ApiOperation({ summary: 'Handle all other requests' })
  async handleDefault(@Req() req: Request, @Res() res: Response): Promise<void> {
    const requestId = (req as any).requestId || 'unknown';
    
    // For root path, return gateway info
    if (req.path === '/') {
      res.json({
        name: 'StableFlow API Gateway',
        version: '1.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          docs: '/api/docs',
          auth: '/api/v1/auth/*',
          wallets: '/api/v1/wallets/*',
          transactions: '/api/v1/transactions/*',
          audit: '/api/v1/audit/*',
          notifications: '/api/v1/notifications/*',
        },
        requestId,
      });
      return;
    }

    this.logger.warn(`Unknown route: ${req.method} ${req.path} [${requestId}]`);
    
    res.status(HttpStatus.NOT_FOUND).json({
      message: 'Route not found',
      error: 'Not Found',
      statusCode: 404,
      path: req.path,
      method: req.method,
      requestId,
      timestamp: new Date().toISOString(),
      suggestion: 'Try /health for gateway status or /api/docs for API documentation',
    });
  }

  private async forwardRequest(
    serviceName: string,
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    const requestId = req.requestId || 'unknown';

    try {
      // Prepare the proxy request
      const proxyRequest = {
        method: req.method as any,
        path: req.path,
        data: req.body,
        headers: this.sanitizeHeaders(req.headers),
        params: req.query,
      };

      // Forward the request
      const response = await this.proxyService.forwardRequest(
        serviceName,
        proxyRequest,
        requestId,
      );

      // Set response headers
      if (response.headers) {
        Object.entries(response.headers).forEach(([key, value]) => {
          if (typeof value === 'string') {
            res.set(key, value);
          }
        });
      }

      // Send the response
      res.status(response.status).json(response.data);
    } catch (error) {
      this.logger.error(`Error forwarding to ${serviceName}: ${error.message} [${requestId}]`);
      
      if (error instanceof HttpException) {
        const status = error.getStatus();
        const errorResponse = error.getResponse();
        res.status(status).json(errorResponse);
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Internal gateway error',
          error: 'Internal Server Error',
          statusCode: 500,
          requestId,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  private sanitizeHeaders(headers: any): { [key: string]: string } {
    const sanitized: { [key: string]: string } = {};
    
    // Only forward specific headers
    const allowedHeaders = [
      'content-type',
      'accept',
      'accept-language',
      'accept-encoding',
      'user-agent',
      'x-user-id',
      'x-user-email',
      'x-user-role',
      'x-request-id',
      'x-correlation-id',
      'x-internal-token',
    ];

    allowedHeaders.forEach(header => {
      if (headers[header]) {
        sanitized[header] = headers[header];
      }
    });

    return sanitized;
  }
}
