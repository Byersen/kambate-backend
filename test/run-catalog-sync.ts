import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ScrapersService } from '../src/scrapers/scrapers.service';

async function bootstrap() {
  console.log('--- Ejecutando Sincronización Completa de Catálogos y Temporada ---');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] });
  const scrapersService = app.get(ScrapersService);

  try {
    const results = await scrapersService.syncAll();
    console.log('Resultados de sincronización:', JSON.stringify(results, null, 2));
  } catch (err: any) {
    console.error('Error durante la sincronización:', err);
  } finally {
    await app.close();
  }
}

bootstrap();
