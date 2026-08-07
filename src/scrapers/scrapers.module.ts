import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../database/database.module';
import { SCRAPERS_QUEUE_NAME } from './constants/scraper-queues.constant';
import { ScrapersService } from './scrapers.service';
import { ScrapersQueueService } from './scrapers-queue.service';
import { ScrapersProcessor } from './processors/scrapers.processor';
import { ScrapersSchedulerService } from './schedulers/scrapers.scheduler';
import { ScrapersController } from './scrapers.controller';
import { NbaScraperService } from './providers/nba.scraper';
import { FootballScraperService } from './providers/football.scraper';
import { UfcScraperService } from './providers/ufc.scraper';
import { EsportsScraperService } from './providers/esports.scraper';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: SCRAPERS_QUEUE_NAME,
    }),
  ],
  controllers: [ScrapersController],
  providers: [
    ScrapersService,
    ScrapersQueueService,
    ScrapersProcessor,
    ScrapersSchedulerService,
    NbaScraperService,
    FootballScraperService,
    UfcScraperService,
    EsportsScraperService,
  ],
  exports: [
    ScrapersService,
    ScrapersQueueService,
    ScrapersProcessor,
    ScrapersSchedulerService,
    NbaScraperService,
    FootballScraperService,
    UfcScraperService,
    EsportsScraperService,
  ],
})
export class ScrapersModule {}
