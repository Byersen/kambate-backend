import { PrismaClient, EventStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando el seeding de la base de datos...');

  const football = await prisma.sport.upsert({
    where: { slug: 'football' },
    update: {},
    create: { name: 'Fútbol', slug: 'football' },
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

  const realMadrid = await prisma.participant.create({ data: { name: 'Real Madrid', logoUrl: 'https://ejemplo.com/rm.png' } });
  const barcelona = await prisma.participant.create({ data: { name: 'FC Barcelona', logoUrl: 'https://ejemplo.com/barca.png' } });
  
  const lakers = await prisma.participant.create({ data: { name: 'Los Angeles Lakers' } });
  const warriors = await prisma.participant.create({ data: { name: 'Golden State Warriors' } });

  const mcgregor = await prisma.participant.create({ data: { name: 'Conor McGregor' } });
  const poirier = await prisma.participant.create({ data: { name: 'Dustin Poirier' } });
  
  await prisma.event.create({
    data: {
      sportId: football.id,
      startDate: new Date(),
      status: EventStatus.FINISHED,
      score: '2 - 1',
      participants: {
        connect: [{ id: realMadrid.id }, { id: barcelona.id }],
      },
      footballStats: {
        create: {
          homeGoals: 2,
          awayGoals: 1,
          homeCards: 1,
          awayCards: 3,
          extraStats: { possession: "60-40" }
        }
      }
    }
  });

  await prisma.event.create({
    data: {
      sportId: nba.id,
      startDate: new Date(),
      status: EventStatus.LIVE,
      score: '102 - 98',
      participants: {
        connect: [{ id: lakers.id }, { id: warriors.id }],
      },
      nbaStats: {
        create: {
          homePoints: 102,
          awayPoints: 98,
          quarter: 4
        }
      }
    }
  });

  await prisma.event.create({
    data: {
      sportId: ufc.id,
      startDate: new Date(),
      status: EventStatus.FINISHED,
      score: 'KO/TKO',
      participants: {
        connect: [{ id: mcgregor.id }, { id: poirier.id }],
      },
      ufcStats: {
        create: {
          method: 'KO/TKO',
          round: 2,
          time: '2:32'
        }
      }
    }
  });

  console.log('¡Base de datos poblada con éxito!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
