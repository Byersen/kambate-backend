import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Total counts by sport
  const sports = await prisma.sport.findMany({
    include: {
      _count: { select: { events: true } },
    },
  });

  console.log('\n=== EVENTS BY SPORT ===');
  for (const sport of sports) {
    console.log(`  ${sport.name} (${sport.slug}): ${sport._count.events} events`);
  }

  // 2. Events by league
  const leagues = await prisma.league.findMany({
    include: {
      _count: { select: { events: true } },
    },
    orderBy: { events: { _count: 'desc' } },
  });

  console.log('\n=== EVENTS BY LEAGUE ===');
  for (const league of leagues) {
    console.log(`  [${league.tier}] ${league.name} (${league.slug}): ${league._count.events} events | active=${league.isActive}`);
  }

  // 3. Events by status
  const byStatus = await prisma.event.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  console.log('\n=== EVENTS BY STATUS ===');
  for (const row of byStatus) {
    console.log(`  ${row.status}: ${row._count.id}`);
  }

  // 4. Date range of events
  const earliest = await prisma.event.findFirst({ orderBy: { startDate: 'asc' } });
  const latest = await prisma.event.findFirst({ orderBy: { startDate: 'desc' } });
  const total = await prisma.event.count();

  console.log('\n=== DATE RANGE ===');
  console.log(`  Total events: ${total}`);
  console.log(`  Earliest: ${earliest?.startDate?.toISOString()}`);
  console.log(`  Latest: ${latest?.startDate?.toISOString()}`);

  // 5. Events today / tomorrow
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(todayStart.getDate() + 7);

  const todayEvents = await prisma.event.count({
    where: { startDate: { gte: todayStart, lt: tomorrowStart } },
  });
  const next7 = await prisma.event.count({
    where: { startDate: { gte: todayStart, lt: weekEnd } },
  });

  console.log('\n=== EVENTS TIMEFRAME ===');
  console.log(`  Today (${todayStart.toLocaleDateString()}): ${todayEvents} events`);
  console.log(`  Next 7 days: ${next7} events`);
  
  // 6. Events with no league (leagueId is null)
  const noLeague = await prisma.event.count({ where: { leagueId: null } });
  console.log(`\n  Events with NO league linked: ${noLeague}`);
  
  // 7. Events with no participants
  const noParticipants = await prisma.event.count({
    where: { participants: { none: {} } },
  });
  console.log(`  Events with NO participants: ${noParticipants}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
