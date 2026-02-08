import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { ClerkService } from "./clerk.service";

/**
 * Clerk authentication guard
 * Validates JWT tokens from Clerk
 */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(private readonly clerk: ClerkService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      // Get Authorization header
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        throw new UnauthorizedException("No authorization header");
      }

      // Extract token (Bearer <token>)
      const token = authHeader.replace("Bearer ", "");

      if (!token) {
        throw new UnauthorizedException("No token provided");
      }

      // Verify token with Clerk (decode JWT)
      const payload = this.clerk.verifyToken(token);

      if (!payload) {
        throw new UnauthorizedException("Invalid token");
      }

      // Get user from database
      const user = await this.clerk.getOrCreateUser(payload.sub);

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      // Attach user to request
      request.user = user;

      return true;
    } catch (error) {
      this.logger.error(`Auth failed: ${error.message}`);
      throw new UnauthorizedException("Authentication failed");
    }
  }
}
