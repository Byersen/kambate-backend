import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ScrapersQueueService } from './scrapers/scrapers-queue.service';
import { ScrapersService } from './scrapers/scrapers.service';

async function testQueue() {
  console.log('Iniciando contexto de NestJS para prueba de BullMQ...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const queueService = app.get(ScrapersQueueService);
  const scrapersService = app.get(ScrapersService);

  console.log('\n--- 1. Metricas iniciales de la cola ---');
  let metrics = await queueService.getQueueMetrics();
  console.log(JSON.stringify(metrics, null, 2));

  console.log('\n--- 2. Encolando job de sincronizacion de NBA ---');
  const jobResult = await queueService.queueSyncSport('nba', { priority: 1 });
  console.log('Job encolado:', jobResult);

  console.log('\n--- 3. Esperando procesamiento del Worker... ---');
  await new Promise((resolve) => setTimeout(resolve, 6000));

  console.log('\n--- 4. Metricas posteriores de la cola ---');
  metrics = await queueService.getQueueMetrics();
  console.log(JSON.stringify(metrics, null, 2));

  console.log('\n--- 5. Verificando ultimos registros de auditoria ---');
  const logs = await scrapersService.getLogs(3);
  console.log(JSON.stringify(logs, null, 2));

  await app.close();
  console.log('\nPrueba de BullMQ completada exitosamente.');
}

testQueue().catch((err) => {
  console.error('Error en testQueue:', err);
  process.exit(1);
});
