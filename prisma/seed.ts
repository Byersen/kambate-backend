import 'dotenv/config';
import { PrismaClient, EventStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando el seeding de la base de datos...');

  // 1. Deportes
  const football = await prisma.sport.upsert({
    where: { slug: 'football' },
    update: {},
    create: { name: 'Futbol', slug: 'football' },
  });

  const nba = await prisma.sport.upsert({
    where: { slug: 'nba' },
    update: {},
    create: { name: 'NBA', slug: 'nba' },
  });

  const ufc = await prisma.sport.upsert({
    where: { slug: 'ufc' },
    update: {},
    create: { name: 'UFC', slug: 'ufc' },
  });

  const esports = await prisma.sport.upsert({
    where: { slug: 'esports' },
    update: {},
    create: { name: 'Esports (LoL/Valorant)', slug: 'esports' },
  });

  // 2. Temporada actual
  const currentSeason = await prisma.season.upsert({
    where: { slug: '2024-2025' },
    update: { isCurrent: true },
    create: {
      name: 'Temporada 2024-2025',
      slug: '2024-2025',
      isCurrent: true,
      startDate: new Date('2024-08-01'),
      endDate: new Date('2025-07-31'),
    },
  });

  // 3. Ligas Top (Tier 1 y 2)
  const championsLeague = await prisma.league.upsert({
    where: { slug: 'uefa.champions' },
    update: {},
    create: {
      name: 'UEFA Champions League',
      slug: 'uefa.champions',
      tier: 1,
      isActive: true,
      country: 'Europa',
      sportId: football.id,
    },
  });

  const laLiga = await prisma.league.upsert({
    where: { slug: 'esp.1' },
    update: {},
    create: {
      name: 'LaLiga EA Sports',
      slug: 'esp.1',
      tier: 1,
      isActive: true,
      country: 'Espana',
      sportId: football.id,
    },
  });

  const premierLeague = await prisma.league.upsert({
    where: { slug: 'eng.1' },
    update: {},
    create: {
      name: 'Premier League',
      slug: 'eng.1',
      tier: 1,
      isActive: true,
      country: 'Inglaterra',
      sportId: football.id,
    },
  });

  const libertadores = await prisma.league.upsert({
    where: { slug: 'conmebol.libertadores' },
    update: {},
    create: {
      name: 'CONMEBOL Libertadores',
      slug: 'conmebol.libertadores',
      tier: 1,
      isActive: true,
      country: 'Sudamerica',
      sportId: football.id,
    },
  });

  const serieA = await prisma.league.upsert({
    where: { slug: 'ita.1' },
    update: {},
    create: {
      name: 'Serie A',
      slug: 'ita.1',
      tier: 2,
      isActive: true,
      country: 'Italia',
      sportId: football.id,
    },
  });

  const nbaLeague = await prisma.league.upsert({
    where: { slug: 'nba' },
    update: {},
    create: {
      name: 'National Basketball Association',
      slug: 'nba',
      tier: 1,
      isActive: true,
      country: 'Estados Unidos',
      sportId: nba.id,
    },
  });

  // 4. Participantes base
  await prisma.participant.upsert({
    where: { id: 'sample-real-madrid' },
    update: {},
    create: {
      id: 'sample-real-madrid',
      name: 'Real Madrid',
      logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/86.png',
      externalId: 'football-team-86',
    },
  });

  await prisma.participant.upsert({
    where: { id: 'sample-barcelona' },
    update: {},
    create: {
      id: 'sample-barcelona',
      name: 'FC Barcelona',
      logoUrl: 'https://a.espncdn.com/i/teamlogos/soccer/500/83.png',
      externalId: 'football-team-83',
    },
  });

  await prisma.participant.upsert({
    where: { id: 'sample-lakers' },
    update: {},
    create: {
      id: 'sample-lakers',
      name: 'Los Angeles Lakers',
      externalId: 'nba-team-13',
    },
  });

  await prisma.participant.upsert({
    where: { id: 'sample-warriors' },
    update: {},
    create: {
      id: 'sample-warriors',
      name: 'Golden State Warriors',
      externalId: 'nba-team-9',
    },
  });

  console.log('Base de datos poblada con disciplinas, ligas activas, temporada y participantes.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
