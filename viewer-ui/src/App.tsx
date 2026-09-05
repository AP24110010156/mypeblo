import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { SectionRow } from './components/SectionRow';
import { ShowDetailModal } from './components/ShowDetailModal';
import { catalogApi, CatalogResponse, CatalogShow, SearchResultItem } from './api/catalogClient';
import { Search, Film, AlertCircle } from 'lucide-react';

export function App() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');

  const [searchResults, setSearchResults] = useState<SearchResultItem[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedShow, setSelectedShow] = useState<CatalogShow | null>(null);

  // 1. Initial Load: Fetch Published Catalogue
  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const data = await catalogApi.getCatalog();
        setCatalog(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load published catalogue.');
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  // 2. Trigger Composite Search API when search inputs change
  useEffect(() => {
    const hasFilter = q.trim() !== '' || selectedCategory !== '' || selectedLanguage !== '';
    if (!hasFilter) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await catalogApi.searchCatalog({
          q: q.trim(),
          category: selectedCategory,
          language: selectedLanguage
        });
        setSearchResults(res.results || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [q, selectedCategory, selectedLanguage]);

  // Pick first show from 'featured' section as hero
  const heroShow = catalog?.sections?.featured?.[0] || catalog?.sections?.series?.[0] || null;

  return (
    <div>
      <Navbar
        q={q}
        onSearchChange={setQ}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
      />

      {loading && (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="skeleton" style={{ width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 1rem auto' }} />
            <h2>Loading Peblo TV Streaming Mode...</h2>
          </div>
        </div>
      )}

      {error && (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #ef4444', padding: '2rem', borderRadius: '16px', maxWidth: '500px', textAlign: 'center' }}>
            <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Catalogue Unavailable</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>
            <p style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
              Ensure the backend is running at <code style={{ color: '#818cf8' }}>http://localhost:8000</code> and a publish run has been executed from the CMS dashboard.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* SEARCH MODE VIEW */}
          {searchResults !== null ? (
            <div style={{ padding: '100px 4% 4rem 4%', minHeight: '100vh' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
                Search Results {isSearching ? '(Searching...)' : `(${searchResults.length} matches)`}
              </h2>

              {searchResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#121824', borderRadius: '16px', border: '1px solid #1e293b' }}>
                  <Search size={48} color="#94a3b8" style={{ margin: '0 auto 1rem auto' }} />
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Matches Found</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                    We couldn't find any shows or episodes matching "{q}". Try clearing filters or searching for another title!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  {searchResults.map((item, idx) => {
                    const posterSrc = item.poster_url || 'http://localhost:8000/sample_assets/poster_good.jpg';
                    
                    // Create dummy show object for modal trigger
                    const fullShow: CatalogShow = {
                      id: item.show_id,
                      title: item.show_title,
                      slug: item.slug,
                      section: item.section,
                      categories: item.categories,
                      synopsis: item.synopsis,
                      poster_url: item.poster_url,
                      banner_url: item.banner_url,
                      seasons: [
                        {
                          season_number: item.season_number,
                          episodes: [
                            {
                              content_group: item.content_group,
                              season_number: item.season_number,
                              episode_number: item.episode_number,
                              episode_title: item.episode_title,
                              duration_seconds: item.duration_seconds,
                              available_languages: item.available_languages,
                              artworks: item.artworks,
                              variants: []
                            }
                          ]
                        }
                      ],
                      trailers: []
                    };

                    return (
                      <div
                        key={idx}
                        className="poster-card"
                        onClick={() => setSelectedShow(fullShow)}
                      >
                        <div className="poster-img-box">
                          <img
                            src={posterSrc}
                            alt={item.episode_title}
                            onError={e => {
                              (e.target as HTMLImageElement).src = 'http://localhost:8000/sample_assets/poster_good.jpg';
                            }}
                          />
                        </div>
                        <div className="poster-info">
                          <div style={{ fontSize: '0.75rem', color: '#e50914', fontWeight: 800 }}>{item.show_title}</div>
                          <div className="poster-title">{item.episode_title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                            S{item.season_number} E{item.episode_number} • {item.available_languages.join('/').toUpperCase()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* NORMAL NETFLIX-STYLE HOMEPAGE VIEW */
            <>
              <HeroBanner show={heroShow} onSelectShow={setSelectedShow} />

              <div className="sections-wrapper">
                {catalog?.sections && Object.entries(catalog.sections).map(([secName, shows]) => (
                  <SectionRow
                    key={secName}
                    title={secName}
                    shows={shows}
                    onSelectShow={setSelectedShow}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {selectedShow && (
        <ShowDetailModal
          show={selectedShow}
          onClose={() => setSelectedShow(null)}
        />
      )}
    </div>
  );
}

export default App;
