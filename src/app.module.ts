import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ScrapersModule } from './scrapers/scrapers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          try {
            const parsed = new URL(redisUrl);
            return {
              connection: {
                host: parsed.hostname,
                port: parseInt(parsed.port || '6379', 10),
                username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
                password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
                tls: parsed.protocol === 'rediss:' ? {} : undefined,
                maxRetriesPerRequest: null,
              },
            };
          } catch {
            // Fallback en caso de formato no URI
          }
        }

        const host = config.get<string>('REDIS_HOST', 'localhost');
        const port = config.get<number>('REDIS_PORT', 6379);
        const password = config.get<string>('REDIS_PASSWORD');
        const useTls = config.get<string>('REDIS_TLS') === 'true';

        return {
          connection: {
            host,
            port: Number(port),
            password: password || undefined,
            tls: useTls ? {} : undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
      inject: [ConfigService],
    }),
    DatabaseModule,
    ScrapersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
