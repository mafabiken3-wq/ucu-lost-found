import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export default function AdminDashboard() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionMsg, setActionMsg] = useState('');
  const [reviewing, setReviewing] = useState(null); // claim id being reviewed
  const [response, setResponse] = useState('');

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const { data } = await api.get('/admin/claims', { params });
      setClaims(data.claims || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const handleReview = async (claimId, status) => {
    setActionMsg('');
    try {
      await api.patch(`/admin/claims/${claimId}`, {
        status,
        admin_response: response.trim() || undefined,
      });
      setActionMsg(`Claim ${status} successfully.`);
      setReviewing(null);
      setResponse('');
      fetchClaims();
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed');
    }
  };

  const handleMarkReturned = async (reportId) => {
    setActionMsg('');
    try {
      await api.patch(`/admin/reports/${reportId}/return`);
      setActionMsg('Item marked as returned.');
      fetchClaims();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark returned');
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Administrator dashboard</h1>
        <p>Review ownership claims and confirm item returns.</p>
      </div>

      {actionMsg && <div className="alert alert-success">{actionMsg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="flex gap-1 mb-2 items-center">
        <label htmlFor="statusFilter" className="text-sm">Filter by status:</label>
        <select
          id="statusFilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-state">Loading claims</div>
      ) : claims.length === 0 ? (
        <div className="empty-state">No claims match this filter.</div>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Claimant</th>
                <th>Evidence</th>
                <th>Private details</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.report_title}</strong>
                    <br />
                    <span className="text-sm text-muted">{c.location}</span>
                  </td>
                  <td>
                    {c.claimant_name}
                    <br />
                    <span className="text-sm text-muted">{c.claimant_email}</span>
                  </td>
                  <td style={{ maxWidth: 200, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                    {c.evidence}
                  </td>
                  <td style={{ maxWidth: 180, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                    {c.private_details || '—'}
                  </td>
                  <td>
                    <span className={`badge badge-${c.status}`}>{c.status}</span>
                    {c.admin_response && (
                      <p className="text-sm text-muted mt-1">{c.admin_response}</p>
                    )}
                  </td>
                  <td>
                    {c.status === 'pending' && (
                      <div className="flex gap-1" style={{ flexDirection: 'column' }}>
                        {reviewing === c.id ? (
                          <>
                            <textarea
                              value={response}
                              onChange={(e) => setResponse(e.target.value)}
                              placeholder="Optional response / collection instructions"
                              rows={2}
                              style={{ fontSize: '0.85rem', minWidth: 160 }}
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="btn btn-success btn-sm"
                                onClick={() => handleReview(c.id, 'approved')}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleReview(c.id, 'rejected')}
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => { setReviewing(null); setResponse(''); }}
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setReviewing(c.id)}
                          >
                            Review
                          </button>
                        )}
                      </div>
                    )}
                    {c.status === 'approved' && c.report_status !== 'returned' && (
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={() => handleMarkReturned(c.report_id)}
                      >
                        Mark returned
                      </button>
                    )}
                    {c.report_status === 'returned' && (
                      <span className="badge badge-returned">Returned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
