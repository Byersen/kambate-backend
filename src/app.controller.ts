import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { AppService, HealthCheckResult } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getInfo() {
    return this.appService.getInfo();
  }

  @Get('health')
  async getHealth(@Res({ passthrough: true }) res: Response): Promise<HealthCheckResult> {
    const health = await this.appService.getHealth();
    if (health.status === 'error') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    } else if (health.status === 'degraded') {
      res.status(HttpStatus.OK);
    } else {
      res.status(HttpStatus.OK);
    }
    return health;
  }
}
