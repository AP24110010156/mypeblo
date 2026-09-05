import React, { useState } from 'react';
import { Episode, api } from '../api/client';
import { X, Upload, CheckCircle, AlertTriangle, Image as ImageIcon } from 'lucide-react';

interface Props {
  episode: Episode;
  role: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const EpisodeModal: React.FC<Props> = ({ episode, role, onClose, onSuccess }) => {
  const [title, setTitle] = useState(episode.episode_title);
  const [duration, setDuration] = useState(episode.duration_seconds || 0);
  const [status, setStatus] = useState(episode.status);
  const [language, setLanguage] = useState(episode.language);
  const [contentGroup, setContentGroup] = useState(episode.content_group);
  const [seasonNumber, setSeasonNumber] = useState(episode.season_number);

  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [successMsgs, setSuccessMsgs] = useState<Record<string, string>>({});

  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const getArtwork = (type: string) => {
    return episode.artworks.find(a => a.art_type.toLowerCase() === type);
  };

  const handleFileUpload = async (artType: string, file: File) => {
    setUploadErrors(prev => ({ ...prev, [artType]: '' }));
    setSuccessMsgs(prev => ({ ...prev, [artType]: '' }));
    setUploading(prev => ({ ...prev, [artType]: true }));

    try {
      const res = await api.uploadArtwork(role, episode.episode_id, artType, file);
      setSuccessMsgs(prev => ({
        ...prev,
        [artType]: `Uploaded successfully (${res.spec.width}x${res.spec.height} px, ${res.spec.size_kb} KB)`
      }));
      onSuccess();
    } catch (err: any) {
      setUploadErrors(prev => ({
        ...prev,
        [artType]: err.message || 'Upload failed'
      }));
    } finally {
      setUploading(prev => ({ ...prev, [artType]: false }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);

    try {
      await api.updateEpisode(role, episode.episode_id, {
        episode_title: title,
        duration_seconds: duration,
        status: status,
        language: language,
        content_group: contentGroup,
        season_number: seasonNumber
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save episode changes');
    } finally {
      setIsSaving(false);
    }
  };

  const artSpecs = [
    {
      type: 'poster',
      title: 'Poster Artwork',
      aspect: '2:3',
      target: '600 × 900 px',
      maxSize: '200 KB',
      description: 'Used for row cards in viewer UI'
    },
    {
      type: 'banner',
      title: 'Banner Artwork',
      aspect: '16:9',
      target: '1280 × 720 px',
      maxSize: '200 KB',
      description: 'Used for hero banner surface'
    },
    {
      type: 'thumbnail',
      title: 'Thumbnail Artwork',
      aspect: '16:9',
      target: '640 × 360 px',
      maxSize: '200 KB',
      description: 'Used for episode lists & cards'
    }
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2>Edit Episode — {episode.episode_id}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {episode.show_title} • Season {episode.season_number} Episode {episode.episode_number}
            </p>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>

        {formError && <div className="error-box" style={{ marginBottom: '1rem' }}>{formError}</div>}

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Episode Title
              </label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%' }}
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Duration (Seconds)
              </label>
              <input
                type="number"
                className="input-field"
                style={{ width: '100%' }}
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Status
              </label>
              <select
                className="input-field"
                style={{ width: '100%' }}
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Language
              </label>
              <select
                className="input-field"
                style={{ width: '100%' }}
                value={language}
                onChange={e => setLanguage(e.target.value)}
              >
                <option value="en">English (en)</option>
                <option value="hi">Hindi (hi)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Content Group (Language Variant Key)
              </label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%' }}
                value={contentGroup}
                onChange={e => setContentGroup(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                Season Number (0 = Reserved for Trailers)
              </label>
              <input
                type="number"
                className="input-field"
                style={{ width: '100%' }}
                value={seasonNumber}
                onChange={e => setSeasonNumber(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
            Artwork Requirements & Upload Slots
          </h3>

          <div className="upload-slots-grid">
            {artSpecs.map(spec => {
              const currentArt = getArtwork(spec.type);
              const hasErr = !!uploadErrors[spec.type];
              const isDone = !!currentArt;

              return (
                <div
                  key={spec.type}
                  className={`upload-slot-card ${hasErr ? 'has-error' : isDone ? 'is-uploaded' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>{spec.title}</strong>
                    {isDone ? (
                      <CheckCircle size={16} color="#10b981" />
                    ) : (
                      <AlertTriangle size={16} color="#f59e0b" />
                    )}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Target: <strong>{spec.target}</strong> ({spec.aspect}) • Max {spec.maxSize}
                  </div>

                  <div className="art-preview-box">
                    {currentArt ? (
                      <img src={currentArt.url} alt={spec.type} />
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        <ImageIcon size={24} />
                        <span>No {spec.type} uploaded</span>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    id={`file-input-${spec.type}`}
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(spec.type, e.target.files[0]);
                      }
                    }}
                  />

                  <label
                    htmlFor={`file-input-${spec.type}`}
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem', cursor: 'pointer' }}
                  >
                    <Upload size={14} />
                    {uploading[spec.type] ? 'Uploading...' : currentArt ? 'Replace Artwork' : 'Upload File'}
                  </label>

                  {uploadErrors[spec.type] && (
                    <div className="error-box" style={{ textAlign: 'left' }}>
                      {uploadErrors[spec.type]}
                    </div>
                  )}

                  {successMsgs[spec.type] && (
                    <div className="success-box" style={{ textAlign: 'left' }}>
                      {successMsgs[spec.type]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Episode Metadata'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
