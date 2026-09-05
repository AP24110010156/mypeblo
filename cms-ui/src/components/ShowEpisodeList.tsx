import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, Episode } from '../api/client';
import { Search, Filter, Edit3, Image as ImageIcon, CheckCircle, AlertTriangle } from 'lucide-react';
import { EpisodeModal } from './EpisodeModal';

interface Props {
  role: string;
}

export const ShowEpisodeList: React.FC<Props> = ({ role }) => {
  const [section, setSection] = useState('');
  const [status, setStatus] = useState('');
  const [language, setLanguage] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const [selectedEp, setSelectedEp] = useState<Episode | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['episodes', role, section, status, language, q, page],
    queryFn: () => api.getEpisodes(role, { section, status, language, q, page })
  });

  const getArtworkBadge = (ep: Episode, type: string) => {
    const hasType = ep.artworks.some(a => a.art_type.toLowerCase() === type);
    return (
      <span
        key={type}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.2rem',
          fontSize: '0.7rem',
          padding: '0.15rem 0.4rem',
          borderRadius: '4px',
          background: hasType ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: hasType ? '#34d399' : '#fca5a5',
          border: `1px solid ${hasType ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}
      >
        {hasType ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
        {type}
      </span>
    );
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2>Catalogue Content Manager</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Manage shows, episodes, audio variants, and required artwork
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            style={{ width: '100%', paddingLeft: '2.4rem' }}
            placeholder="Search show, episode, or ID..."
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
          />
        </div>

        <select className="input-field" value={section} onChange={e => { setSection(e.target.value); setPage(1); }}>
          <option value="">All Sections</option>
          <option value="featured">Featured</option>
          <option value="series">Series</option>
          <option value="minisodes">Minisodes</option>
          <option value="songs">Songs</option>
        </select>

        <select className="input-field" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>

        <select className="input-field" value={language} onChange={e => { setLanguage(e.target.value); setPage(1); }}>
          <option value="">All Languages</option>
          <option value="en">English (en)</option>
          <option value="hi">Hindi (hi)</option>
        </select>
      </div>

      {isLoading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading episodes catalogue...
        </div>
      )}

      {isError && (
        <div className="error-box">
          Failed to fetch episodes: {(error as any)?.message}
        </div>
      )}

      {data && (
        <>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Show Title</th>
                  <th>Season / Ep</th>
                  <th>Episode Title</th>
                  <th>Duration</th>
                  <th>Lang</th>
                  <th>Content Group</th>
                  <th>Status</th>
                  <th>Artwork</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.episodes.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No episodes match current filters.
                    </td>
                  </tr>
                ) : (
                  data.episodes.map((ep: Episode) => (
                    <tr key={ep.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ep.episode_id}</td>
                      <td>
                        <strong>{ep.show_title}</strong>
                        {ep.section && <div style={{ fontSize: '0.75rem', color: '#818cf8' }}>{ep.section}</div>}
                      </td>
                      <td>
                        {ep.season_number === 0 ? (
                          <span style={{ color: '#f59e0b', fontWeight: 700 }}>S0 (Trailer)</span>
                        ) : (
                          `S${ep.season_number} E${ep.episode_number}`
                        )}
                      </td>
                      <td>{ep.episode_title}</td>
                      <td>{ep.duration_seconds ? `${Math.floor(ep.duration_seconds / 60)}m ${ep.duration_seconds % 60}s` : <span style={{ color: 'var(--danger-color)' }}>Missing</span>}</td>
                      <td><span className="badge" style={{ background: '#3b82f620', color: '#60a5fa' }}>{ep.language.toUpperCase()}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{ep.content_group}</td>
                      <td>
                        <span className={`badge badge-${ep.status}`}>
                          {ep.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
                          {getArtworkBadge(ep, 'poster')}
                          {getArtworkBadge(ep, 'banner')}
                          {getArtworkBadge(ep, 'thumbnail')}
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }} onClick={() => setSelectedEp(ep)}>
                          <Edit3 size={14} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <span>Showing page {data.page} of {Math.ceil(data.total / data.limit) || 1} ({data.total} total episodes)</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </button>
              <button className="btn btn-secondary" disabled={page * data.limit >= data.total} onClick={() => setPage(p => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {selectedEp && (
        <EpisodeModal
          episode={selectedEp}
          role={role}
          onClose={() => setSelectedEp(null)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};
