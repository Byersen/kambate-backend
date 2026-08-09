import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Fix WNBA events without league
  const wnbaLeague = await prisma.league.findUnique({ where: { slug: 'wnba' } });
  if (wnbaLeague) {
    const wnbaFixed = await prisma.event.updateMany({
      where: {
        leagueId: null,
        externalId: { startsWith: 'wnba-espn-' },
      },
      data: { leagueId: wnbaLeague.id },
    });
    console.log(`Fixed ${wnbaFixed.count} WNBA events`);
  } else {
    console.log('WNBA league not found, skipping');
  }

  // Fix UFC events without league
  const ufcLeague = await prisma.league.findUnique({ where: { slug: 'ufc' } });
  if (ufcLeague) {
    const ufcFixed = await prisma.event.updateMany({
      where: {
        leagueId: null,
        externalId: { startsWith: 'ufc-' },
      },
      data: { leagueId: ufcLeague.id },
    });
    console.log(`Fixed ${ufcFixed.count} UFC events`);
  }

  // Fix VLR Valorant events without league
  const valorantLeague = await prisma.league.findUnique({ where: { slug: 'valorant' } });
  if (valorantLeague) {
    const vlrFixed = await prisma.event.updateMany({
      where: {
        leagueId: null,
        externalId: { startsWith: 'vlr-valorant-' },
      },
      data: { leagueId: valorantLeague.id },
    });
    console.log(`Fixed ${vlrFixed.count} VLR Valorant events`);
  }

  // Fix NBA events without league
  const nbaLeague = await prisma.league.findUnique({ where: { slug: 'nba' } });
  if (nbaLeague) {
    const nbaFixed = await prisma.event.updateMany({
      where: {
        leagueId: null,
        externalId: { startsWith: 'nba-espn-' },
      },
      data: { leagueId: nbaLeague.id },
    });
    console.log(`Fixed ${nbaFixed.count} NBA events`);
  }

  // Fix Esports (LoL) events without league
  const lolLeague = await prisma.league.findUnique({ where: { slug: 'lol' } });
  if (lolLeague) {
    const lolFixed = await prisma.event.updateMany({
      where: {
        leagueId: null,
        externalId: { startsWith: 'esports-lol-' },
      },
      data: { leagueId: lolLeague.id },
    });
    console.log(`Fixed ${lolFixed.count} LoL events`);
  }

  // Final check
  const remaining = await prisma.event.count({ where: { leagueId: null } });
  const total = await prisma.event.count();
  console.log(`\nDone. Remaining events without league: ${remaining} / ${total}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
