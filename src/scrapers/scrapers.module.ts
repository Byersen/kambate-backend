import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../database/database.module';
import { ScrapersService } from './scrapers.service';
import { ScrapersController } from './scrapers.controller';
import { NbaScraperService } from './providers/nba.scraper';
import { FootballScraperService } from './providers/football.scraper';
import { UfcScraperService } from './providers/ufc.scraper';
import { EsportsScraperService } from './providers/esports.scraper';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  controllers: [ScrapersController],
  providers: [
    ScrapersService,
    NbaScraperService,
    FootballScraperService,
    UfcScraperService,
    EsportsScraperService,
  ],
  exports: [
    ScrapersService,
    NbaScraperService,
    FootballScraperService,
    UfcScraperService,
    EsportsScraperService,
  ],
})
export class ScrapersModule {}
