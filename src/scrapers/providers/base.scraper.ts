import { Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventStatus } from '@prisma/client';
import { SyncResult, SyncOptions, UnifiedScrapedEvent } from '../interfaces/scraper.interface';

export abstract class BaseScraper {
  protected abstract readonly logger: Logger;
  protected abstract readonly sportSlug: string;
  protected abstract readonly sportName: string;

  constructor(protected readonly prisma: PrismaService) {}

  abstract sync(options?: SyncOptions): Promise<SyncResult>;

  protected async getOrCreateSport() {
    return this.prisma.sport.upsert({
      where: { slug: this.sportSlug },
      update: {},
      create: {
        name: this.sportName,
        slug: this.sportSlug,
      },
    });
  }

  protected async getOrCreateParticipant(data: {
    name: string;
    logoUrl?: string;
    externalId?: string;
  }) {
    if (data.externalId) {
      const existingByExternalId = await this.prisma.participant.findFirst({
        where: { externalId: data.externalId },
      });
      if (existingByExternalId) {
        if (data.logoUrl && !existingByExternalId.logoUrl) {
          return this.prisma.participant.update({
            where: { id: existingByExternalId.id },
            data: { logoUrl: data.logoUrl },
          });
        }
        return existingByExternalId;
      }
    }

    const existingByName = await this.prisma.participant.findFirst({
      where: { name: { equals: data.name, mode: 'insensitive' } },
    });

    if (existingByName) {
      return this.prisma.participant.update({
        where: { id: existingByName.id },
        data: {
          externalId: data.externalId ?? existingByName.externalId,
          logoUrl: data.logoUrl ?? existingByName.logoUrl,
        },
      });
    }

    return this.prisma.participant.create({
      data: {
        name: data.name,
        logoUrl: data.logoUrl,
        externalId: data.externalId,
      },
    });
  }

  protected async upsertUnifiedEvent(eventData: UnifiedScrapedEvent) {
    let leagueId: string | undefined = undefined;

    if (eventData.leagueSlug) {
      const league = await this.prisma.league.findUnique({
        where: { slug: eventData.leagueSlug },
      });

      if (league && !league.isActive) {
        return null;
      }

      leagueId = league?.id;
    }

    let seasonId: string | undefined = undefined;
    if (eventData.seasonSlug) {
      const season = await this.prisma.season.findUnique({
        where: { slug: eventData.seasonSlug },
      });
      seasonId = season?.id;
    } else {
      const currentSeason = await this.prisma.season.findFirst({
        where: { isCurrent: true },
      });
      seasonId = currentSeason?.id;
    }

    const sport = await this.getOrCreateSport();

    const participantRecords = [];
    for (const participant of eventData.participants) {
      const p = await this.getOrCreateParticipant(participant);
      participantRecords.push(p);
    }

    const eventStatus = EventStatus[eventData.status] || EventStatus.SCHEDULED;

    const existingEvent = await this.prisma.event.findUnique({
      where: { externalId: eventData.externalId },
      include: {
        footballStats: true,
        nbaStats: true,
        ufcStats: true,
        esportsStats: true,
      },
    });

    if (existingEvent) {
      const updated = await this.prisma.event.update({
        where: { id: existingEvent.id },
        data: {
          startDate: eventData.startDate,
          status: eventStatus,
          score: eventData.score,
          leagueId: leagueId ?? existingEvent.leagueId,
          seasonId: seasonId ?? existingEvent.seasonId,
          participants: {
            set: participantRecords.map((p) => ({ id: p.id })),
          },
        },
      });

      if (eventData.stats?.football) {
        await this.prisma.footballStats.upsert({
          where: { eventId: updated.id },
          update: eventData.stats.football,
          create: { ...eventData.stats.football, eventId: updated.id },
        });
      } else if (eventData.stats?.nba) {
        await this.prisma.nbaStats.upsert({
          where: { eventId: updated.id },
          update: eventData.stats.nba,
          create: { ...eventData.stats.nba, eventId: updated.id },
        });
      } else if (eventData.stats?.ufc) {
        await this.prisma.ufcStats.upsert({
          where: { eventId: updated.id },
          update: eventData.stats.ufc,
          create: { ...eventData.stats.ufc, eventId: updated.id },
        });
      } else if (eventData.stats?.esports) {
        await this.prisma.esportsStats.upsert({
          where: { eventId: updated.id },
          update: eventData.stats.esports,
          create: { ...eventData.stats.esports, eventId: updated.id },
        });
      }

      return updated;
    } else {
      return this.prisma.event.create({
        data: {
          externalId: eventData.externalId,
          sportId: sport.id,
          leagueId,
          seasonId,
          startDate: eventData.startDate,
          status: eventStatus,
          score: eventData.score,
          participants: {
            connect: participantRecords.map((p) => ({ id: p.id })),
          },
          ...(eventData.stats?.football && {
            footballStats: { create: eventData.stats.football },
          }),
          ...(eventData.stats?.nba && {
            nbaStats: { create: eventData.stats.nba },
          }),
          ...(eventData.stats?.ufc && {
            ufcStats: { create: eventData.stats.ufc },
          }),
          ...(eventData.stats?.esports && {
            esportsStats: { create: eventData.stats.esports },
          }),
        },
      });
    }
  }

  protected async logExecution(success: boolean, itemsCount: number, message?: string) {
    try {
      await this.prisma.scraperLog.create({
        data: {
          sport: this.sportName,
          success,
          itemsCount,
          message,
        },
      });
    } catch (err: any) {
      this.logger.error(`Error guardando log de auditoria: ${err.message}`);
    }
  }
}
