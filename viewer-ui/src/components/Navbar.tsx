import React, { useState, useEffect } from 'react';
import { Search, Globe, Sparkles } from 'lucide-react';

interface Props {
  q: string;
  onSearchChange: (val: string) => void;
  selectedCategory: string;
  onCategoryChange: (val: string) => void;
  selectedLanguage: string;
  onLanguageChange: (val: string) => void;
}

const CATEGORIES = [
  'adventure', 'folk', 'friendship', 'india', 'language', 'learning',
  'maths', 'music', 'nature', 'reading', 'science', 'singalong',
  'stories', 'travel', 'values'
];

export const Navbar: React.FC<Props> = ({
  q,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedLanguage,
  onLanguageChange
}) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <a href="#" className="brand-logo">
          <span style={{ color: '#6f2bc2', fontFamily: 'Grandstander', fontWeight: 900, fontSize: '2rem' }}>
            PeBl<span style={{ color: '#ffc657' }}>ô</span>
          </span>
          <span className="brand-badge" style={{ background: '#6f2bc2', color: '#ffc657', fontWeight: 900 }}>
            TV
          </span>
        </a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Composite Search Input */}
        <div style={{ position: 'relative', width: '250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search shows or episodes..."
            value={q}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              background: '#151226',
              border: '1px solid #262042',
              color: 'white',
              padding: '0.55rem 0.8rem 0.55rem 2.5rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Category Filter Dropdown */}
        <select
          value={selectedCategory}
          onChange={e => onCategoryChange(e.target.value)}
          style={{
            background: '#151226',
            border: '1px solid #262042',
            color: 'white',
            padding: '0.55rem 0.9rem',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            outline: 'none',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>

        {/* Language Filter Selector */}
        <select
          value={selectedLanguage}
          onChange={e => onLanguageChange(e.target.value)}
          style={{
            background: '#151226',
            border: '1px solid #262042',
            color: 'white',
            padding: '0.55rem 0.9rem',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            outline: 'none',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          <option value="">🌐 All Languages</option>
          <option value="en">English (EN)</option>
          <option value="hi">Hindi (HI)</option>
        </select>
      </div>
    </nav>
  );
};
