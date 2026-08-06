import { Controller, Post, Get, Param, Query } from '@nestjs/common';
import { ScrapersService } from './scrapers.service';

@Controller('scrapers')
export class ScrapersController {
  constructor(private readonly scrapersService: ScrapersService) {}

  /**
   * Sincroniza todas las disciplinas soportadas
   * POST /scrapers/sync-all
   */
  @Post('sync-all')
  async syncAll() {
    const results = await this.scrapersService.syncAll();
    return {
      message: 'Sincronización general completada',
      results,
    };
  }

  /**
   * Sincroniza un deporte en particular (nba, football, ufc, esports)
   * POST /scrapers/sync/:sport
   */
  @Post('sync/:sport')
  async syncSport(@Param('sport') sport: string) {
    const result = await this.scrapersService.syncSport(sport);
    return {
      message: `Sincronización de ${sport} completada`,
      result,
    };
  }

  /**
   * Obtiene la bitácora de auditoría de los scrapers
   * GET /scrapers/logs?limit=20
   */
  @Get('logs')
  async getLogs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.scrapersService.getLogs(parsedLimit);
  }
}
