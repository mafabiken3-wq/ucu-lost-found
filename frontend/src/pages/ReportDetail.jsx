import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ReportDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimEvidence, setClaimEvidence] = useState('');
  const [claimMsg, setClaimMsg] = useState('');
  const [claimError, setClaimError] = useState('');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/reports/${id}`);
        if (!cancelled) setReport(data.report);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'Report not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const canClaim =
    report &&
    report.type === 'found' &&
    report.status === 'open' &&
    report.reporter_id !== user?.id;

  const handleClaim = async (e) => {
    e.preventDefault();
    setClaimError('');
    setClaimMsg('');
    if (!claimEvidence.trim()) {
      setClaimError('Please describe why you believe this item is yours.');
      return;
    }
    setClaiming(true);
    try {
      await api.post('/claims', { report_id: report.id, evidence: claimEvidence.trim() });
      setClaimMsg('Claim submitted successfully. An administrator will review it.');
      setClaimEvidence('');
    } catch (err) {
      setClaimError(err.response?.data?.error || 'Failed to submit claim');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return <div className="loading-state">Loading report</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!report) return null;

  return (
    <>
      <div className="page-header">
        <div className="flex gap-1 mb-1" style={{ flexWrap: 'wrap' }}>
          <span className={`badge badge-${report.type}`}>{report.type}</span>
          <span className={`badge badge-${report.status}`}>{report.status}</span>
        </div>
        <h1>{report.title}</h1>
        <p>
          {report.category} · {report.location} · {report.incident_date}
          {report.reporter_name && <> · Reported by {report.reporter_name}</>}
        </p>
      </div>

      <div className="card mb-2">
        <h2 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', color: 'var(--blue)' }}>
          Public description
        </h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{report.public_desc}</p>

        {/* Private details – only shown if the API returned them (owner or admin) */}
        {report.private_details != null && (
          <div className="alert alert-info mt-2">
            <strong>Private identifying details</strong> (visible only to you / admin)
            <p style={{ marginTop: '0.35rem', whiteSpace: 'pre-wrap' }}>{report.private_details}</p>
          </div>
        )}
      </div>

      {canClaim && (
        <div className="card">
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', color: 'var(--blue)' }}>
            Claim this item
          </h2>
          <p className="text-sm text-muted mb-1">
            Explain privately why you believe this item belongs to you. Your evidence is visible
            only to you and the administrator.
          </p>

          {claimMsg && <div className="alert alert-success">{claimMsg}</div>}
          {claimError && <div className="alert alert-error">{claimError}</div>}

          <form onSubmit={handleClaim}>
            <div className="form-group">
              <label htmlFor="evidence">Your claim evidence</label>
              <textarea
                id="evidence"
                value={claimEvidence}
                onChange={(e) => setClaimEvidence(e.target.value)}
                placeholder="e.g. The blue keyring has my initials OJ on the reverse side…"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={claiming}>
              {claiming ? 'Submitting…' : 'Submit claim'}
            </button>
          </form>
        </div>
      )}

      {report.reporter_id === user?.id && (
        <p className="text-sm text-muted mt-2">
          This is your report. You cannot claim an item you reported as found.
        </p>
      )}

      {report.status === 'returned' && (
        <div className="alert alert-info mt-2">
          This item has been returned. No further claims are accepted.
        </div>
      )}

      <p className="mt-2">
        <Link to="/">← Back to browse</Link>
      </p>
    </>
  );
}
