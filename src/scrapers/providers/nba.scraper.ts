import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseScraper } from './base.scraper';
import { SyncResult, UnifiedScrapedEvent } from '../interfaces/scraper.interface';
import axios from 'axios';

@Injectable()
export class NbaScraperService extends BaseScraper {
  protected readonly logger = new Logger(NbaScraperService.name);
  protected readonly sportSlug = 'nba';
  protected readonly sportName = 'NBA';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async sync(): Promise<SyncResult> {
    this.logger.log('🏀 Iniciando sincronización de partidos NBA...');
    let itemsSynced = 0;

    try {
      const response = await axios.get(
        'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
        { timeout: 10000 }
      );

      const events = response.data?.events || [];

      for (const event of events) {
        const competition = event.competitions?.[0];
        if (!competition) continue;

        const competitors = competition.competitors || [];
        const homeCompetitor = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
        const awayCompetitor = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

        if (!homeCompetitor || !awayCompetitor) continue;

        const homeScore = parseInt(homeCompetitor.score || '0', 10);
        const awayScore = parseInt(awayCompetitor.score || '0', 10);

        const state = event.status?.type?.state;
        let status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELED' = 'SCHEDULED';
        if (state === 'in') status = 'LIVE';
        else if (state === 'post') status = 'FINISHED';

        const quarter = event.status?.period || 1;

        const unifiedEvent: UnifiedScrapedEvent = {
          externalId: `nba-espn-${event.id}`,
          sportSlug: this.sportSlug,
          sportName: this.sportName,
          startDate: new Date(event.date || competition.date),
          status,
          score: `${homeScore} - ${awayScore}`,
          participants: [
            {
              name: homeCompetitor.team?.displayName || homeCompetitor.team?.name || 'Equipo Local',
              logoUrl: homeCompetitor.team?.logo,
              externalId: `nba-team-${homeCompetitor.id}`,
            },
            {
              name: awayCompetitor.team?.displayName || awayCompetitor.team?.name || 'Equipo Visitante',
              logoUrl: awayCompetitor.team?.logo,
              externalId: `nba-team-${awayCompetitor.id}`,
            },
          ],
          stats: {
            nba: {
              homePoints: homeScore,
              awayPoints: awayScore,
              quarter,
            },
          },
        };

        await this.upsertUnifiedEvent(unifiedEvent);
        itemsSynced++;
      }

      this.logger.log(`✅ Sincronización NBA finalizada: ${itemsSynced} partidos procesados.`);
      await this.logExecution(true, itemsSynced, `Sincronizados ${itemsSynced} partidos de NBA`);

      return {
        sport: this.sportName,
        success: true,
        itemsSynced,
        timestamp: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`❌ Error en sincronización NBA: ${error.message}`);
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
