import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CATEGORIES = ['Keys', 'Electronics', 'Books', 'Clothing', 'ID / Cards', 'Bags', 'Other'];

const initial = {
  type: 'lost',
  title: '',
  category: '',
  public_desc: '',
  private_details: '',
  location: '',
  incident_date: '',
};

export default function ReportForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.category) e.category = 'Please select a category';
    if (!form.public_desc.trim()) e.public_desc = 'Public description is required';
    if (!form.location.trim()) e.location = 'Location is required';
    if (!form.incident_date) e.incident_date = 'Date is required';
    if (form.type === 'found' && !form.private_details.trim()) {
      e.private_details = 'Identifying details help verify the true owner';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        type: form.type,
        title: form.title.trim(),
        category: form.category,
        public_desc: form.public_desc.trim(),
        location: form.location.trim(),
        incident_date: form.incident_date,
        private_details: form.type === 'found' ? form.private_details.trim() : null,
      };
      const { data } = await api.post('/reports', payload);
      navigate(`/report/${data.report.id}`);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.errors?.[0]?.msg ||
        'Failed to create report';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Report a lost or found item</h1>
        <p>
          Public details appear in the search listings. For found items, keep identifying
          marks in the private field so only you and the administrator can see them.
        </p>
      </div>

      {serverError && (
        <div className="alert alert-error" role="alert">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" noValidate style={{ maxWidth: 640 }}>
        <div className="form-group">
          <label htmlFor="type">Item type</label>
          <select id="type" name="type" value={form.type} onChange={handleChange}>
            <option value="lost">I lost this item</option>
            <option value="found">I found this item</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            type="text"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Set of keys with blue keyring"
            required
            aria-required="true"
            aria-invalid={!!errors.title}
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={form.category}
            onChange={handleChange}
            required
            aria-required="true"
            aria-invalid={!!errors.category}
          >
            <option value="">Select category…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.category && <p className="field-error">{errors.category}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="public_desc">Public description</label>
          <textarea
            id="public_desc"
            name="public_desc"
            value={form.public_desc}
            onChange={handleChange}
            placeholder="Describe the item without private identifying details"
            required
            aria-required="true"
            aria-invalid={!!errors.public_desc}
          />
          {errors.public_desc && <p className="field-error">{errors.public_desc}</p>}
          <p className="hint">This text is visible to everyone browsing the listings.</p>
        </div>

        {form.type === 'found' && (
          <div className="form-group">
            <label htmlFor="private_details">Private identifying details</label>
            <textarea
              id="private_details"
              name="private_details"
              value={form.private_details}
              onChange={handleChange}
              placeholder="e.g. Initials on the keyring, unique scratch, serial number…"
              aria-invalid={!!errors.private_details}
            />
            {errors.private_details && <p className="field-error">{errors.private_details}</p>}
            <p className="hint">
              Visible only to you and administrators. Do not put these details in the public
              description or photographs.
            </p>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="location">Campus location</label>
          <input
            id="location"
            name="location"
            type="text"
            value={form.location}
            onChange={handleChange}
            placeholder="e.g. N5B, Hamu Mukasa Library, Premium Hostel"
            required
            aria-required="true"
            aria-invalid={!!errors.location}
          />
          {errors.location && <p className="field-error">{errors.location}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="incident_date">Date lost / found</label>
          <input
            id="incident_date"
            name="incident_date"
            type="date"
            value={form.incident_date}
            onChange={handleChange}
            required
            aria-required="true"
            aria-invalid={!!errors.incident_date}
          />
          {errors.incident_date && <p className="field-error">{errors.incident_date}</p>}
        </div>

        <div className="flex gap-1 mt-2">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit report'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
