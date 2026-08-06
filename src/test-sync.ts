import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ScrapersService } from './scrapers/scrapers.service';

async function testSync() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  const scrapersService = app.get(ScrapersService);

  console.log('--- Iniciando prueba de sincronización ---');
  const results = await scrapersService.syncAll();
  console.log('Resultados:', JSON.stringify(results, null, 2));

  const logs = await scrapersService.getLogs(5);
  console.log('Últimos logs de auditoría:', JSON.stringify(logs, null, 2));

  await app.close();
}

testSync().catch((err) => {
  console.error('Error en testSync:', err);
  process.exit(1);
});
