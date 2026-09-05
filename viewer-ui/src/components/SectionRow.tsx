import React from 'react';
import { CatalogShow } from '../api/catalogClient';

interface Props {
  title: string;
  shows: CatalogShow[];
  onSelectShow: (show: CatalogShow) => void;
}

export const SectionRow: React.FC<Props> = ({ title, shows, onSelectShow }) => {
  if (!shows || shows.length === 0) return null;

  return (
    <div className="section-row">
      <h2 className="section-title">
        <span style={{ color: '#ffc657' }}>●</span> {title}
      </h2>

      <div className="row-rail">
        {shows.map(show => {
          const posterSrc = show.poster_url || 'http://localhost:8000/sample_assets/poster_good.jpg';
          const seasonCount = show.seasons ? show.seasons.length : 0;

          return (
            <div
              key={show.id}
              className="poster-card"
              onClick={() => onSelectShow(show)}
            >
              <div className="poster-img-box">
                <img
                  src={posterSrc}
                  alt={show.title}
                  loading="lazy"
                  onError={e => {
                    (e.target as HTMLImageElement).src = 'http://localhost:8000/sample_assets/poster_good.jpg';
                  }}
                />
              </div>

              <div className="poster-info">
                <div className="poster-title">{show.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  {seasonCount > 0 ? `${seasonCount} Season${seasonCount > 1 ? 's' : ''}` : 'Special'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
