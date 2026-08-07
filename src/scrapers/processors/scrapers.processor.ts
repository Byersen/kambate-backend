import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  SCRAPERS_QUEUE_NAME,
  SCRAPER_JOBS,
} from '../constants/scraper-queues.constant';
import { ScrapersService } from '../scrapers.service';
import { NbaScraperService } from '../providers/nba.scraper';
import { FootballScraperService } from '../providers/football.scraper';
import { UfcScraperService } from '../providers/ufc.scraper';
import { EsportsScraperService } from '../providers/esports.scraper';
import { SyncOptions } from '../interfaces/scraper.interface';

@Processor(SCRAPERS_QUEUE_NAME, {
  concurrency: 2,
})
export class ScrapersProcessor extends WorkerHost {
  private readonly logger = new Logger(ScrapersProcessor.name);

  constructor(
    private readonly scrapersService: ScrapersService,
    private readonly nbaScraper: NbaScraperService,
    private readonly footballScraper: FootballScraperService,
    private readonly ufcScraper: UfcScraperService,
    private readonly esportsScraper: EsportsScraperService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const attempt = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts || 1;
    this.logger.log(
      `Procesando job [${job.name}] (ID: ${job.id}, Intento ${attempt}/${maxAttempts})...`,
    );

    const syncOptions: SyncOptions = {
      tier: job.data?.tier,
      includeDetails: job.data?.includeDetails ?? true,
    };

    switch (job.name) {
      case SCRAPER_JOBS.SYNC_ALL:
        return await this.scrapersService.syncAll(syncOptions);

      case SCRAPER_JOBS.SYNC_NBA:
        return await this.nbaScraper.sync(syncOptions);

      case SCRAPER_JOBS.SYNC_FOOTBALL:
        return await this.footballScraper.sync(syncOptions);

      case SCRAPER_JOBS.SYNC_UFC:
        return await this.ufcScraper.sync(syncOptions);

      case SCRAPER_JOBS.SYNC_ESPORTS:
        return await this.esportsScraper.sync(syncOptions);

      case SCRAPER_JOBS.CLEANUP_LOGS:
        return await this.scrapersService.cleanupLogs(job.data?.daysToKeep ?? 30);

      default:
        throw new Error(`Tipo de trabajo no reconocido: '${job.name}'`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job [${job.name}] #${job.id} completado con exito.`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job [${job.name}] #${job.id} fallo en el intento ${job.attemptsMade}: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(
      `Job #${jobId} ha quedado estancado (stalled). BullMQ lo reintentara.`,
    );
  }
}
