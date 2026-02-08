import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LicenseKeysService } from './license-keys.service';
import {
  GenerateKeyDto,
  GenerateKeysDto,
  KeyGenerationResponse,
  BatchGenerationStatus,
} from './dto/generate-key.dto';
import { ValidateKeyDto, ValidationResult } from './dto/validate-key.dto';
import { RevokeKeyDto, RevocationResponse } from './dto/revoke-key.dto';
import { QueryKeysDto, PaginatedKeysResponse } from './dto/query-key.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { Throttle } from '@nestjs/throttler';

/**
 * License keys controller
 * Provides admin endpoints for key management and public validation API
 */
@Controller('license-keys')
export class LicenseKeysController {
  constructor(private readonly licenseKeysService: LicenseKeysService) {}

  /**
   * Generate a single license key (admin only)
   */
  @Post('generate')
  @UseGuards(AdminGuard)
  async generateSingle(@Body() dto: GenerateKeyDto): Promise<KeyGenerationResponse> {
    const key = await this.licenseKeysService.generateKey(dto.productId);
    return {
      keyString: key.keyString,
      productId: key.productId,
      status: key.status,
      createdAt: key.createdAt,
    };
  }

  /**
   * Generate multiple license keys (admin only)
   */
  @Post('generate/batch')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async generateBatch(@Body() dto: GenerateKeysDto) {
    const result = await this.licenseKeysService.generateKeys(
      dto.productId,
      dto.count,
      {
        validityDays: dto.validityDays,
        maxActivations: dto.maxActivations,
      },
    );
    return result;
  }

  /**
   * Validate a license key (public API)
   * Rate limited: 10 requests per second
   */
  @Post('validate')
  @Throttle({ default: { limit: 10, ttl: 1000 } })
  @HttpCode(HttpStatus.OK)
  async validate(@Body() dto: ValidateKeyDto): Promise<ValidationResult> {
    return this.licenseKeysService.validateKey(dto.keyString, {
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
    });
  }

  /**
   * Revoke a license key (admin only)
   */
  @Post('revoke')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async revoke(@Body() dto: RevokeKeyDto): Promise<RevocationResponse> {
    const key = await this.licenseKeysService.revokeKey(
      dto.keyString,
      dto.reason.toString(),
      dto.notes,
    );
    return {
      keyString: key.keyString,
      status: key.status,
      revokedAt: key.revokedAt!,
      reason: key.revokedReason!,
      notes: dto.notes,
    };
  }

  /**
   * Get key by ID (admin only)
   */
  @Get(':id')
  @UseGuards(AdminGuard)
  async getById(@Param('id') id: string) {
    return this.licenseKeysService.getKey(id);
  }

  /**
   * Get key by key string (admin only)
   */
  @Get('key-string/:keyString')
  @UseGuards(AdminGuard)
  async getByKeyString(@Param('keyString') keyString: string) {
    return this.licenseKeysService.getKeyByKeyString(keyString);
  }

  /**
   * Query keys with filters (admin only)
   */
  @Get()
  @UseGuards(AdminGuard)
  async query(@Query() query: QueryKeysDto): Promise<PaginatedKeysResponse> {
    return this.licenseKeysService.queryKeys(query);
  }

  /**
   * Get key statistics (admin only)
   */
  @Get('stats/summary')
  @UseGuards(AdminGuard)
  async getStats(@Query('productId') productId?: string) {
    return this.licenseKeysService.getStats(productId);
  }
}
