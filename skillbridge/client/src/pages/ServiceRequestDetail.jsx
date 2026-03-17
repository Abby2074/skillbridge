import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceRequestsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, DollarSign, Users, Star, Check, X, Briefcase, Send } from 'lucide-react';

export default function ServiceRequestDetail() {
  const { requestId } = useParams();
  const { user, isAuthenticated, canFreelance } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [applyModal, setApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({ cover_message: '', proposed_price: '', proposed_timeline: '' });

  const { data: request, isLoading } = useQuery({
    queryKey: ['service-request', requestId],
    queryFn: () => serviceRequestsAPI.getById(requestId).then(r => r.data),
  });

  const apply = useMutation({
    mutationFn: (data) => serviceRequestsAPI.apply(requestId, data),
    onSuccess: () => {
      addToast('Application submitted!');
      setApplyModal(false);
      queryClient.invalidateQueries(['service-request', requestId]);
    },
    onError: (err) => addToast(err.response?.data?.error || 'Failed to apply', 'error'),
  });

  const acceptApp = useMutation({
    mutationFn: (appId) => serviceRequestsAPI.acceptApplication(requestId, appId),
    onSuccess: (res) => {
      addToast('Application accepted! Order created.');
      navigate('/dashboard/service-orders');
    },
    onError: (err) => addToast(err.response?.data?.error || 'Failed to accept', 'error'),
  });

  if (isLoading) return <div className="max-w-4xl mx-auto p-8"><Loader /></div>;
  if (!request) return <div className="max-w-4xl mx-auto p-8"><p>Request not found.</p></div>;

  const isOwner = user?.user_id === request.buyer_id;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/service-requests" className="text-primary text-sm font-medium hover:underline flex items-center gap-1 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Requests
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              {request.category_name && (
                <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full">{request.category_name}</span>
              )}
              <span className={`text-xs px-2 py-1 rounded-full ${request.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {request.status}
              </span>
            </div>
            <h1 className="font-display font-bold text-2xl text-text-main">{request.title}</h1>
            <p className="text-text-muted text-sm mt-1">Posted by {request.buyer_name} | {request.institution}</p>

            <hr className="my-4 border-border" />

            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-text-main whitespace-pre-wrap">{request.description}</p>

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-text-muted">
              {(request.budget_min || request.budget_max) && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Budget: GHS {Number(request.budget_min || 0).toFixed(0)} - {Number(request.budget_max || 0).toFixed(0)}
                </span>
              )}
              {request.deadline && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> Deadline: {format(new Date(request.deadline), 'MMM dd, yyyy')}
                </span>
              )}
            </div>
          </div>

          {/* Applications (visible to buyer) */}
          {isOwner && request.applications?.length > 0 && (
            <div className="card">
              <h3 className="font-display font-semibold text-lg mb-4">
                Applications ({request.applications.length})
              </h3>
              <div className="space-y-4">
                {request.applications.map(app => (
                  <div key={app.application_id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                          {app.freelancer_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{app.freelancer_name}</p>
                          <p className="text-text-muted text-xs">{app.freelancer_institution}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                            {app.avg_rating && (
                              <span className="flex items-center gap-1 text-accent"><Star className="h-3 w-3 fill-accent" /> {app.avg_rating}</span>
                            )}
                            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {app.completed_orders} orders</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-accent">GHS {Number(app.proposed_price).toFixed(0)}</p>
                        {app.proposed_timeline && <p className="text-xs text-text-muted">{app.proposed_timeline}</p>}
                      </div>
                    </div>
                    <p className="text-sm text-text-main mt-3">{app.cover_message}</p>
                    {app.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => acceptApp.mutate(app.application_id)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Accept
                        </button>
                      </div>
                    )}
                    {app.status !== 'pending' && (
                      <span className={`inline-block mt-3 text-xs px-2 py-1 rounded-full ${app.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {app.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <div className="card sticky top-24">
            {!isOwner && isAuthenticated && canFreelance && request.status === 'open' && (
              <button onClick={() => setApplyModal(true)} className="btn-primary w-full flex items-center justify-center gap-2 mb-4">
                <Send className="h-4 w-4" /> Apply to This Request
              </button>
            )}
            {!isOwner && isAuthenticated && !canFreelance && (
              <p className="text-text-muted text-sm text-center mb-4">Only verified students can apply.</p>
            )}
            {!isAuthenticated && (
              <Link to="/login" className="btn-primary w-full text-center block mb-4">Login to Apply</Link>
            )}
            {isOwner && (
              <p className="text-text-muted text-sm text-center mb-4">This is your request.</p>
            )}
            <div className="text-sm space-y-2 text-text-muted">
              <p>Posted: {format(new Date(request.created_at), 'MMM dd, yyyy')}</p>
              {request.deadline && <p>Deadline: {format(new Date(request.deadline), 'MMM dd, yyyy')}</p>}
              {(request.budget_min || request.budget_max) && (
                <p>Budget: GHS {Number(request.budget_min || 0).toFixed(0)} - {Number(request.budget_max || 0).toFixed(0)}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      <Modal isOpen={applyModal} onClose={() => setApplyModal(false)} title="Apply to Request">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">Applying to: <span className="font-medium text-text-main">{request.title}</span></p>
          <div>
            <label className="block text-sm font-medium mb-1">Cover Message</label>
            <textarea
              value={applyForm.cover_message}
              onChange={e => setApplyForm(p => ({ ...p, cover_message: e.target.value }))}
              className="input-field" rows={4}
              placeholder="Introduce yourself and explain why you're the best fit..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Your Price (GHS)</label>
              <input
                type="number"
                value={applyForm.proposed_price}
                onChange={e => setApplyForm(p => ({ ...p, proposed_price: e.target.value }))}
                className="input-field" min="1"
                placeholder={request.budget_min ? `${request.budget_min}` : '0'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Timeline</label>
              <input
                type="text"
                value={applyForm.proposed_timeline}
                onChange={e => setApplyForm(p => ({ ...p, proposed_timeline: e.target.value }))}
                className="input-field"
                placeholder="e.g. 3-5 days"
              />
            </div>
          </div>
          <button
            onClick={() => apply.mutate({ ...applyForm, proposed_price: parseFloat(applyForm.proposed_price) })}
            disabled={!applyForm.cover_message.trim() || !applyForm.proposed_price || apply.isPending}
            className="btn-primary w-full"
          >
            {apply.isPending ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
