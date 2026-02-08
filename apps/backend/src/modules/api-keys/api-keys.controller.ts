import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

@ApiTags('api-keys')
@Controller('api/api-keys')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Generate new API key' })
  @ApiResponse({ status: 201, description: 'API key created' })
  async generateKey(@Request() req: any, @Body() body: { name: string; rateLimit?: number }) {
    const userId = req.user?.sub || req.user?.id;
    return this.apiKeysService.generateApiKey(userId, body.name, body.rateLimit);
  }

  @Get()
  @ApiOperation({ summary: 'List user API keys' })
  @ApiResponse({ status: 200, description: 'API keys list' })
  async listKeys(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.apiKeysService.listApiKeys(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke API key' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  async revokeKey(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.sub || req.user?.id;
    return this.apiKeysService.revokeApiKey(id, userId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get API key usage stats' })
  @ApiResponse({ status: 200, description: 'Usage statistics' })
  async getStats(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.sub || req.user?.id;
    return this.apiKeysService.getApiKeyStats(id, userId);
  }
}
