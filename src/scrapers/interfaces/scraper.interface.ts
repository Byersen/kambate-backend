export interface SyncResult {
  sport: string;
  success: boolean;
  itemsSynced: number;
  message?: string;
  timestamp: Date;
}

export interface SyncOptions {
  tier?: number; // 1 = Top/Favoritos, 2 = Secundarias/Menores
  includeDetails?: boolean; // true = estadisticas completas (goles, tarjetas, reloj); false = solo estado y marcador basico
}

export interface UnifiedScrapedEvent {
  externalId: string;
  sportSlug: string;
  sportName: string;
  leagueSlug?: string;
  seasonSlug?: string;
  startDate: Date;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELED' | 'ARCHIVED';
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
