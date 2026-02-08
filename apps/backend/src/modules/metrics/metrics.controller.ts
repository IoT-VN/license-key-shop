import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  async getMetrics() {
    const metrics = await this.metricsService.getMetrics();
    return metrics;
  }
}
