import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

/**
 * Users service
 * Handles user profile operations
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: { name?: string }) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          updatedAt: true,
        },
      });

      this.logger.log(`Profile updated for user: ${userId}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to update profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user by Clerk ID
   */
  async getByClerkId(clerkId: string) {
    return this.prisma.user.findUnique({
      where: { clerkId },
    });
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update user role (admin only)
   */
  async updateRole(userId: string, role: "CUSTOMER" | "ADMIN") {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          email: true,
          role: true,
          updatedAt: true,
        },
      });

      this.logger.log(`Role updated for user ${userId} to ${role}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to update role: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get dashboard statistics for user
   */
  async getDashboardStats(userId: string) {
    const [totalPurchases, licenseKeys, purchases] = await Promise.all([
      this.prisma.purchase.count({
        where: {
          userId,
          status: { in: ["COMPLETED", "REFUNDED"] },
        },
      }),
      this.prisma.licenseKey.findMany({
        where: {
          purchase: { userId },
        },
        include: {
          product: true,
        },
      }),
      this.prisma.purchase.findMany({
        where: {
          userId,
          status: "COMPLETED",
        },
        include: {
          product: true,
        },
      }),
    ]);

    const activeKeys = licenseKeys.filter((k) => k.status === "ACTIVE").length;
    const totalSpent = purchases
      .filter((p) => p.status !== "REFUNDED")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      totalPurchases,
      activeKeys,
      totalSpent: totalSpent.toFixed(2),
      availableLicenses: licenseKeys.filter((k) => k.status === "SOLD").length,
    };
  }

  /**
   * Get user purchases with pagination
   */
  async getUserPurchases(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [purchases, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where: { userId },
        include: {
          product: true,
          licenseKey: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.purchase.count({ where: { userId } }),
    ]);

    return {
      data: purchases,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user license keys with pagination
   */
  async getUserLicenseKeys(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [licenseKeys, total] = await Promise.all([
      this.prisma.licenseKey.findMany({
        where: {
          purchase: { userId },
        },
        include: {
          product: true,
          validationLogs: {
            take: 10,
            orderBy: { createdAt: "desc" },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.licenseKey.count({
        where: {
          purchase: { userId },
        },
      }),
    ]);

    return {
      data: licenseKeys,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get purchase by ID (user must own it)
   */
  async getUserPurchaseById(userId: string, purchaseId: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        userId,
      },
      include: {
        product: true,
        licenseKey: true,
        transactions: true,
        refund: true,
      },
    });

    if (!purchase) {
      throw new Error("Purchase not found");
    }

    return purchase;
  }

  /**
   * Get license key by ID (user must own it)
   */
  async getUserLicenseKeyById(userId: string, keyId: string) {
    const licenseKey = await this.prisma.licenseKey.findFirst({
      where: {
        id: keyId,
        purchase: { userId },
      },
      include: {
        product: true,
        purchase: true,
        validationLogs: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!licenseKey) {
      throw new Error("License key not found");
    }

    return licenseKey;
  }
}
