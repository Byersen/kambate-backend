import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NbaScraperService } from './providers/nba.scraper';
import { FootballScraperService } from './providers/football.scraper';
import { UfcScraperService } from './providers/ufc.scraper';
import { EsportsScraperService } from './providers/esports.scraper';
import { SyncResult } from './interfaces/scraper.interface';

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

  /**
   * Sincroniza todas las disciplinas soportadas
   */
  async syncAll(): Promise<SyncResult[]> {
    this.logger.log('🚀 Iniciando sincronización general de todas las disciplinas...');

    const results = await Promise.allSettled([
      this.nbaScraper.sync(),
      this.footballScraper.sync(),
      this.ufcScraper.sync(),
      this.esportsScraper.sync(),
    ]);

    return results.map((res, index) => {
      if (res.status === 'fulfilled') {
        return res.value;
      } else {
        const sportNames = ['NBA', 'Fútbol', 'UFC', 'Esports'];
        return {
          sport: sportNames[index],
          success: false,
          itemsSynced: 0,
          message: res.reason?.message || 'Error desconocido durante la ejecución',
          timestamp: new Date(),
        };
      }
    });
  }

  /**
   * Sincroniza una disciplina específica por su slug o nombre
   */
  async syncSport(sportSlug: string): Promise<SyncResult> {
    const slug = sportSlug.toLowerCase().trim();

    switch (slug) {
      case 'nba':
      case 'basketball':
        return this.nbaScraper.sync();

      case 'football':
      case 'soccer':
      case 'futbol':
        return this.footballScraper.sync();

      case 'ufc':
      case 'mma':
        return this.ufcScraper.sync();

      case 'esports':
      case 'lol':
      case 'valorant':
        return this.esportsScraper.sync();

      default:
        throw new BadRequestException(
          `Deporte no soportado: '${sportSlug}'. Opciones válidas: nba, football, ufc, esports.`,
        );
    }
  }

  /**
   * Obtiene el historial de auditoría de scrapers
   */
  async getLogs(limit = 20) {
    return this.prisma.scraperLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
