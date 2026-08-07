import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NbaScraperService } from './providers/nba.scraper';
import { FootballScraperService } from './providers/football.scraper';
import { UfcScraperService } from './providers/ufc.scraper';
import { EsportsScraperService } from './providers/esports.scraper';
import { SyncResult, SyncOptions } from './interfaces/scraper.interface';

@Injectable()
export class ScrapersService {
  private readonly logger = new Logger(ScrapersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nbaScraper: NbaScraperService,
    private readonly footballScraper: FootballScraperService,
    private readonly ufcScraper: UfcScraperService,
    private readonly esportsScraper: EsportsScraperService,
  ) {}

  async syncAll(options?: SyncOptions): Promise<SyncResult[]> {
    this.logger.log(
      `Iniciando sincronizacion general (Tier: ${options?.tier ?? 'Todos'}, Detalle: ${options?.includeDetails ?? true})...`,
    );

    const results = await Promise.allSettled([
      this.nbaScraper.sync(options),
      this.footballScraper.sync(options),
      this.ufcScraper.sync(options),
      this.esportsScraper.sync(options),
    ]);

    return results.map((res, index) => {
      if (res.status === 'fulfilled') {
        return res.value;
      } else {
        const sportNames = ['NBA', 'Futbol', 'UFC', 'Esports'];
        return {
          sport: sportNames[index],
          success: false,
          itemsSynced: 0,
          message: res.reason?.message || 'Error desconocido durante la ejecucion',
          timestamp: new Date(),
        };
      }
    });
  }

  async syncSport(sportSlug: string, options?: SyncOptions): Promise<SyncResult> {
    const slug = sportSlug.toLowerCase().trim();

    switch (slug) {
      case 'nba':
      case 'basketball':
        return this.nbaScraper.sync(options);

      case 'football':
      case 'soccer':
      case 'futbol':
        return this.footballScraper.sync(options);

      case 'ufc':
      case 'mma':
        return this.ufcScraper.sync(options);

      case 'esports':
      case 'lol':
      case 'valorant':
        return this.esportsScraper.sync(options);

      default:
        throw new BadRequestException(
          `Deporte no soportado: '${sportSlug}'. Opciones validas: nba, football, ufc, esports.`,
        );
    }
  }

  async getLogs(limit = 20) {
    return this.prisma.scraperLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async cleanupLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.logger.log(
      `Eliminando registros de auditoria anteriores a: ${cutoffDate.toISOString()}`,
    );

    const result = await this.prisma.scraperLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Purgados ${result.count} logs de auditoria antiguos.`);

    return {
      deletedCount: result.count,
      cutoffDate,
      timestamp: new Date(),
    };
  }

  async purgeSeasonData(seasonSlug?: string) {
    if (seasonSlug) {
      const season = await this.prisma.season.findUnique({
        where: { slug: seasonSlug },
      });

      if (!season) {
        throw new NotFoundException(`Temporada '${seasonSlug}' no encontrada.`);
      }

      const deleted = await this.prisma.event.deleteMany({
        where: { seasonId: season.id },
      });

      this.logger.log(
        `Temporada '${season.name}' limpiada por completo. Se eliminaron ${deleted.count} eventos y sus estadisticas.`,
      );

      return {
        message: `Todos los datos de la temporada '${season.name}' fueron eliminados por completo.`,
        deletedEventsCount: deleted.count,
        season: season.slug,
        timestamp: new Date(),
      };
    } else {
      const currentSeason = await this.prisma.season.findFirst({
        where: { isCurrent: true },
      });

      const deleted = await this.prisma.event.deleteMany({
        where: currentSeason
          ? {
              OR: [
                { seasonId: { not: currentSeason.id } },
                { seasonId: null },
              ],
            }
          : undefined,
      });

      this.logger.log(
        `Limpieza de fin de temporada ejecutada: ${deleted.count} eventos antiguos eliminados. La aplicacion solo conserva la temporada actual.`,
      );

      return {
        message: 'Se han eliminado todos los datos de temporadas anteriores. La base de datos contiene unicamente la temporada en curso.',
        deletedEventsCount: deleted.count,
        currentSeason: currentSeason?.slug || 'Sin temporada activa asignada',
        timestamp: new Date(),
      };
    }
  }

  async startNewSeason(data: {
    name: string;
    slug: string;
    startDate?: Date;
    endDate?: Date;
    purgePreviousData?: boolean;
  }) {
    const purgePrevious = data.purgePreviousData ?? true;

    if (purgePrevious) {
      const deleted = await this.prisma.event.deleteMany({});
      this.logger.log(
        `Inicio de nueva temporada: se purgaron ${deleted.count} eventos anteriores. Base de datos reseteada a 0.`,
      );
    }

    await this.prisma.season.updateMany({
      data: { isCurrent: false },
    });

    const newSeason = await this.prisma.season.upsert({
      where: { slug: data.slug },
      update: {
        name: data.name,
        isCurrent: true,
        startDate: data.startDate,
        endDate: data.endDate,
      },
      create: {
        name: data.name,
        slug: data.slug,
        isCurrent: true,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });

    this.logger.log(
      `Nueva temporada activada: '${newSeason.name}'. La aplicacion esta lista para recibir exclusivamente los nuevos partidos.`,
    );

    return {
      message: `Nueva temporada '${newSeason.name}' iniciada con exito. Datos anteriores eliminados.`,
      season: newSeason,
      previousDataPurged: purgePrevious,
      timestamp: new Date(),
    };
  }

  async getLeagues(sportSlug?: string) {
    return this.prisma.league.findMany({
      where: sportSlug ? { sport: { slug: sportSlug } } : undefined,
      include: { sport: true },
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
    });
  }

  async setLeagueStatus(leagueSlug: string, isActive: boolean) {
    const league = await this.prisma.league.findUnique({
      where: { slug: leagueSlug },
    });

    if (!league) {
      throw new NotFoundException(`Liga '${leagueSlug}' no encontrada.`);
    }

    const updated = await this.prisma.league.update({
      where: { id: league.id },
      data: { isActive },
    });

    return {
      message: `Liga '${updated.name}' ${isActive ? 'activada' : 'desactivada'}.`,
      league: updated,
    };
  }
}
