export interface SyncResult {
  sport: string;
  success: boolean;
  itemsSynced: number;
  message?: string;
  timestamp: Date;
}

export interface UnifiedScrapedEvent {
  externalId: string;
  sportSlug: string;
  sportName: string;
  startDate: Date;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELED';
  score?: string;
  participants: {
    name: string;
    logoUrl?: string;
    externalId?: string;
  }[];
  stats?: {
    football?: {
      homeGoals?: number;
      awayGoals?: number;
      homeCards?: number;
      awayCards?: number;
      extraStats?: any;
    };
    nba?: {
      homePoints?: number;
      awayPoints?: number;
      quarter?: number;
    };
    ufc?: {
      method?: string;
      round?: number;
      time?: string;
    };
    esports?: {
      homeScore?: number;
      awayScore?: number;
      map?: string;
    };
  };
}
