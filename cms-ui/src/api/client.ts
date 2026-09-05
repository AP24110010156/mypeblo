const API_BASE = 'http://localhost:8000';

export interface Show {
  id: number;
  title: string;
  slug: string;
  section: string | null;
  categories: string[];
  synopsis: string | null;
}

export interface Artwork {
  id: number;
  art_type: string;
  url: string;
  file_path: string;
  width: number;
  height: number;
  size_bytes: number;
}

export interface Episode {
  id: number;
  episode_id: string;
  season_id: number;
  season_number: number;
  episode_number: number;
  episode_title: string;
  duration_seconds: number | null;
  language: string;
  content_group: string;
  status: string;
  show_id: number;
  show_title: string;
  section: string | null;
  categories: string[];
  artworks: Artwork[];
}

export interface ValidationIssue {
  entity_type: string;
  entity_id: string;
  show_title: string;
  episode_title?: string;
  season_number?: number;
  episode_number?: number;
  field: string;
  issue_type: string;
  message: string;
}

export interface ValidationReport {
  can_publish: boolean;
  total_issues: number;
  issues_by_type: Record<string, ValidationIssue[]>;
  issues_by_show: Record<string, ValidationIssue[]>;
}

export interface PublishRun {
  id: number;
  published_at: string;
  published_by: string;
  shows_count: number;
  episodes_count: number;
  outcome: string;
  error_message?: string;
}

const getHeaders = (role: string) => ({
  'X-User-Role': role,
  'Content-Type': 'application/json'
});

export const api = {
  async getEpisodes(role: string, params: { section?: string; status?: string; language?: string; q?: string; page?: number }) {
    const query = new URLSearchParams();
    if (params.section) query.append('section', params.section);
    if (params.status) query.append('status', params.status);
    if (params.language) query.append('language', params.language);
    if (params.q) query.append('q', params.q);
    if (params.page) query.append('page', params.page.toString());

    const res = await fetch(`${API_BASE}/admin/episodes?${query.toString()}`, {
      headers: getHeaders(role)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateEpisode(role: string, episodeId: string, payload: Partial<Episode>) {
    const res = await fetch(`${API_BASE}/admin/episodes/${episodeId}`, {
      method: 'PUT',
      headers: getHeaders(role),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update episode');
    }
    return res.json();
  },

  async uploadArtwork(role: string, episodeId: string, artType: string, file: File) {
    const formData = new FormData();
    formData.append('art_type', artType);
    formData.append('episode_id', episodeId);
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/admin/artwork/upload`, {
      method: 'POST',
      headers: {
        'X-User-Role': role
      },
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Artwork upload failed');
    }
    return res.json();
  },

  async getValidationReport(role: string): Promise<ValidationReport> {
    const res = await fetch(`${API_BASE}/admin/validation-report`, {
      headers: getHeaders(role)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async triggerPublish(role: string, force: boolean = false) {
    const res = await fetch(`${API_BASE}/admin/catalog/publish?force=${force}`, {
      method: 'POST',
      headers: getHeaders(role)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail));
    }
    return res.json();
  },

  async getPublishHistory(role: string): Promise<PublishRun[]> {
    const res = await fetch(`${API_BASE}/admin/catalog/publish/history`, {
      headers: getHeaders(role)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};
