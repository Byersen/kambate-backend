import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseScraper } from './base.scraper';
import { SyncResult, SyncOptions, UnifiedScrapedEvent } from '../interfaces/scraper.interface';
import axios from 'axios';

@Injectable()
export class FootballScraperService extends BaseScraper {
  protected readonly logger = new Logger(FootballScraperService.name);
  protected readonly sportSlug = 'football';
  protected readonly sportName = 'Futbol';

  // Las 18 ligas objetivo según SCRAPING_COVERAGE.md
  private readonly defaultLeagues = [
    // UEFA (3)
    'uefa.champions',
    'uefa.europa',
    'uefa.europa.conf',
    // Top 5 Europeas (Solo 1ª División)
    'esp.1',
    'eng.1',
    'ita.1',
    'ger.1',
    'fra.1',
    // Otras Europeas
    'ned.1',
    'por.1',
    'tur.1',
    // CONMEBOL / Sudamérica
    'conmebol.libertadores',
    'conmebol.sudamericana',
    'arg.1',
    'bra.1',
    'chi.1',
    // Norteamérica
    'mex.1',
    'usa.1',
  ];

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async syncTeamCatalog(): Promise<number> {
    this.logger.log('Sincronizando catálogo completo de equipos de fútbol para las 18 ligas...');
    let totalTeamsSynced = 0;
    const sport = await this.getOrCreateSport();

    for (const league of this.defaultLeagues) {
      try {
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams`;
        const response = await axios.get(url, { timeout: 10000 });
        const teams = response.data?.sports?.[0]?.leagues?.[0]?.teams || response.data?.teams || [];

        // Asegurar que la liga existe en la BD
        await this.prisma.league.upsert({
          where: { slug: league },
          update: { name: league },
          create: {
            slug: league,
            name: league,
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
          const externalId = `football-team-${t.id}`;

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
        this.logger.warn(`Error sincronizando catálogo de equipos de la liga ${league}: ${err.message}`);
      }
    }
    this.logger.log(`Catálogo de fútbol sincronizado: ${totalTeamsSynced} equipos registrados.`);
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
    const targetTier = options?.tier;
    const includeDetails = options?.includeDetails ?? true;
    // Rango de temporada completa (6 meses pasados + 6 meses futuros = 1 año entero)
    const dateRange = this.getDateRangeString(180, 180);

    // Sincronizar catálogo base de equipos primero
    await this.syncTeamCatalog();

    this.logger.log(
      `Iniciando sincronizacion de Futbol (Rango Temporada: ${dateRange}, Tier: ${targetTier ?? 'Todos'}, Detalle: ${includeDetails ? 'Completo' : 'Basico'})...`,
    );
    let itemsSynced = 0;

    try {
      const activeLeaguesInDb = await this.prisma.league.findMany({
        where: {
          sport: { slug: this.sportSlug },
          isActive: true,
          ...(targetTier ? { tier: targetTier } : {}),
        },
        select: { slug: true, tier: true },
      });

      const leaguesToFetch =
        activeLeaguesInDb.length > 0
          ? activeLeaguesInDb.map((l: { slug: string; tier: number }) => l.slug)
          : this.defaultLeagues;

      for (const league of leaguesToFetch) {
        try {
          const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${dateRange}`;
          const response = await axios.get(url, { timeout: 10000 });
          const events = response.data?.events || [];
          const leagueDisplayName = response.data?.leagues?.[0]?.name || league;

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
              leagueSlug: league,
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
              ...(includeDetails && {
                stats: {
                  football: {
                    homeGoals,
                    awayGoals,
                    homeCards: 0,
                    awayCards: 0,
                    extraStats: {
                      league: leagueDisplayName,
                      clock: event.status?.displayClock,
                    },
                  },
                },
              }),
            };

            const saved = await this.upsertUnifiedEvent(unifiedEvent);
            if (saved) {
              itemsSynced++;
            }
          }
        } catch (leagueErr: any) {
          this.logger.warn(`No se pudieron sincronizar datos para la liga ${league}: ${leagueErr.message}`);
        }
      }

      this.logger.log(`Sincronizacion de Futbol finalizada: ${itemsSynced} partidos procesados.`);
      await this.logExecution(true, itemsSynced, `Sincronizados ${itemsSynced} partidos de futbol`);

      return {
        sport: this.sportName,
        success: true,
        itemsSynced,
        timestamp: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`Error en sincronizacion de Futbol: ${error.message}`);
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
