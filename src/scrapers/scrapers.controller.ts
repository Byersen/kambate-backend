import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ScrapersService } from './scrapers.service';
import { ScrapersQueueService } from './scrapers-queue.service';

@Controller('scrapers')
export class ScrapersController {
  constructor(
    private readonly scrapersService: ScrapersService,
    private readonly queueService: ScrapersQueueService,
  ) {}

  @Post('sync-all')
  async syncAll() {
    const results = await this.scrapersService.syncAll();
    return {
      message: 'Sincronizacion general completada',
      results,
    };
  }

  @Post('sync/:sport')
  async syncSport(@Param('sport') sport: string) {
    const result = await this.scrapersService.syncSport(sport);
    return {
      message: `Sincronizacion de ${sport} completada`,
      result,
    };
  }

  @Post('queue/sync-all')
  async queueSyncAll() {
    return this.queueService.queueSyncAll();
  }

  @Post('queue/sync/:sport')
  async queueSyncSport(@Param('sport') sport: string) {
    return this.queueService.queueSyncSport(sport);
  }

  @Get('queue/metrics')
  async getQueueMetrics() {
    return this.queueService.getQueueMetrics();
  }

  @Get('leagues')
  async getLeagues(@Query('sport') sport?: string) {
    return this.scrapersService.getLeagues(sport);
  }

  @Post('leagues/:slug/status')
  async setLeagueStatus(
    @Param('slug') slug: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.scrapersService.setLeagueStatus(slug, isActive ?? true);
  }

  @Delete('seasons/purge')
  async purgeSeasonData(@Query('season') seasonSlug?: string) {
    return this.scrapersService.purgeSeasonData(seasonSlug);
  }

  @Post('seasons/start-new')
  async startNewSeason(
    @Body()
    body: {
      name: string;
      slug: string;
      startDate?: string;
      endDate?: string;
      purgePreviousData?: boolean;
    },
  ) {
    return this.scrapersService.startNewSeason({
      name: body.name,
      slug: body.slug,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      purgePreviousData: body.purgePreviousData ?? true,
    });
  }

  @Get('logs')
  async getLogs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.scrapersService.getLogs(parsedLimit);
  }

  @Delete('logs/cleanup')
  async cleanupLogs(@Query('days') days?: string) {
    const daysToKeep = days ? parseInt(days, 10) : 30;
    return this.scrapersService.cleanupLogs(daysToKeep);
  }
}
