import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingsAPI, serviceOrdersAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { format } from 'date-fns';
import { Package, CheckCircle, Clock, Truck, XCircle, Star, ArrowLeft, BookOpen, Briefcase, MapPin } from 'lucide-react';

const SESSION_STEPS = [
  { key: 'requested', label: 'Requested', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'in_progress', label: 'In Progress', icon: Truck },
  { key: 'completed', label: 'Completed', icon: Package },
  { key: 'rated', label: 'Rated', icon: Star },
];

const SERVICE_STEPS = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'in_progress', label: 'In Progress', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
];

function getStepIndex(steps, status) {
  if (status === 'cancelled') return -1;
  return steps.findIndex(s => s.key === status);
}

function StatusTimeline({ steps, currentStatus }) {
  const currentIdx = getStepIndex(steps, currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  return (
    <div className="relative">
      {isCancelled && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 rounded-lg">
          <XCircle className="h-5 w-5 text-danger" />
          <span className="text-danger font-medium text-sm">This order has been cancelled</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isCompleted = !isCancelled && idx <= currentIdx;
          const isCurrent = !isCancelled && idx === currentIdx;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center flex-1 relative">
              {/* Connector line */}
              {idx > 0 && (
                <div className={`absolute top-5 right-1/2 w-full h-0.5 -translate-y-1/2 ${isCompleted ? 'bg-success' : 'bg-gray-200'}`} style={{ left: '-50%' }} />
              )}
              <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                isCurrent ? 'border-success bg-success text-white' :
                isCompleted ? 'border-success bg-success/10 text-success' :
                'border-gray-200 bg-white text-gray-400'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-xs mt-2 text-center font-medium ${isCurrent ? 'text-success' : isCompleted ? 'text-text-main' : 'text-text-muted'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderTracking() {
  const { user } = useAuth();
  const [tab, setTab] = useState('all');

  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => bookingsAPI.getAll().then(r => r.data),
  });

  const { data: serviceOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ['my-service-orders'],
    queryFn: () => serviceOrdersAPI.getAll().then(r => r.data),
  });

  const isLoading = loadingBookings || loadingOrders;

  // Combine all orders
  const allOrders = [
    ...(bookings || []).map(b => ({
      id: b.booking_id,
      type: 'session',
      title: b.title || b.skill_name || 'Tutoring Session',
      provider: b.tutor_name,
      status: b.status,
      price: b.session_fee,
      date: b.scheduled_date || b.requested_at,
      delivery_format: b.delivery_format,
    })),
    ...(serviceOrders || []).map(o => ({
      id: o.order_id,
      type: 'service',
      title: o.gig_title || o.request_title || 'Service Order',
      provider: user?.user_id === o.buyer_id ? o.freelancer_name : o.buyer_name,
      role: user?.user_id === o.buyer_id ? 'buyer' : 'freelancer',
      status: o.status,
      price: o.agreed_price,
      date: o.created_at,
      delivery_format: 'remote',
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredOrders = tab === 'all' ? allOrders :
    tab === 'sessions' ? allOrders.filter(o => o.type === 'session') :
    tab === 'services' ? allOrders.filter(o => o.type === 'service') :
    tab === 'active' ? allOrders.filter(o => !['completed', 'rated', 'cancelled'].includes(o.status)) :
    allOrders;

  if (isLoading) return <div className="max-w-4xl mx-auto p-8"><Loader /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/dashboard" className="text-primary text-sm font-medium hover:underline flex items-center gap-1 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Package className="h-6 w-6 text-red-brand" />
        <h1 className="font-display font-bold text-2xl text-text-main">Order Tracking</h1>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { key: 'all', label: 'All Orders' },
          { key: 'active', label: 'Active' },
          { key: 'sessions', label: 'Tutoring' },
          { key: 'services', label: 'Services' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState title="No orders found" message="You don't have any orders yet." icon={Package} />
      ) : (
        <div className="space-y-6">
          {filteredOrders.map(order => (
            <div key={order.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${order.type === 'service' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                    {order.type === 'service' ? <Briefcase className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-main">{order.title}</h3>
                    <p className="text-text-muted text-sm">{order.type === 'service' ? (order.role === 'buyer' ? 'Freelancer' : 'Buyer') : 'Tutor'}: {order.provider}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                      <span>{format(new Date(order.date), 'MMM dd, yyyy')}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {order.delivery_format || 'Online'}</span>
                    </div>
                  </div>
                </div>
                <span className="font-display font-bold text-accent">GHS {Number(order.price).toFixed(2)}</span>
              </div>

              {/* Timeline */}
              <StatusTimeline
                steps={order.type === 'service' ? SERVICE_STEPS : SESSION_STEPS}
                currentStatus={order.status}
              />

              <p className="text-xs text-text-muted mt-3 font-mono">Order ID: {order.id.slice(0, 8)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
