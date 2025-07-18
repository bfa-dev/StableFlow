import { Injectable, NestMiddleware, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
  requestId?: string;
}

interface RateLimitData {
  count: number;
  resetTime: number;
  blocked: boolean;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly store: Map<string, RateLimitData> = new Map();
  
  // Rate limit configurations
  private readonly rateLimits = {
    // Per IP limits (for unauthenticated requests)
    ip: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // requests per window
      blockDurationMs: 60 * 60 * 1000, // 1 hour block
    },
    // Per user limits (for authenticated requests)
    user: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60, // requests per minute
      blockDurationMs: 10 * 60 * 1000, // 10 minutes block
    },
    // Special limits for sensitive endpoints
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 login attempts per 15 minutes
      blockDurationMs: 30 * 60 * 1000, // 30 minutes block
    },
    // Admin endpoints have higher limits
    admin: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // requests per minute
      blockDurationMs: 5 * 60 * 1000, // 5 minutes block
    },
  };

  // Paths that require special rate limiting
  private readonly authPaths = [
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/refresh',
  ];

  private readonly adminPaths = [
    '/api/v1/audit',
    '/api/v1/transactions/admin',
    '/api/v1/wallets/admin',
  ];

  constructor() {
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const requestId = req.requestId || this.generateRequestId();
    const path = req.path;
    const ip = this.getClientIp(req);
    const user = req.user;

    // Determine rate limit configuration
    const limitConfig = this.getLimitConfig(path, user);
    const limitKey = this.getLimitKey(req, user, ip);

    // Check rate limit
    const rateLimitData = this.checkRateLimit(limitKey, limitConfig);

    if (rateLimitData.blocked) {
      this.logger.warn(`Rate limit exceeded: ${limitKey} for ${path} [${requestId}]`);
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': limitConfig.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(rateLimitData.resetTime).toISOString(),
        'Retry-After': Math.ceil((rateLimitData.resetTime - Date.now()) / 1000).toString(),
      });

      throw new HttpException(
        {
          message: 'Rate limit exceeded. Please try again later.',
          error: 'Too Many Requests',
          statusCode: 429,
          requestId,
          retryAfter: Math.ceil((rateLimitData.resetTime - Date.now()) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Set rate limit headers for successful requests
    const remaining = limitConfig.maxRequests - rateLimitData.count;
    res.set({
      'X-RateLimit-Limit': limitConfig.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(rateLimitData.resetTime).toISOString(),
    });

    this.logger.debug(`Rate limit check passed: ${limitKey} (${rateLimitData.count}/${limitConfig.maxRequests}) [${requestId}]`);
    next();
  }

  private getLimitConfig(path: string, user?: any) {
    // Authentication endpoints have stricter limits
    if (this.authPaths.some(authPath => path.startsWith(authPath))) {
      return this.rateLimits.auth;
    }

    // Admin endpoints (if user is admin)
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      if (this.adminPaths.some(adminPath => path.startsWith(adminPath))) {
        return this.rateLimits.admin;
      }
    }

    // Authenticated users get higher limits
    if (user) {
      return this.rateLimits.user;
    }

    // Default IP-based limits for unauthenticated requests
    return this.rateLimits.ip;
  }

  private getLimitKey(req: AuthenticatedRequest, user?: any, ip?: string): string {
    // Use user ID for authenticated requests
    if (user) {
      return `user:${user.id}:${req.path}`;
    }

    // Use IP for unauthenticated requests
    return `ip:${ip}:${req.path}`;
  }

  private checkRateLimit(key: string, config: any): RateLimitData {
    const now = Date.now();
    const existing = this.store.get(key);

    // If no existing data or window has expired
    if (!existing || now > existing.resetTime) {
      const newData: RateLimitData = {
        count: 1,
        resetTime: now + config.windowMs,
        blocked: false,
      };
      this.store.set(key, newData);
      return newData;
    }

    // If currently blocked, check if block period has expired
    if (existing.blocked) {
      if (now > existing.resetTime) {
        // Block period expired, reset
        const newData: RateLimitData = {
          count: 1,
          resetTime: now + config.windowMs,
          blocked: false,
        };
        this.store.set(key, newData);
        return newData;
      }
      // Still blocked
      return existing;
    }

    // Increment count
    existing.count++;

    // Check if limit exceeded
    if (existing.count > config.maxRequests) {
      existing.blocked = true;
      existing.resetTime = now + config.blockDurationMs;
      this.logger.warn(`Rate limit exceeded for ${key}, blocking for ${config.blockDurationMs}ms`);
    }

    this.store.set(key, existing);
    return existing;
  }

  private getClientIp(req: Request): string {
    // Check various headers for the real IP
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    const cfConnectingIp = req.headers['cf-connecting-ip'] as string;
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIp || cfConnectingIp || req.socket.remoteAddress || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, data] of this.store.entries()) {
      if (now > data.resetTime && !data.blocked) {
        this.store.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired rate limit entries`);
    }
  }

  private generateRequestId(): string {
    return `rl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Manual methods for managing rate limits
  resetRateLimit(key: string): void {
    this.store.delete(key);
    this.logger.log(`Rate limit reset for ${key}`);
  }

  getRateLimitStatus(key: string): RateLimitData | null {
    return this.store.get(key) || null;
  }

  getAllRateLimitStatus(): { [key: string]: RateLimitData } {
    const status: { [key: string]: RateLimitData } = {};
    this.store.forEach((data, key) => {
      status[key] = data;
    });
    return status;
  }
} 