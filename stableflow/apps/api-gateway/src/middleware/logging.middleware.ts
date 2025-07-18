import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
  requestId?: string;
  startTime?: number;
}

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const requestId = req.requestId || this.generateRequestId();
    req.requestId = requestId;
    req.startTime = Date.now();

    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || 'Unknown';
    const userId = req.user?.id || 'anonymous';
    const userEmail = req.user?.email || 'anonymous';

    // Log incoming request
    this.logger.log(`[${requestId}] ${method} ${originalUrl} - ${ip} - ${userAgent} - User: ${userEmail}`);

    // Log request body for non-GET requests (with sensitive data filtering)
    if (method !== 'GET' && req.body) {
      const sanitizedBody = this.sanitizeRequestBody(req.body);
      this.logger.debug(`[${requestId}] Request body: ${JSON.stringify(sanitizedBody)}`);
    }

    // Log request headers (filtered)
    const importantHeaders = this.getImportantHeaders(headers);
    this.logger.debug(`[${requestId}] Headers: ${JSON.stringify(importantHeaders)}`);

    // Capture the original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    let responseBody: any;
    let responseSent = false;

    // Override res.send to capture response
    res.send = function (body: any) {
      if (!responseSent) {
        responseBody = body;
        responseSent = true;
      }
      return originalSend.call(this, body);
    };

    // Override res.json to capture response
    res.json = function (body: any) {
      if (!responseSent) {
        responseBody = body;
        responseSent = true;
      }
      return originalJson.call(this, body);
    };

    // Override res.end to capture response
    res.end = function (chunk: any, encoding?: any) {
      if (!responseSent && chunk) {
        responseBody = chunk;
        responseSent = true;
      }
      return originalEnd.call(this, chunk, encoding);
    };

    // Log response when finished
    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - (req.startTime || Date.now());
      const contentLength = res.get('content-length') || 0;

      // Log response summary
      this.logger.log(
        `[${requestId}] ${method} ${originalUrl} - ${statusCode} - ${responseTime}ms - ${contentLength} bytes - User: ${userEmail}`
      );

      // Log detailed response for errors or debug mode
      if (statusCode >= 400 || process.env.NODE_ENV === 'development') {
        const sanitizedResponse = this.sanitizeResponseBody(responseBody, statusCode);
        this.logger.debug(`[${requestId}] Response: ${JSON.stringify(sanitizedResponse)}`);
      }

      // Log slow requests
      if (responseTime > 5000) {
        this.logger.warn(`[${requestId}] Slow request detected: ${responseTime}ms for ${method} ${originalUrl}`);
      }

      // Send metrics to monitoring system (placeholder)
      this.sendMetrics({
        requestId,
        method,
        path: originalUrl,
        statusCode,
        responseTime,
        userId: req.user?.id,
        ip,
        userAgent,
      });
    });

    next();
  }

  private generateRequestId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'currentPassword',
      'newPassword',
      'confirmPassword',
      'token',
      'refresh_token',
      'access_token',
      'secret',
      'key',
      'privateKey',
      'apiKey',
      'authorization',
    ];

    const sanitized = { ...body };

    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;

      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  private sanitizeResponseBody(body: any, statusCode: number): any {
    if (!body || typeof body !== 'string') {
      return body;
    }

    try {
      const parsed = JSON.parse(body);
      
      // Don't log sensitive response data
      if (parsed && typeof parsed === 'object') {
        const sensitiveFields = ['access_token', 'refresh_token', 'token', 'password'];
        const sanitized = { ...parsed };
        
        sensitiveFields.forEach(field => {
          if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
          }
        });

        return sanitized;
      }
      
      return parsed;
    } catch {
      // If not JSON, return truncated string for large responses
      if (body.length > 1000) {
        return body.substring(0, 1000) + '... [TRUNCATED]';
      }
      return body;
    }
  }

  private getImportantHeaders(headers: any): any {
    const importantHeaders = [
      'authorization',
      'content-type',
      'accept',
      'user-agent',
      'x-forwarded-for',
      'x-real-ip',
      'x-request-id',
      'x-correlation-id',
    ];

    const filtered: any = {};
    importantHeaders.forEach(header => {
      if (headers[header]) {
        if (header === 'authorization') {
          // Mask authorization header
          filtered[header] = headers[header].replace(/Bearer .+/, 'Bearer [REDACTED]');
        } else {
          filtered[header] = headers[header];
        }
      }
    });

    return filtered;
  }

  private sendMetrics(metrics: {
    requestId: string;
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
    userId?: number;
    ip: string;
    userAgent: string;
  }): void {
    // In a real implementation, this would send metrics to a monitoring system
    // like Prometheus, DataDog, CloudWatch, etc.
    
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`Metrics: ${JSON.stringify(metrics)}`);
    }

    // Example: Send to external monitoring
    // this.metricsService.record('api_gateway_request', metrics);
  }
} 