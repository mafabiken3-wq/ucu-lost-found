import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function MyItems() {
  const [tab, setTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [rRes, cRes] = await Promise.all([
          api.get('/reports/mine'),
          api.get('/claims/mine'),
        ]);
        if (!cancelled) {
          setReports(rRes.data.reports || []);
          setClaims(cRes.data.claims || []);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'Failed to load your items');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="loading-state">Loading your items</div>;

  return (
    <>
      <div className="page-header">
        <h1>My reports &amp; claims</h1>
        <p>Track the status of items you reported and claims you submitted.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="flex gap-1 mb-2">
        <button
          type="button"
          className={`btn btn-sm ${tab === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('reports')}
          aria-pressed={tab === 'reports'}
        >
          My Reports ({reports.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'claims' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('claims')}
          aria-pressed={tab === 'claims'}
        >
          My Claims ({claims.length})
        </button>
      </div>

      {tab === 'reports' && (
        reports.length === 0 ? (
          <div className="empty-state">
            <p>You have not reported any items yet.</p>
            <Link to="/report" className="btn btn-secondary mt-1">Report an item</Link>
          </div>
        ) : (
          <div className="card-grid">
            {reports.map((r) => (
              <Link
                key={r.id}
                to={`/report/${r.id}`}
                className="card report-card"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="flex gap-1 mb-1">
                  <span className={`badge badge-${r.type}`}>{r.type}</span>
                  <span className={`badge badge-${r.status}`}>{r.status}</span>
                </div>
                <h3>{r.title}</h3>
                <p className="meta">{r.location} · {r.incident_date}</p>
                <p>{r.public_desc}</p>
              </Link>
            ))}
          </div>
        )
      )}

      {tab === 'claims' && (
        claims.length === 0 ? (
          <div className="empty-state">
            <p>You have not submitted any claims yet.</p>
            <Link to="/" className="btn btn-secondary mt-1">Browse items</Link>
          </div>
        ) : (
          <div className="table-wrap card">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Admin response</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/report/${c.report_id}`}>{c.report_title}</Link>
                    </td>
                    <td>
                      <span className={`badge badge-${c.status}`}>{c.status}</span>
                    </td>
                    <td className="text-sm">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="text-sm">{c.admin_response || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  );
}
