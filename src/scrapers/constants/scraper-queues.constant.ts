export const SCRAPERS_QUEUE_NAME = 'scrapers-queue';

export const SCRAPER_JOBS = {
  SYNC_ALL: 'sync-all',
  SYNC_NBA: 'sync-nba',
  SYNC_FOOTBALL: 'sync-football',
  SYNC_UFC: 'sync-ufc',
  SYNC_ESPORTS: 'sync-esports',
  CLEANUP_LOGS: 'cleanup-logs',
} as const;

export type ScraperJobType = (typeof SCRAPER_JOBS)[keyof typeof SCRAPER_JOBS];
