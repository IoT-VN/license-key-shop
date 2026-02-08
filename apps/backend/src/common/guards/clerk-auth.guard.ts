import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from "@nestjs/common";
import { ClerkService } from "../../modules/auth/clerk.service";
import { verifyToken } from "@clerk/backend";

/**
 * Clerk JWT authentication guard
 * Verifies Clerk JWT tokens and extracts user info
 */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(private readonly clerkService: ClerkService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn("Missing authorization header");
      throw new UnauthorizedException("Authorization token required");
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      this.logger.warn("Invalid authorization format");
      throw new UnauthorizedException("Invalid authorization format");
    }

    try {
      // Verify Clerk JWT token
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      if (!payload?.sub) {
        this.logger.warn("Invalid token payload");
        throw new UnauthorizedException("Invalid token");
      }

      // Get or create user in database
      const user = await this.clerkService.getOrCreateUser(payload.sub);

      // Attach user to request
      request.user = user;
      request.clerkUserId = payload.sub;

      return true;
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
