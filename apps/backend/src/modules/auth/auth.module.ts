import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ClerkController } from "./clerk.controller";
import { ClerkService } from "./clerk.service";
import { ClerkAuthGuard } from "./clerk-auth.guard";

/**
 * Clerk authentication module
 * Handles webhook events and user synchronization
 */
@Module({
  imports: [ConfigModule],
  controllers: [ClerkController],
  providers: [ClerkService, ClerkAuthGuard],
  exports: [ClerkService, ClerkAuthGuard],
})
export class ClerkModule {}
