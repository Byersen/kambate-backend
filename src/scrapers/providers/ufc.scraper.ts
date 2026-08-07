import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseScraper } from './base.scraper';
import { SyncResult, SyncOptions, UnifiedScrapedEvent } from '../interfaces/scraper.interface';
import axios from 'axios';

@Injectable()
export class UfcScraperService extends BaseScraper {
  protected readonly logger = new Logger(UfcScraperService.name);
  protected readonly sportSlug = 'ufc';
  protected readonly sportName = 'UFC';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async sync(options?: SyncOptions): Promise<SyncResult> {
    const includeDetails = options?.includeDetails ?? true;
    this.logger.log('Iniciando sincronizacion de combates UFC...');
    let itemsSynced = 0;

    try {
      const response = await axios.get(
        'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard',
        { timeout: 10000 }
      );

      const events = response.data?.events || [];

      for (const event of events) {
        const competitions = event.competitions || [];

        for (const comp of competitions) {
          const competitors = comp.competitors || [];
          if (competitors.length < 2) continue;

          const fighter1 = competitors[0];
          const fighter2 = competitors[1];

          const state = comp.status?.type?.state;
          let status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELED' = 'SCHEDULED';
          if (state === 'in') status = 'LIVE';
          else if (state === 'post') status = 'FINISHED';

          const method = comp.status?.type?.detail || comp.status?.type?.description || (status === 'FINISHED' ? 'Decision/KO' : undefined);
          const round = comp.status?.period || 1;
          const time = comp.status?.displayClock || '';

          const fighter1Won = fighter1.winner === true;
          const fighter2Won = fighter2.winner === true;
          let scoreText = 'vs';
          if (status === 'FINISHED') {
            if (fighter1Won) scoreText = `W - L (${method || 'Win'})`;
            else if (fighter2Won) scoreText = `L - W (${method || 'Win'})`;
            else scoreText = method || 'Draw/NC';
          }

          const externalId = `ufc-${event.id}-${comp.id || `${fighter1.id}-${fighter2.id}`}`;

          const unifiedEvent: UnifiedScrapedEvent = {
            externalId,
            sportSlug: this.sportSlug,
            sportName: this.sportName,
            startDate: new Date(comp.date || event.date),
            status,
            score: scoreText,
            participants: [
              {
                name: fighter1.athlete?.displayName || fighter1.athlete?.name || 'Peleador 1',
                logoUrl: fighter1.athlete?.headshot?.href || fighter1.athlete?.flag?.href,
                externalId: `ufc-fighter-${fighter1.id}`,
              },
              {
                name: fighter2.athlete?.displayName || fighter2.athlete?.name || 'Peleador 2',
                logoUrl: fighter2.athlete?.headshot?.href || fighter2.athlete?.flag?.href,
                externalId: `ufc-fighter-${fighter2.id}`,
              },
            ],
            ...(includeDetails && {
              stats: {
                ufc: {
                  method: method?.substring(0, 50),
                  round: Number.isInteger(round) ? round : 1,
                  time: time?.toString(),
                },
              },
            }),
          };

          await this.upsertUnifiedEvent(unifiedEvent);
          itemsSynced++;
        }
      }

      this.logger.log(`Sincronizacion UFC finalizada: ${itemsSynced} combates procesados.`);
      await this.logExecution(true, itemsSynced, `Sincronizados ${itemsSynced} combates de UFC`);

      return {
        sport: this.sportName,
        success: true,
        itemsSynced,
        timestamp: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`Error en sincronizacion UFC: ${error.message}`);
      await this.logExecution(false, itemsSynced, error.message);

      return {
        sport: this.sportName,
        success: false,
        itemsSynced,
        message: error.message,
        timestamp: new Date(),
      };
    }
  }
}
