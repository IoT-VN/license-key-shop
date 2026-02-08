import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { RequireRoles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuditLogService } from './audit-log.service';
import { IpReputationService } from './ip-reputation.service';
import { FraudDetectionService } from './fraud-detection.service';
import { RateLimitService } from './rate-limit.service';

@ApiTags('security')
@Controller('security')
@UseGuards(ClerkAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(
    private readonly audit: AuditLogService,
    private readonly ipReputation: IpReputationService,
    private readonly fraud: FraudDetectionService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Get('events')
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Query security events (admin only)' })
  async getEvents(
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};

    if (type) filters.type = type;
    if (severity) filters.severity = severity;
    if (ipAddress) filters.ipAddress = ipAddress;
    if (userId) filters.userId = userId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (limit) filters.limit = parseInt(limit, 10);

    return this.audit.queryEvents(filters);
  }

  @Get('stats')
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get security statistics (admin only)' })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const timeRange = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 86400000 * 7),
      endDate: endDate ? new Date(endDate) : new Date(),
    };

    return this.audit.getStats(timeRange);
  }

  @Get('fraud-check/:userId')
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get fraud statistics for user (admin only)' })
  async getUserFraudStats(@Param('userId') userId: string) {
    return this.fraud.getUserFraudStats(userId);
  }

  @Post('ip-block')
  @RequireRoles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Block IP address (admin only)' })
  async blockIp(
    @Body() body: { ipAddress: string; reason: string; duration?: number },
  ) {
    await this.ipReputation.blockIp(body.ipAddress, body.reason, body.duration);
  }

  @Delete('ip-block/:ipAddress')
  @RequireRoles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock IP address (admin only)' })
  async unblockIp(@Param('ipAddress') ipAddress: string) {
    await this.ipReputation.unblockIp(ipAddress);
  }

  @Post('ip-whitelist')
  @RequireRoles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Whitelist IP address (admin only)' })
  async whitelistIp(@Body() body: { ipAddress: string }) {
    await this.ipReputation.whitelistIp(body.ipAddress);
  }

  @Post('rate-limit-reset')
  @RequireRoles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset rate limit for identifier (admin only)' })
  async resetRateLimit(@Body() body: { identifier: string }) {
    await this.rateLimit.resetRateLimit(body.identifier);
  }

  @Get('ip-reputation/:ipAddress')
  @RequireRoles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Check IP reputation (admin only)' })
  async checkIpReputation(@Param('ipAddress') ipAddress: string) {
    return this.ipReputation.checkReputation(ipAddress);
  }
}
