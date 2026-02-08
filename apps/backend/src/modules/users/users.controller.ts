import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Query,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { ClerkAuthGuard } from "../../common/guards/clerk-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import type { Request } from "express";

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Users controller
 * Manages user profiles and admin operations
 */
@Controller("users")
@UseGuards(ClerkAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get current user profile
   */
  @Get("profile")
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.usersService.getProfile(req.user.id);
  }

  /**
   * Update current user profile
   */
  @Put("profile")
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Req() req: AuthenticatedRequest, @Body() data: { name?: string }) {
    return this.usersService.updateProfile(req.user.id, data);
  }

  /**
   * Get all users (admin only)
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  async getAllUsers(
    @Req() req: AuthenticatedRequest,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.usersService.getAllUsers(pageNum, limitNum);
  }

  /**
   * Update user role (admin only)
   */
  @Put(":id/role")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  async updateRole(
    @Param("id") userId: string,
    @Body() data: { role: "CUSTOMER" | "ADMIN" },
  ) {
    return this.usersService.updateRole(userId, data.role);
  }

  /**
   * Get user dashboard stats
   */
  @Get("stats")
  async getStats(@Req() req: AuthenticatedRequest) {
    return this.usersService.getDashboardStats(req.user.id);
  }

  /**
   * Get user purchases
   */
  @Get("purchases")
  async getPurchases(
    @Req() req: AuthenticatedRequest,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.usersService.getUserPurchases(req.user.id, pageNum, limitNum);
  }

  /**
   * Get user license keys
   */
  @Get("license-keys")
  async getLicenseKeys(
    @Req() req: AuthenticatedRequest,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.usersService.getUserLicenseKeys(req.user.id, pageNum, limitNum);
  }

  /**
   * Get purchase by ID
   */
  @Get("purchases/:id")
  async getPurchaseById(@Req() req: AuthenticatedRequest, @Param("id") purchaseId: string) {
    return this.usersService.getUserPurchaseById(req.user.id, purchaseId);
  }

  /**
   * Get license key by ID
   */
  @Get("license-keys/:id")
  async getLicenseKeyById(@Req() req: AuthenticatedRequest, @Param("id") keyId: string) {
    return this.usersService.getUserLicenseKeyById(req.user.id, keyId);
  }
}
