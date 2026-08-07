import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import {
  SCRAPERS_QUEUE_NAME,
  SCRAPER_JOBS,
} from './constants/scraper-queues.constant';

@Injectable()
export class ScrapersQueueService {
  private readonly logger = new Logger(ScrapersQueueService.name);

  private readonly defaultJobOptions: JobsOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600,
      count: 100,
    },
    removeOnFail: {
      count: 500,
    },
  };

  constructor(
    @InjectQueue(SCRAPERS_QUEUE_NAME)
    private readonly scrapersQueue: Queue,
  ) {}

  async queueSyncAll(options?: {
    priority?: number;
    tier?: number;
    includeDetails?: boolean;
  }) {
    const jobId = `sync-all-${options?.tier ? `t${options.tier}-` : ''}${Date.now()}`;
    this.logger.log(`Encolando job general: ${jobId}`);

    const job = await this.scrapersQueue.add(
      SCRAPER_JOBS.SYNC_ALL,
      {
        triggeredAt: new Date().toISOString(),
        tier: options?.tier,
        includeDetails: options?.includeDetails ?? true,
      },
      {
        ...this.defaultJobOptions,
        jobId,
        priority: options?.priority ?? 5,
      },
    );

    return {
      message: 'Job de sincronizacion general encolado correctamente.',
      jobId: job.id,
      name: job.name,
    };
  }

  async queueSyncSport(
    sportSlug: string,
    options?: {
      priority?: number;
      tier?: number;
      includeDetails?: boolean;
    },
  ) {
    const slug = sportSlug.toLowerCase().trim();
    let jobName: string;

    switch (slug) {
      case 'nba':
      case 'basketball':
        jobName = SCRAPER_JOBS.SYNC_NBA;
        break;
      case 'football':
      case 'soccer':
      case 'futbol':
        jobName = SCRAPER_JOBS.SYNC_FOOTBALL;
        break;
      case 'ufc':
      case 'mma':
        jobName = SCRAPER_JOBS.SYNC_UFC;
        break;
      case 'esports':
      case 'lol':
      case 'valorant':
        jobName = SCRAPER_JOBS.SYNC_ESPORTS;
        break;
      default:
        throw new BadRequestException(
          `Deporte no soportado: '${sportSlug}'. Opciones validas: nba, football, ufc, esports.`,
        );
    }

    const jobId = `${jobName}-${options?.tier ? `t${options.tier}-` : ''}${Date.now()}`;
    this.logger.log(`Encolando job para ${slug}: ${jobId}`);

    const job = await this.scrapersQueue.add(
      jobName,
      {
        sport: slug,
        triggeredAt: new Date().toISOString(),
        tier: options?.tier,
        includeDetails: options?.includeDetails ?? true,
      },
      {
        ...this.defaultJobOptions,
        jobId,
        priority: options?.priority ?? 5,
      },
    );

    return {
      message: `Job de sincronizacion para '${slug}' encolado correctamente.`,
      jobId: job.id,
      name: job.name,
    };
  }

  async queueCleanupLogs(daysToKeep = 30) {
    const jobId = `cleanup-logs-${Date.now()}`;
    this.logger.log(`Encolando job de purgado de logs: ${jobId}`);

    const job = await this.scrapersQueue.add(
      SCRAPER_JOBS.CLEANUP_LOGS,
      { daysToKeep, triggeredAt: new Date().toISOString() },
      {
        ...this.defaultJobOptions,
        jobId,
        priority: 10,
      },
    );

    return {
      message: `Job de limpieza de logs (> ${daysToKeep} dias) encolado correctamente.`,
      jobId: job.id,
      name: job.name,
    };
  }

  async getQueueMetrics() {
    const [counts, isPaused] = await Promise.all([
      this.scrapersQueue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'paused',
      ),
      this.scrapersQueue.isPaused(),
    ]);

    return {
      queueName: SCRAPERS_QUEUE_NAME,
      isPaused,
      metrics: counts,
      timestamp: new Date(),
    };
  }
}
