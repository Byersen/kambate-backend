import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseScraper } from './base.scraper';
import { SyncResult, UnifiedScrapedEvent } from '../interfaces/scraper.interface';
import axios from 'axios';

@Injectable()
export class FootballScraperService extends BaseScraper {
  protected readonly logger = new Logger(FootballScraperService.name);
  protected readonly sportSlug = 'football';
  protected readonly sportName = 'Fútbol';

  private readonly leagues = [
    'uefa.champions',
    'esp.1',
    'eng.1',
    'ita.1',
    'conmebol.libertadores',
  ];

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async sync(): Promise<SyncResult> {
    this.logger.log('⚽ Iniciando sincronización de partidos de Fútbol...');
    let itemsSynced = 0;

    try {
      for (const league of this.leagues) {
        try {
          const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`;
          const response = await axios.get(url, { timeout: 8000 });
          const events = response.data?.events || [];

          for (const event of events) {
            const competition = event.competitions?.[0];
            if (!competition) continue;

            const competitors = competition.competitors || [];
            const homeCompetitor = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
            const awayCompetitor = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

            if (!homeCompetitor || !awayCompetitor) continue;

            const homeGoals = parseInt(homeCompetitor.score || '0', 10);
            const awayGoals = parseInt(awayCompetitor.score || '0', 10);

            const state = event.status?.type?.state;
            let status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELED' = 'SCHEDULED';
            if (state === 'in') status = 'LIVE';
            else if (state === 'post') status = 'FINISHED';

            const unifiedEvent: UnifiedScrapedEvent = {
              externalId: `football-espn-${event.id}`,
              sportSlug: this.sportSlug,
              sportName: this.sportName,
              startDate: new Date(event.date || competition.date),
              status,
              score: `${homeGoals} - ${awayGoals}`,
              participants: [
                {
                  name: homeCompetitor.team?.displayName || homeCompetitor.team?.name || 'Local',
                  logoUrl: homeCompetitor.team?.logo,
                  externalId: `football-team-${homeCompetitor.id}`,
                },
                {
                  name: awayCompetitor.team?.displayName || awayCompetitor.team?.name || 'Visitante',
                  logoUrl: awayCompetitor.team?.logo,
                  externalId: `football-team-${awayCompetitor.id}`,
                },
              ],
              stats: {
                football: {
                  homeGoals,
                  awayGoals,
                  homeCards: 0,
                  awayCards: 0,
                  extraStats: {
                    league: response.data?.leagues?.[0]?.name || league,
                    clock: event.status?.displayClock,
                  },
                },
              },
            };

            await this.upsertUnifiedEvent(unifiedEvent);
            itemsSynced++;
          }
        } catch (leagueErr: any) {
          this.logger.warn(`No se pudieron sincronizar datos para la liga ${league}: ${leagueErr.message}`);
        }
      }

      this.logger.log(`✅ Sincronización de Fútbol finalizada: ${itemsSynced} partidos procesados.`);
      await this.logExecution(true, itemsSynced, `Sincronizados ${itemsSynced} partidos de fútbol`);

      return {
        sport: this.sportName,
        success: true,
        itemsSynced,
        timestamp: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`❌ Error en sincronización de Fútbol: ${error.message}`);
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
