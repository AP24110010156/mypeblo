import React, { useState } from 'react';
import { CatalogShow, CatalogEpisode } from '../api/catalogClient';
import { X, Play, Clock, Globe, Film, ChevronRight } from 'lucide-react';

interface Props {
  show: CatalogShow;
  onClose: () => void;
}

export const ShowDetailModal: React.FC<Props> = ({ show, onClose }) => {
  // Season 0 is reserved for trailers -- filter normal seasons
  const normalSeasons = show.seasons ? show.seasons.filter(s => s.season_number > 0) : [];
  const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(
    normalSeasons.length > 0 ? normalSeasons[0].season_number : 1
  );

  const activeSeason = normalSeasons.find(s => s.season_number === selectedSeasonNum);
  const trailers = show.trailers || [];

  const [activeLangs, setActiveLangs] = useState<Record<string, string>>({});

  const handleLangSelect = (contentGroup: string, lang: string) => {
    setActiveLangs(prev => ({ ...prev, [contentGroup]: lang }));
  };

  const bannerSrc = show.banner_url || 'http://localhost:8000/sample_assets/banner_good.jpg';

  return (
    <div className="detail-modal-overlay" onClick={onClose}>
      <div className="detail-modal-card" onClick={e => e.stopPropagation()}>
        {/* Banner Header */}
        <div className="modal-banner-header">
          <img
            src={bannerSrc}
            alt={show.title}
            onError={e => {
              (e.target as HTMLImageElement).src = 'http://localhost:8000/sample_assets/banner_good.jpg';
            }}
          />
          <div className="modal-banner-overlay" />

          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              border: 'none',
              borderRadius: '9999px',
              padding: '0.5rem',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            <X size={20} />
          </button>

          <div style={{ position: 'absolute', bottom: '1.5rem', left: '2rem', zIndex: 10 }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.5rem' }}>{show.title}</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="tag-pill" style={{ background: '#6366f1', color: 'white' }}>
                {show.section.toUpperCase()}
              </span>
              {show.categories.map(cat => (
                <span key={cat} className="tag-pill">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.6' }}>
            {show.synopsis || 'Enjoy high-quality kids entertainment, songs, and interactive learning episodes.'}
          </p>

          {/* Season Selector & Episode List Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Episodes
            </h3>

            {normalSeasons.length > 0 && (
              <select
                value={selectedSeasonNum}
                onChange={e => setSelectedSeasonNum(parseInt(e.target.value))}
                style={{
                  background: '#1e293b',
                  color: 'white',
                  border: '1px solid #334155',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {normalSeasons.map(s => (
                  <option key={s.season_number} value={s.season_number}>
                    Season {s.season_number} ({s.episodes.length} Episodes)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Regular Episodes List */}
          <div>
            {!activeSeason || activeSeason.episodes.length === 0 ? (
              <div style={{ color: '#94a3b8', padding: '1.5rem 0', textAlign: 'center' }}>
                No episodes available in this season.
              </div>
            ) : (
              activeSeason.episodes.map(ep => {
                const currentLang = activeLangs[ep.content_group] || ep.available_languages[0] || 'en';
                const thumbSrc = ep.artworks?.thumbnail || 'http://localhost:8000/sample_assets/thumb_good.jpg';
                const durationMin = ep.duration_seconds ? Math.ceil(ep.duration_seconds / 60) : null;

                return (
                  <div key={ep.content_group} className="episode-item-card">
                    <div className="ep-thumb-box">
                      <img
                        src={thumbSrc}
                        alt={ep.episode_title}
                        onError={e => {
                          (e.target as HTMLImageElement).src = 'http://localhost:8000/sample_assets/thumb_good.jpg';
                        }}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#e50914', fontWeight: 800, fontSize: '0.9rem' }}>
                          Episode {ep.episode_number}
                        </span>
                        {durationMin && (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Clock size={12} /> {durationMin} min
                          </span>
                        )}
                      </div>

                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>{ep.episode_title}</h4>

                      {/* Language Variants Pills (Requirement: content_group collapses variants) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Globe size={13} color="#94a3b8" />
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Available Audio:</span>
                        {ep.available_languages.map(lang => (
                          <button
                            key={lang}
                            className={`lang-pill-btn ${currentLang === lang ? 'active' : ''}`}
                            onClick={() => handleLangSelect(ep.content_group, lang)}
                          >
                            {lang.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      className="btn"
                      style={{
                        background: '#e50914',
                        color: 'white',
                        padding: '0.6rem 1rem',
                        borderRadius: '9999px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <Play size={14} fill="white" /> Play ({currentLang.toUpperCase()})
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Season 0 Trailers & Extras Section */}
          {trailers.length > 0 && (
            <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Film size={18} /> Trailers & Special Extras (Season 0)
              </h3>

              {trailers.map(t => (
                <div key={t.episode_id} className="episode-item-card" style={{ background: '#171e2e' }}>
                  <div className="ep-thumb-box" style={{ width: '120px' }}>
                    <img
                      src={t.artworks?.thumbnail || 'http://localhost:8000/sample_assets/thumb_good.jpg'}
                      alt={t.episode_title}
                      onError={e => {
                        (e.target as HTMLImageElement).src = 'http://localhost:8000/sample_assets/thumb_good.jpg';
                      }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>OFFICIAL TRAILER</div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{t.episode_title}</h4>
                  </div>

                  <button
                    className="btn"
                    style={{
                      background: '#f59e0b',
                      color: '#0f172a',
                      padding: '0.5rem 1rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      border: 'none'
                    }}
                  >
                    <Play size={14} fill="#0f172a" /> Trailer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
