import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  Header,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ValidationService } from './validation.service';
import { RateLimitService } from '../security/rate-limit.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ValidateKeyDto, ValidationResultDto, RateLimitExceededDto } from './dto/validate-key.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('validation')
@Controller('api/v1')
export class ValidationController {
  constructor(
    private readonly validationService: ValidationService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post('validate')
  @UseGuards(ApiKeyGuard)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate license key',
    description: 'Validate a license key using API key authentication. Rate limited to 10,000 requests per hour per API key.',
  })
  @ApiResponse({ status: 200, type: ValidationResultDto, description: 'Validation result' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  @ApiResponse({ status: 429, type: RateLimitExceededDto, description: 'Rate limit exceeded' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Header('X-RateLimit-Limit', '10000')
  @Header('X-RateLimit-Duration', '3600')
  async validate(
    @Request() req: any,
    @Body() dto: ValidateKeyDto,
  ): Promise<ValidationResultDto | RateLimitExceededDto> {
    const apiKey = req.apiKey;

    // Check rate limit using centralized security service
    const rateLimitResult = await this.rateLimitService.checkApiKeyRateLimit(
      apiKey.id,
      apiKey.rateLimit,
    );

    if (!rateLimitResult.allowed) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: rateLimitResult.resetAt,
        message: 'Rate limit exceeded. Try again later.',
      } as any;
    }

    // Validate license key
    const result = await this.validationService.validateKey(
      dto.licenseKey,
      apiKey.id,
      {
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
    );

    // Add rate limit headers
    req.res?.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    req.res?.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString());

    return result as ValidationResultDto | RateLimitExceededDto;
  }
}
