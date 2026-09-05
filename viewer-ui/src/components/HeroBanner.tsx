import React, { useState } from 'react';
import { CatalogShow } from '../api/catalogClient';
import { Play, Info, Sparkles } from 'lucide-react';

interface Props {
  show: CatalogShow | null;
  onSelectShow: (show: CatalogShow) => void;
}

export const HeroBanner: React.FC<Props> = ({ show, onSelectShow }) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  if (!show) {
    return (
      <div className="hero-container skeleton" style={{ height: '65vh' }}>
        <div style={{ position: 'relative', zIndex: 10, padding: '2rem' }}>
          <div className="skeleton" style={{ width: '300px', height: '40px', borderRadius: '8px', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ width: '500px', height: '60px', borderRadius: '8px' }} />
        </div>
      </div>
    );
  }

  const bannerSrc = show.banner_url || 'http://localhost:8000/sample_assets/banner_good.jpg';

  return (
    <div className="hero-container">
      {/* Background Banner Artwork */}
      <img
        src={bannerSrc}
        alt={show.title}
        className={`hero-bg ${!imgLoaded ? 'skeleton' : ''}`}
        onLoad={() => setImgLoaded(true)}
        onError={e => {
          (e.target as HTMLImageElement).src = 'http://localhost:8000/sample_assets/banner_good.jpg';
        }}
      />
      <div className="hero-overlay" />

      <div className="hero-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Sparkles size={16} color="#ffc657" />
          <span style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ffc657', fontFamily: 'Grandstander' }}>
            FEATURED STREAMING SHOW
          </span>
        </div>

        <h1 className="hero-title">{show.title}</h1>

        <div style={{ marginBottom: '0.75rem' }}>
          <span className="tag-pill" style={{ background: '#6f2bc2', color: 'white' }}>
            {show.section.toUpperCase()}
          </span>
          {show.categories.map(cat => (
            <span key={cat} className="tag-pill">
              {cat}
            </span>
          ))}
        </div>

        <p className="hero-synopsis">
          {show.synopsis || 'Explore exciting adventures, songs, and stories with Peblo TV kids mode.'}
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {/* Signature Peblo Sunshine Yellow Button */}
          <button
            className="btn"
            style={{
              background: '#ffc657',
              color: '#0b0914',
              padding: '0.85rem 1.9rem',
              fontSize: '1.05rem',
              fontWeight: 900,
              fontFamily: 'Grandstander',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 8px 20px rgba(255, 198, 87, 0.4)'
            }}
            onClick={() => onSelectShow(show)}
          >
            <Play size={20} fill="#0b0914" /> Watch Now
          </button>

          <button
            className="btn"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              padding: '0.85rem 1.7rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onClick={() => onSelectShow(show)}
          >
            <Info size={18} /> Show Details
          </button>
        </div>
      </div>
    </div>
  );
};
