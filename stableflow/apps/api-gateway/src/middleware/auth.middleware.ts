import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { verify, JwtPayload } from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
  };
  requestId?: string;
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);
  private readonly jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

  // Paths that don't require authentication
  private readonly publicPaths = [
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/health',
    '/health',
    '/api/docs',
    '/api-docs',
  ];

  // Internal service paths (require special handling)
  private readonly internalPaths = [
    '/api/v1/audit/log-transaction',
    '/api/v1/audit/log-event',
    '/api/v1/wallets/internal',
    '/api/v1/transactions/internal',
  ];

  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const requestId = req.requestId || this.generateRequestId();
    req.requestId = requestId;

    const path = req.path;
    const method = req.method;

    // Skip authentication for public paths
    if (this.isPublicPath(path)) {
      this.logger.debug(`Public path accessed: ${method} ${path} [${requestId}]`);
      return next();
    }

    // Handle internal service calls
    if (this.isInternalPath(path)) {
      if (!this.validateInternalRequest(req)) {
        this.logger.warn(`Unauthorized internal request: ${method} ${path} [${requestId}]`);
        throw new UnauthorizedException({
          message: 'Invalid internal service credentials',
          error: 'Unauthorized',
          statusCode: 401,
          requestId,
        });
      }
      return next();
    }

    // Extract JWT token
    const token = this.extractToken(req);
    if (!token) {
      this.logger.warn(`Missing token: ${method} ${path} [${requestId}]`);
      throw new UnauthorizedException({
        message: 'Authentication token is required',
        error: 'Unauthorized',
        statusCode: 401,
        requestId,
      });
    }

    try {
      // Verify JWT token
      const decoded = verify(token, this.jwtSecret) as JwtPayload & {
        id: number;
        email: string;
        role: string;
      };

      // Attach user information to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        iat: decoded.iat,
        exp: decoded.exp,
      };

      // Add user ID to headers for downstream services
      req.headers['x-user-id'] = decoded.id.toString();
      req.headers['x-user-email'] = decoded.email;
      req.headers['x-user-role'] = decoded.role;

      this.logger.debug(`Authenticated user ${decoded.email}: ${method} ${path} [${requestId}]`);
      next();
    } catch (error) {
      this.logger.warn(`Invalid token: ${method} ${path} [${requestId}] - ${error.message}`);
      
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          message: 'Authentication token has expired',
          error: 'Token Expired',
          statusCode: 401,
          requestId,
        });
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException({
          message: 'Invalid authentication token',
          error: 'Invalid Token',
          statusCode: 401,
          requestId,
        });
      } else {
        throw new UnauthorizedException({
          message: 'Authentication failed',
          error: 'Unauthorized',
          statusCode: 401,
          requestId,
        });
      }
    }
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Also check for token in query params (for WebSocket connections)
    const queryToken = req.query.token as string;
    if (queryToken) {
      return queryToken;
    }
    
    return null;
  }

  private isPublicPath(path: string): boolean {
    return this.publicPaths.some(publicPath => 
      path.startsWith(publicPath) || path === publicPath
    );
  }

  private isInternalPath(path: string): boolean {
    return this.internalPaths.some(internalPath => 
      path.startsWith(internalPath)
    );
  }

  private validateInternalRequest(req: Request): boolean {
    // Check for internal service token or API key
    const internalToken = req.headers['x-internal-token'] as string;
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN || 'internal-service-secret';
    
    return internalToken === expectedToken;
  }

  private generateRequestId(): string {
    return `gw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
} 