import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { serviceRequestsAPI, gigsAPI } from '../api';
import { useToast } from '../components/Toast';
import { ArrowLeft } from 'lucide-react';

export default function PostServiceRequest() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', category_id: '', budget_min: '', budget_max: '', deadline: '',
  });

  const { data: categories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: () => gigsAPI.getCategories().then(r => r.data),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      addToast('Title and description are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await serviceRequestsAPI.create({
        ...form,
        budget_min: form.budget_min ? parseFloat(form.budget_min) : null,
        budget_max: form.budget_max ? parseFloat(form.budget_max) : null,
        deadline: form.deadline || null,
        category_id: form.category_id || null,
      });
      addToast('Service request posted!');
      navigate('/service-requests');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to post request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/service-requests" className="text-primary text-sm font-medium hover:underline flex items-center gap-1 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Requests
      </Link>

      <h1 className="font-display font-bold text-2xl mb-6">Post a Service Request</h1>
      <p className="text-text-muted mb-6">Describe what you need and let skilled freelancers come to you.</p>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text" value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="input-field" placeholder="e.g. Need a website for my business"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className="input-field" rows={5}
            placeholder="Describe what you need in detail..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} className="input-field">
            <option value="">Select a category (optional)</option>
            {categories?.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Min Budget (GHS)</label>
            <input type="number" value={form.budget_min} onChange={e => setForm(p => ({ ...p, budget_min: e.target.value }))} className="input-field" min="0" placeholder="e.g. 100" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Budget (GHS)</label>
            <input type="number" value={form.budget_max} onChange={e => setForm(p => ({ ...p, budget_max: e.target.value }))} className="input-field" min="0" placeholder="e.g. 500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Deadline (optional)</label>
          <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} className="input-field" />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Posting...' : 'Post Request'}
        </button>
      </form>
    </div>
  );
}
