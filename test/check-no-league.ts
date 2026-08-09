import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const noLeague = await prisma.event.findMany({
    where: { leagueId: null },
    include: { sport: true, participants: true },
    orderBy: { startDate: 'asc' },
    take: 40,
  });

  console.log(`Events with NO league (${noLeague.length} total):`);
  for (const e of noLeague) {
    const pNames = e.participants.map((p) => p.name).join(' vs ');
    console.log(`  [${e.sport?.name ?? 'NoSport'}] ${e.startDate.toISOString().split('T')[0]} | ${e.status} | ${e.externalId} | ${pNames}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
