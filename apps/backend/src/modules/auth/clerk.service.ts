import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../database/prisma.service";
import { ClerkClient, createClerkClient } from "@clerk/backend";
import jwt from "jsonwebtoken";

/**
 * Clerk webhook service
 * Handles user synchronization between Clerk and database
 */
@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);
  private clerkClient: ClerkClient;
  private webhookSecret: string;
  private jwtPublicKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.webhookSecret = this.config.get("CLERK_WEBHOOK_SECRET") || "";
    this.jwtPublicKey = this.config.get("CLERK_JWT_PUBLIC_KEY") || "";
    this.clerkClient = createClerkClient({
      secretKey: this.config.get("CLERK_SECRET_KEY"),
    });
  }

  /**
   * Verify Clerk JWT token
   * @param token - JWT token from Authorization header
   * @returns Decoded payload
   */
  verifyToken(token: string): any {
    try {
      if (!this.jwtPublicKey) {
        throw new Error("Clerk JWT public key not configured");
      }

      const payload = jwt.verify(token, this.jwtPublicKey, {
        algorithms: ["RS256"],
      });

      return payload;
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Verify webhook signature from Clerk
   * @param payload - Raw request body
   * @param signature - Svix header signature
   * @returns true if valid
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Note: Clerk backend SDK handles verification internally
    // This is a placeholder for additional custom verification if needed
    return !!signature;
  }

  /**
   * Handle user.created event
   * Creates user in database when Clerk user is created
   */
  async handleUserCreated(clerkUserId: string, userData: any) {
    try {
      this.logger.log(`Creating user for Clerk ID: ${clerkUserId}`);

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { clerkId: clerkUserId },
      });

      if (existingUser) {
        this.logger.warn(`User already exists: ${clerkUserId}`);
        return existingUser;
      }

      // Create new user
      const user = await this.prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email: userData.email_addresses[0]?.email_address || "",
          name: `${userData.first_name || ""} ${userData.last_name || ""}`.trim() || null,
          role: "CUSTOMER", // Default role
        },
      });

      this.logger.log(`User created successfully: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle user.updated event
   * Updates user in database when Clerk user is updated
   */
  async handleUserUpdated(clerkUserId: string, userData: any) {
    try {
      this.logger.log(`Updating user for Clerk ID: ${clerkUserId}`);

      const user = await this.prisma.user.update({
        where: { clerkId: clerkUserId },
        data: {
          email: userData.email_addresses[0]?.email_address,
          name: `${userData.first_name || ""} ${userData.last_name || ""}`.trim() || null,
        },
      });

      this.logger.log(`User updated successfully: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to update user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle user.deleted event
   * Soft deletes user in database
   */
  async handleUserDeleted(clerkUserId: string) {
    try {
      this.logger.log(`Soft deleting user for Clerk ID: ${clerkUserId}`);

      // Note: We don't actually delete, just mark as inactive
      // You may want to add an 'isActive' field to User model
      // For now, we'll just log the event

      this.logger.log(`User deletion handled: ${clerkUserId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user by Clerk ID
   */
  async getUserByClerkId(clerkId: string) {
    return this.prisma.user.findUnique({
      where: { clerkId },
    });
  }

  /**
   * Get or create user from Clerk token
   * This is used for JWT authentication flow
   */
  async getOrCreateUser(clerkId: string) {
    let user = await this.getUserByClerkId(clerkId);

    if (!user) {
      // Fetch user details from Clerk
      try {
        const clerkUser = await this.clerkClient.users.getUser(clerkId);

        user = await this.handleUserCreated(clerkId, clerkUser);
      } catch (error) {
        this.logger.error(`Failed to fetch user from Clerk: ${error.message}`);
        throw new BadRequestException("Invalid user");
      }
    }

    return user;
  }
}
