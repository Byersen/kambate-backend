import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseScraper } from './base.scraper';
import { SyncResult, SyncOptions, UnifiedScrapedEvent } from '../interfaces/scraper.interface';
import axios from 'axios';

@Injectable()
export class NbaScraperService extends BaseScraper {
  protected readonly logger = new Logger(NbaScraperService.name);
  protected readonly sportSlug = 'nba';
  protected readonly sportName = 'NBA';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async syncTeamCatalog(): Promise<number> {
    this.logger.log('Sincronizando catálogo completo de las 30 franquicias NBA...');
    let totalTeamsSynced = 0;
    const sport = await this.getOrCreateSport();

    try {
      const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams';
      const response = await axios.get(url, { timeout: 10000 });
      const teams = response.data?.sports?.[0]?.leagues?.[0]?.teams || response.data?.teams || [];

      await this.prisma.league.upsert({
        where: { slug: 'nba' },
        update: { name: 'NBA' },
        create: {
          slug: 'nba',
          name: 'NBA',
          tier: 1,
          isActive: true,
          sportId: sport.id,
        },
      });

      for (const item of teams) {
        const t = item.team;
        if (!t) continue;
        const name = t.displayName || t.name;
        const logoUrl = t.logos?.[0]?.href || t.logo;
        const externalId = `nba-team-${t.id}`;

        if (name) {
          await this.getOrCreateParticipant({
            name,
            logoUrl,
            externalId,
          });
          totalTeamsSynced++;
        }
      }
    } catch (err: any) {
      this.logger.warn(`Error sincronizando catálogo NBA: ${err.message}`);
    }

    this.logger.log(`Catálogo NBA sincronizado: ${totalTeamsSynced} franquicias registradas.`);
    return totalTeamsSynced;
  }

  private getDateRangeString(daysPast = 180, daysFuture = 180): string {
    const now = new Date();
    const past = new Date(now);
    past.setDate(now.getDate() - daysPast);
    const future = new Date(now);
    future.setDate(now.getDate() + daysFuture);

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}${m}${day}`;
    };

    return `${formatDate(past)}-${formatDate(future)}`;
  }

  async sync(options?: SyncOptions): Promise<SyncResult> {
    const includeDetails = options?.includeDetails ?? true;
    const dateRange = this.getDateRangeString(180, 180);

    // Sincronizar catálogo base de franquicias NBA
    await this.syncTeamCatalog();

    this.logger.log(`Iniciando sincronizacion de partidos de Baloncesto/NBA (Rango Temporada: ${dateRange})...`);
    let itemsSynced = 0;

    const leagues = ['nba'];

    try {
      for (const league of leagues) {
        try {
          const response = await axios.get(
            `https://site.api.espn.com/apis/site/v2/sports/basketball/${league}/scoreboard?dates=${dateRange}`,
            { timeout: 10000 },
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
              externalId: `${league}-espn-${event.id}`,
              sportSlug: this.sportSlug,
              sportName: this.sportName,
              leagueSlug: league === 'wnba' ? 'wnba' : 'nba',
              startDate: new Date(event.date || competition.date),
              status,
              score: `${homeScore} - ${awayScore}`,
              participants: [
                {
                  name: homeCompetitor.team?.displayName || homeCompetitor.team?.name || 'Equipo Local',
                  logoUrl: homeCompetitor.team?.logo,
                  externalId: `${league}-team-${homeCompetitor.id}`,
                },
                {
                  name: awayCompetitor.team?.displayName || awayCompetitor.team?.name || 'Equipo Visitante',
                  logoUrl: awayCompetitor.team?.logo,
                  externalId: `${league}-team-${awayCompetitor.id}`,
                },
              ],
              ...(includeDetails && {
                stats: {
                  nba: {
                    homePoints: homeScore,
                    awayPoints: awayScore,
                    quarter,
                  },
                },
              }),
            };

            const saved = await this.upsertUnifiedEvent(unifiedEvent);
            if (saved) {
              itemsSynced++;
            }
          }
        } catch (err: any) {
          this.logger.warn(`Error al consultar liga ${league}: ${err.message}`);
        }
      }

      this.logger.log(`Sincronizacion de Baloncesto finalizada: ${itemsSynced} partidos procesados.`);
      await this.logExecution(true, itemsSynced, `Sincronizados ${itemsSynced} partidos de Baloncesto`);

      return {
        sport: this.sportName,
        success: true,
        itemsSynced,
        timestamp: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`Error en sincronizacion NBA: ${error.message}`);
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
