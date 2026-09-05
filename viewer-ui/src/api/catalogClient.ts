const API_BASE = 'http://localhost:8000';

export interface CatalogVariant {
  episode_id: string;
  language: string;
  duration_seconds: number | null;
}

export interface CatalogEpisode {
  content_group: string;
  season_number: number;
  episode_number: number;
  episode_title: string;
  duration_seconds: number | null;
  available_languages: string[];
  artworks: Record<string, string>;
  variants: CatalogVariant[];
}

export interface CatalogSeason {
  season_number: number;
  episodes: CatalogEpisode[];
}

export interface TrailerEpisode {
  episode_id: string;
  episode_title: string;
  duration_seconds: number | null;
  language: string;
  artworks: Record<string, string>;
}

export interface CatalogShow {
  id: number;
  title: string;
  slug: string;
  section: string;
  categories: string[];
  synopsis: string | null;
  poster_url: string | null;
  banner_url: string | null;
  seasons: CatalogSeason[];
  trailers: TrailerEpisode[];
}

export interface CatalogResponse {
  metadata: {
    published_at: string;
    published_by: string;
    shows_count: number;
    episodes_count: number;
    version: string;
  };
  sections: Record<string, CatalogShow[]>;
}

export interface SearchResultItem {
  show_id: number;
  show_title: string;
  slug: string;
  section: string;
  categories: string[];
  synopsis: string | null;
  poster_url: string | null;
  banner_url: string | null;
  content_group: string;
  season_number: number;
  episode_number: number;
  episode_title: string;
  duration_seconds: number | null;
  available_languages: string[];
  artworks: Record<string, string>;
}

export const catalogApi = {
  async getCatalog(): Promise<CatalogResponse> {
    const res = await fetch(`${API_BASE}/catalog`);
    if (!res.ok) {
      throw new Error('Published catalog not found or API server unassigned.');
    }
    return res.json();
  },

  async searchCatalog(params: { q?: string; category?: string; language?: string; section?: string }) {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.category) query.append('category', params.category);
    if (params.language) query.append('language', params.language);
    if (params.section) query.append('section', params.section);

    const res = await fetch(`${API_BASE}/catalog/search?${query.toString()}`);
    if (!res.ok) {
      throw new Error('Search request failed.');
    }
    return res.json();
  }
};
