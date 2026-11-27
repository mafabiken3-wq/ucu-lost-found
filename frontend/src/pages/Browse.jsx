import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const CATEGORIES = ['Keys', 'Electronics', 'Books', 'Clothing', 'ID / Cards', 'Bags', 'Other'];

export default function Browse() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    keyword: '',
    type: '',
    category: '',
    location: '',
    status: 'open',
  });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const { data } = await api.get('/reports', { params });
      setReports(data.reports || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchReports();
  };

  return (
    <>
      <div className="page-header">
        <h1>Browse lost &amp; found items</h1>
        <p>Search by keyword or filter by type, category, location and status.</p>
      </div>

      <form className="filters" onSubmit={handleSearch} role="search" aria-label="Search reports">
        <div className="form-group" style={{ flex: '2 1 180px' }}>
          <label htmlFor="keyword" className="sr-only">Keyword</label>
          <input
            id="keyword"
            name="keyword"
            type="text"
            placeholder="Search keyword…"
            value={filters.keyword}
            onChange={handleFilterChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="type" className="sr-only">Type</label>
          <select id="type" name="type" value={filters.type} onChange={handleFilterChange}>
            <option value="">All types</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="category" className="sr-only">Category</label>
          <select id="category" name="category" value={filters.category} onChange={handleFilterChange}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="location" className="sr-only">Location</label>
          <input
            id="location"
            name="location"
            type="text"
            placeholder="Location…"
            value={filters.location}
            onChange={handleFilterChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="status" className="sr-only">Status</label>
          <select id="status" name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="claimed">Claimed</option>
            <option value="returned">Returned</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary btn-sm">Search</button>
      </form>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {loading ? (
        <div className="loading-state">Loading reports</div>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <p>No reports match your filters.</p>
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
              <div className="flex gap-1 mb-1" style={{ flexWrap: 'wrap' }}>
                <span className={`badge badge-${r.type}`}>{r.type}</span>
                <span className={`badge badge-${r.status}`}>{r.status}</span>
              </div>
              <h3>{r.title}</h3>
              <p className="meta">
                {r.category} · {r.location} · {r.incident_date}
              </p>
              <p>{r.public_desc}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
