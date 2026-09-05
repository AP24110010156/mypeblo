import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, PublishRun } from '../api/client';
import { Rocket, ShieldAlert, CheckCircle2, History, AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  role: string;
}

export const PublishDashboard: React.FC<Props> = ({ role }) => {
  const [forcePublish, setForcePublish] = useState(false);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState('');
  const [publishErrorMsg, setPublishErrorMsg] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const reportQuery = useQuery({
    queryKey: ['validation-report', role],
    queryFn: () => api.getValidationReport(role)
  });

  const historyQuery = useQuery({
    queryKey: ['publish-history', role],
    queryFn: () => api.getPublishHistory(role)
  });

  const handlePublish = async () => {
    setPublishSuccessMsg('');
    setPublishErrorMsg('');
    setIsPublishing(true);

    try {
      const res = await api.triggerPublish(role, forcePublish);
      setPublishSuccessMsg(`Catalogue published successfully! ${res.shows_count} shows, ${res.episodes_count} episodes committed atomically.`);
      reportQuery.refetch();
      historyQuery.refetch();
    } catch (err: any) {
      setPublishErrorMsg(err.message || 'Publishing failed');
    } finally {
      setIsPublishing(false);
    }
  };

  const report = reportQuery.data;
  const isAdmin = role === 'admin';
  const canClickPublish = isAdmin && (report?.can_publish || forcePublish);

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2>Publish Catalogue Dashboard</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Triggers atomic build of <code style={{ color: '#818cf8' }}>catalogue.json</code> in R2/Storage for the Viewer UI
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => { reportQuery.refetch(); historyQuery.refetch(); }}>
            <RefreshCw size={14} /> Refresh Status
          </button>
        </div>

        {/* Validation Report Banner */}
        {reportQuery.isLoading && <div style={{ color: 'var(--text-muted)' }}>Scanning validation report...</div>}

        {report && (
          <div style={{
            background: report.can_publish ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${report.can_publish ? 'var(--success-color)' : 'var(--warning-color)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              {report.can_publish ? (
                <CheckCircle2 size={24} color="#10b981" />
              ) : (
                <ShieldAlert size={24} color="#f59e0b" />
              )}
              <h3 style={{ fontSize: '1.1rem' }}>
                {report.can_publish ? 'Catalogue is Ready for Publish' : `Publish Blocked: ${report.total_issues} Validation Issue(s) Found`}
              </h3>
            </div>

            {!report.can_publish && (
              <div style={{ fontSize: '0.85rem', color: '#fde68a', marginTop: '0.5rem' }}>
                Editors must resolve the following blocking issues before an Admin can publish:
              </div>
            )}

            {/* Render Issues by Type */}
            {Object.entries(report.issues_by_type).map(([issueType, issues]) => (
              <div key={issueType} style={{ marginTop: '0.75rem', background: 'rgba(0, 0, 0, 0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <strong style={{ fontSize: '0.85rem', textTransform: 'capitalize', color: '#f8fafc' }}>
                  • {issueType.replace('_', ' ')} ({issues.length})
                </strong>
                <ul style={{ paddingLeft: '1.25rem', marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {issues.map((issue, idx) => (
                    <li key={idx} style={{ marginBottom: '0.2rem' }}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Action Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <strong style={{ fontSize: '0.95rem' }}>Publish Action & RBAC Status</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Role: <span className={`badge role-${role}`} style={{ background: isAdmin ? '#ec4899' : '#3b82f6', color: 'white' }}>{role.toUpperCase()}</span>
                {!isAdmin && <span style={{ color: '#fca5a5', marginLeft: '0.5rem' }}>(Editors cannot publish. Switch to Admin role to publish.)</span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {isAdmin && !report?.can_publish && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#fca5a5', cursor: 'pointer' }}>
                  <input type="checkbox" checked={forcePublish} onChange={e => setForcePublish(e.target.checked)} />
                  Admin Force Publish Override
                </label>
              )}

              <button
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.5rem', background: canClickPublish ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--bg-surface-elevated)' }}
                disabled={!canClickPublish || isPublishing}
                onClick={handlePublish}
              >
                <Rocket size={16} />
                {isPublishing ? 'Publishing Catalogue...' : 'Publish Catalogue Now'}
              </button>
            </div>
          </div>

          {!isAdmin && (
            <div className="error-box" style={{ marginTop: '0.5rem' }}>
              <AlertOctagon size={14} style={{ display: 'inline', marginRight: '0.4rem' }} />
              Publish button is disabled because your current active role is <strong>Editor</strong>. Only <strong>Admin</strong> users can trigger catalogue publishing.
            </div>
          )}

          {isAdmin && !report?.can_publish && !forcePublish && (
            <div className="error-box" style={{ marginTop: '0.5rem' }}>
              <AlertOctagon size={14} style={{ display: 'inline', marginRight: '0.4rem' }} />
              Publish button is disabled because there are unresolved validation errors blocking publish. Resolve issues or check 'Admin Force Publish Override'.
            </div>
          )}

          {publishSuccessMsg && <div className="success-box">{publishSuccessMsg}</div>}
          {publishErrorMsg && <div className="error-box">{publishErrorMsg}</div>}
        </div>
      </div>

      {/* History Log */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <History size={18} color="#818cf8" />
          <h3>Publish Run History Log</h3>
        </div>

        {historyQuery.isLoading && <div style={{ color: 'var(--text-muted)' }}>Loading run history...</div>}

        {historyQuery.data && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Timestamp</th>
                  <th>Published By</th>
                  <th>Shows</th>
                  <th>Episodes</th>
                  <th>Outcome</th>
                  <th>Error / Details</th>
                </tr>
              </thead>
              <tbody>
                {historyQuery.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                      No publish runs recorded yet.
                    </td>
                  </tr>
                ) : (
                  historyQuery.data.map((run: PublishRun) => (
                    <tr key={run.id}>
                      <td style={{ fontFamily: 'monospace' }}>#{run.id}</td>
                      <td>{new Date(run.published_at).toLocaleString()}</td>
                      <td><strong>{run.published_by}</strong></td>
                      <td>{run.shows_count}</td>
                      <td>{run.episodes_count}</td>
                      <td>
                        <span className="badge" style={{
                          background: run.outcome === 'success' ? 'rgba(16, 185, 129, 0.15)' : run.outcome === 'blocked' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: run.outcome === 'success' ? '#34d399' : run.outcome === 'blocked' ? '#fbbf24' : '#fca5a5'
                        }}>
                          {run.outcome}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {run.error_message || 'Committed atomically to storage.'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
