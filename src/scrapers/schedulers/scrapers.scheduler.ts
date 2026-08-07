import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ScrapersQueueService } from '../scrapers-queue.service';

@Injectable()
export class ScrapersSchedulerService {
  private readonly logger = new Logger(ScrapersSchedulerService.name);

  constructor(private readonly queueService: ScrapersQueueService) {}

  @Cron('*/2 * * * *')
  async handleLiveTier1Matches() {
    this.logger.log('[CRON Tier 1 Live] Disparando actualizacion de partidos Top/Favoritos en vivo...');
    try {
      await this.queueService.queueSyncAll({
        priority: 1,
        tier: 1,
        includeDetails: true,
      });
    } catch (error: any) {
      this.logger.error(`Error al encolar sync Tier 1 en vivo: ${error.message}`);
    }
  }

  @Cron('*/15 * * * *')
  async handleLiveTier2Matches() {
    this.logger.log('[CRON Tier 2 Menores] Disparando actualizacion basica de ligas secundarias...');
    try {
      await this.queueService.queueSyncAll({
        priority: 6,
        tier: 2,
        includeDetails: false,
      });
    } catch (error: any) {
      this.logger.error(`Error al encolar sync Tier 2: ${error.message}`);
    }
  }

  @Cron('0 */6 * * *')
  async handleFixtureSync() {
    this.logger.log('[CRON Fixture] Disparando refresco periodico de calendarios...');
    try {
      await this.queueService.queueSyncAll({
        priority: 5,
        includeDetails: true,
      });
    } catch (error: any) {
      this.logger.error(`Error al encolar sync de fixtures: ${error.message}`);
    }
  }

  @Cron('0 4 * * *', {
    timeZone: 'America/Santiago',
  })
  async handleDailyConsolidation() {
    this.logger.log('[CRON Diario] Disparando consolidacion general de resultados...');
    try {
      await this.queueService.queueSyncAll({
        priority: 3,
        includeDetails: true,
      });
    } catch (error: any) {
      this.logger.error(`Error al encolar consolidacion diaria: ${error.message}`);
    }
  }

  @Cron('0 3 * * 0', {
    timeZone: 'America/Santiago',
  })
  async handleWeeklyCleanup() {
    this.logger.log('[CRON Mantenimiento] Disparando purga de logs antiguos...');
    try {
      await this.queueService.queueCleanupLogs(30);
    } catch (error: any) {
      this.logger.error(`Error al encolar limpieza de logs: ${error.message}`);
    }
  }
}
