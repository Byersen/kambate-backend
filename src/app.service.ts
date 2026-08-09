import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { ScrapersQueueService } from './scrapers/scrapers-queue.service';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  version: string;
  services: {
    database: {
      status: 'up' | 'down';
      latencyMs: number;
      error?: string;
    };
    redisQueue: {
      status: 'up' | 'down';
      latencyMs: number;
      activeJobs?: number;
      waitingJobs?: number;
      failedJobs?: number;
      error?: string;
    };
  };
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: ScrapersQueueService,
  ) {}

  getInfo() {
    return {
      name: 'Kambate Backend Ingestion Engine',
      version: '0.0.1',
      status: 'running',
      timestamp: new Date().toISOString(),
      docs: {
        health: '/health',
        metrics: '/scrapers/queue/metrics',
        leagues: '/scrapers/leagues',
        logs: '/scrapers/logs',
      },
    };
  }

  async getHealth(): Promise<HealthCheckResult> {
    const startDb = Date.now();
    let dbStatus: 'up' | 'down' = 'down';
    let dbLatencyMs = 0;
    let dbError: string | undefined;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - startDb;
      dbStatus = 'up';
    } catch (err: any) {
      dbLatencyMs = Date.now() - startDb;
      dbError = err?.message || 'Database connection error';
      this.logger.error(`Database health check failed: ${dbError}`);
    }

    const startRedis = Date.now();
    let redisStatus: 'up' | 'down' = 'down';
    let redisLatencyMs = 0;
    let redisError: string | undefined;
    let activeJobs = 0;
    let waitingJobs = 0;
    let failedJobs = 0;

    try {
      const queueMetrics = await this.queueService.getQueueMetrics();
      redisLatencyMs = Date.now() - startRedis;
      redisStatus = 'up';
      activeJobs = queueMetrics.metrics.active;
      waitingJobs = queueMetrics.metrics.waiting;
      failedJobs = queueMetrics.metrics.failed;
    } catch (err: any) {
      redisLatencyMs = Date.now() - startRedis;
      redisError = err?.message || 'Redis queue connection error';
      this.logger.error(`Redis health check failed: ${redisError}`);
    }

    let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';
    if (dbStatus === 'down' && redisStatus === 'down') {
      overallStatus = 'error';
    } else if (dbStatus === 'down' || redisStatus === 'down') {
      overallStatus = 'degraded';
    }

    const mem = process.memoryUsage();

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      version: '0.0.1',
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
          error: dbError,
        },
        redisQueue: {
          status: redisStatus,
          latencyMs: redisLatencyMs,
          activeJobs,
          waitingJobs,
          failedJobs,
          error: redisError,
        },
      },
      memory: {
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      },
    };
  }
}
