import { useState } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI, bookingsAPI, listingsAPI, availabilityAPI, reviewsAPI, skillsAPI, invoicesAPI, gigsAPI, serviceOrdersAPI, serviceMessagesAPI, serviceRequestsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import WalletCard from '../components/WalletCard';
import StatCard from '../components/StatCard';
import BookingStatusBadge from '../components/BookingStatusBadge';
import SkillBadge from '../components/SkillBadge';
import StarRating from '../components/StarRating';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { format } from 'date-fns';
import {
  LayoutDashboard, BookOpen, Calendar, Wallet, User, Star, Clock,
  PlusCircle, Edit2, Pause, Play, Trash2, ArrowRight, FileText,
  DollarSign, TrendingUp, Users, Send, Download, Briefcase, Megaphone,
  MessageSquare, Package, Check, X as XIcon
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Dashboard() {
  const { user, isTutor, isStudent, canFreelance, refreshUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ star_rating: 5, review_text: '' });
  const [listingModal, setListingModal] = useState(null);
  const [listingForm, setListingForm] = useState({ skill_id: '', title: '', description: '', hourly_rate: '', delivery_format: 'both' });
  const [availForm, setAvailForm] = useState({ day_of_week: 'Monday', start_time: '09:00', end_time: '10:00' });
  const [messageModal, setMessageModal] = useState(null);
  const [messageText, setMessageText] = useState('');

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => usersAPI.getDashboard().then(r => r.data),
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsAPI.getAll().then(r => r.data),
  });

  const { data: myListings } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => listingsAPI.getAll().then(r => r.data),
    enabled: isTutor,
    select: (data) => data.filter(l => l.tutor_id === user?.user_id),
  });

  const { data: myAvailability } = useQuery({
    queryKey: ['my-availability'],
    queryFn: () => availabilityAPI.getByTutor(user?.user_id).then(r => r.data),
    enabled: isTutor && !!user?.user_id,
  });

  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: () => skillsAPI.getAll().then(r => r.data),
  });

  // Service Marketplace queries
  const { data: myGigs } = useQuery({
    queryKey: ['my-gigs'],
    queryFn: () => gigsAPI.getMy().then(r => r.data),
    enabled: canFreelance,
  });

  const { data: serviceCategories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: () => gigsAPI.getCategories().then(r => r.data),
  });

  const { data: serviceOrders } = useQuery({
    queryKey: ['service-orders'],
    queryFn: () => serviceOrdersAPI.getAll().then(r => r.data),
  });

  const { data: myServiceRequests } = useQuery({
    queryKey: ['my-service-requests'],
    queryFn: () => serviceRequestsAPI.getMy().then(r => r.data),
  });

  // Mutations
  const acceptBooking = useMutation({
    mutationFn: (id) => bookingsAPI.accept(id),
    onSuccess: () => { addToast('Booking confirmed!'); queryClient.invalidateQueries(['bookings', 'dashboard']); },
    onError: () => addToast('Failed to accept booking', 'error'),
  });

  const declineBooking = useMutation({
    mutationFn: (id) => bookingsAPI.decline(id),
    onSuccess: () => { addToast('Booking declined, student refunded.'); queryClient.invalidateQueries(['bookings', 'dashboard']); },
    onError: () => addToast('Failed to decline booking', 'error'),
  });

  const completeBooking = useMutation({
    mutationFn: (id) => bookingsAPI.complete(id),
    onSuccess: () => { addToast('Session completed!'); refreshUser(); queryClient.invalidateQueries(['bookings', 'dashboard']); },
    onError: () => addToast('Failed to complete session', 'error'),
  });

  const cancelBooking = useMutation({
    mutationFn: (id) => bookingsAPI.cancel(id),
    onSuccess: () => { addToast('Booking cancelled.'); refreshUser(); queryClient.invalidateQueries(['bookings', 'dashboard']); },
    onError: () => addToast('Failed to cancel booking', 'error'),
  });

  const submitReview = useMutation({
    mutationFn: (data) => reviewsAPI.create(data),
    onSuccess: () => { addToast('Review submitted!'); setReviewModal(null); queryClient.invalidateQueries(['bookings']); },
    onError: () => addToast('Failed to submit review', 'error'),
  });

  const createListing = useMutation({
    mutationFn: (data) => listingsAPI.create(data),
    onSuccess: () => { addToast('Listing created!'); setListingModal(null); queryClient.invalidateQueries(['my-listings']); },
    onError: () => addToast('Failed to create listing', 'error'),
  });

  const updateListing = useMutation({
    mutationFn: ({ id, data }) => listingsAPI.update(id, data),
    onSuccess: () => { addToast('Listing updated!'); setListingModal(null); queryClient.invalidateQueries(['my-listings']); },
    onError: () => addToast('Failed to update listing', 'error'),
  });

  const deleteListing = useMutation({
    mutationFn: (id) => listingsAPI.delete(id),
    onSuccess: () => { addToast('Listing archived.'); queryClient.invalidateQueries(['my-listings']); },
  });

  const addAvailability = useMutation({
    mutationFn: (data) => availabilityAPI.create(data),
    onSuccess: () => { addToast('Slot added!'); queryClient.invalidateQueries(['my-availability']); },
    onError: () => addToast('Failed to add slot', 'error'),
  });

  const removeAvailability = useMutation({
    mutationFn: (id) => availabilityAPI.delete(id),
    onSuccess: () => { addToast('Slot removed.'); queryClient.invalidateQueries(['my-availability']); },
  });

  const sendMessage = useMutation({
    mutationFn: ({ bookingId, text }) => bookingsAPI.sendMessage(bookingId, { message_text: text }),
    onSuccess: () => { addToast('Message sent!'); setMessageModal(null); setMessageText(''); queryClient.invalidateQueries(['bookings']); },
  });

  // Service gig mutations
  const [gigModal, setGigModal] = useState(null);
  const [gigForm, setGigForm] = useState({ category_id: '', title: '', description: '', min_price: '', max_price: '', delivery_time: '', delivery_format: 'remote' });

  const createGig = useMutation({
    mutationFn: (data) => gigsAPI.create(data),
    onSuccess: () => { addToast('Gig created!'); setGigModal(null); queryClient.invalidateQueries(['my-gigs']); },
    onError: (err) => addToast(err.response?.data?.error || 'Failed to create gig', 'error'),
  });

  const updateGig = useMutation({
    mutationFn: ({ id, data }) => gigsAPI.update(id, data),
    onSuccess: () => { addToast('Gig updated!'); setGigModal(null); queryClient.invalidateQueries(['my-gigs']); },
    onError: () => addToast('Failed to update gig', 'error'),
  });

  const deleteGig = useMutation({
    mutationFn: (id) => gigsAPI.delete(id),
    onSuccess: () => { addToast('Gig archived.'); queryClient.invalidateQueries(['my-gigs']); },
  });

  // Service order mutations
  const deliverOrder = useMutation({
    mutationFn: (id) => serviceOrdersAPI.deliver(id),
    onSuccess: () => { addToast('Marked as delivered!'); queryClient.invalidateQueries(['service-orders']); },
    onError: (err) => addToast(err.response?.data?.error || 'Failed', 'error'),
  });

  const confirmOrder = useMutation({
    mutationFn: (id) => serviceOrdersAPI.confirm(id),
    onSuccess: () => { addToast('Order completed! Payment released.'); refreshUser(); queryClient.invalidateQueries(['service-orders']); },
    onError: (err) => addToast(err.response?.data?.error || 'Failed', 'error'),
  });

  const cancelOrder = useMutation({
    mutationFn: (id) => serviceOrdersAPI.cancel(id),
    onSuccess: () => { addToast('Order cancelled, buyer refunded.'); refreshUser(); queryClient.invalidateQueries(['service-orders']); },
    onError: (err) => addToast(err.response?.data?.error || 'Failed', 'error'),
  });

  const downloadInvoice = async (bookingId) => {
    try {
      const response = await invoicesAPI.download(bookingId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${bookingId.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('Invoice downloaded!');
    } catch {
      addToast('Failed to download invoice', 'error');
    }
  };

  // Get current tab from URL
  const path = location.pathname.replace('/dashboard', '') || '/';
  const tabs = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/bookings', label: 'Bookings', icon: Calendar },
    ...(isTutor ? [
      { path: '/listings', label: 'My Listings', icon: BookOpen },
      { path: '/availability', label: 'Availability', icon: Clock },
      { path: '/earnings', label: 'Earnings', icon: DollarSign },
    ] : []),
    // Service Marketplace tabs
    ...(canFreelance ? [{ path: '/my-gigs', label: 'My Gigs', icon: Briefcase }] : []),
    { path: '/service-orders', label: 'Service Orders', icon: Package },
    { path: '/my-requests', label: 'My Requests', icon: Megaphone },
    { path: '/wallet', label: 'Wallet', icon: Wallet },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  if (isLoading) return <div className="max-w-7xl mx-auto p-8"><Loader /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="card p-3 lg:sticky lg:top-24">
            <div className="flex lg:flex-col gap-1 overflow-x-auto">
              {tabs.map(tab => (
                <Link
                  key={tab.path}
                  to={`/dashboard${tab.path === '/' ? '' : tab.path}`}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    path === tab.path ? 'bg-gradient-to-r from-red-brand to-orange-brand text-white' : 'text-text-muted hover:bg-orange-soft hover:text-text-main'
                  }`}
                >
                  <tab.icon className="h-4 w-4" /> {tab.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Overview Tab */}
          {path === '/' && (
            <div className="space-y-6">
              <h1 className="font-display font-bold text-2xl">Welcome back, {user?.full_name?.split(' ')[0]}!</h1>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <WalletCard balance={dashboard?.user?.wallet_balance} />
                {isTutor && <WalletCard balance={dashboard?.user?.earnings_balance} type="earnings" />}
                {dashboard?.tutor_stats && (
                  <StatCard title="Total Sessions" value={dashboard.tutor_stats.total_sessions} icon={Users} color="accent" />
                )}
              </div>

              {/* Upcoming Bookings */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-semibold text-lg">Upcoming Sessions</h2>
                  <Link to="/dashboard/bookings" className="text-red-brand text-sm font-medium hover:underline flex items-center gap-1">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                {dashboard?.upcoming_bookings?.length === 0 ? (
                  <EmptyState title="No upcoming sessions" message="Browse tutors to book your first session." icon={Calendar} />
                ) : (
                  <div className="space-y-3">
                    {dashboard.upcoming_bookings.slice(0, 5).map(b => (
                      <div key={b.booking_id} className="flex items-center justify-between p-3 bg-orange-soft rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{b.title}</p>
                          <p className="text-text-muted text-xs">with {b.other_party_name} | {format(new Date(b.scheduled_date), 'MMM dd, yyyy')}</p>
                        </div>
                        <BookingStatusBadge status={b.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {path === '/bookings' && (
            <div className="space-y-4">
              <h1 className="font-display font-bold text-2xl">My Bookings</h1>
              {bookings?.length === 0 ? (
                <EmptyState title="No bookings yet" message="Browse tutors to book your first session." icon={Calendar} />
              ) : (
                bookings?.map(b => (
                  <div key={b.booking_id} className="card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{b.title}</h3>
                          <BookingStatusBadge status={b.status} />
                        </div>
                        <p className="text-text-muted text-sm mt-1">
                          {b.student_id === user?.user_id ? `Tutor: ${b.tutor_name}` : `Student: ${b.student_name}`}
                          <span className="mx-1">|</span>{b.skill_name.split('(')[0].trim()}
                          <span className="mx-1">|</span>{format(new Date(b.scheduled_date), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-accent font-semibold text-sm mt-1">GHS {Number(b.session_fee).toFixed(2)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {/* Tutor actions */}
                        {b.tutor_id === user?.user_id && b.status === 'requested' && (
                          <>
                            <button onClick={() => acceptBooking.mutate(b.booking_id)} className="btn-primary text-xs py-1.5 px-3">Accept</button>
                            <button onClick={() => declineBooking.mutate(b.booking_id)} className="btn-danger text-xs py-1.5 px-3">Decline</button>
                          </>
                        )}
                        {b.status === 'confirmed' && (
                          <button onClick={() => completeBooking.mutate(b.booking_id)} className="bg-success text-white text-xs py-1.5 px-3 rounded-lg">Mark Complete</button>
                        )}
                        {b.status === 'completed' && b.student_id === user?.user_id && (
                          <button onClick={() => { setReviewModal(b); setReviewForm({ star_rating: 5, review_text: '' }); }} className="btn-accent text-xs py-1.5 px-3">
                            <Star className="h-3 w-3 inline mr-1" />Leave Review
                          </button>
                        )}
                        {['requested', 'confirmed'].includes(b.status) && (
                          <button onClick={() => cancelBooking.mutate(b.booking_id)} className="text-danger text-xs py-1.5 px-3 border border-danger rounded-lg hover:bg-red-50">Cancel</button>
                        )}
                        {['completed', 'rated'].includes(b.status) && (
                          <button onClick={() => downloadInvoice(b.booking_id)} className="text-primary text-xs py-1.5 px-3 border border-primary rounded-lg hover:bg-primary/5 flex items-center gap-1">
                            <Download className="h-3 w-3" />Invoice
                          </button>
                        )}
                        <button onClick={() => setMessageModal(b)} className="text-text-muted text-xs py-1.5 px-3 border border-border rounded-lg hover:bg-gray-50 flex items-center gap-1">
                          <Send className="h-3 w-3" />Message
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Listings Tab (Tutor) */}
          {path === '/listings' && isTutor && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="font-display font-bold text-2xl">My Listings</h1>
                <button onClick={() => { setListingModal('new'); setListingForm({ skill_id: '', title: '', description: '', hourly_rate: '', delivery_format: 'both' }); }} className="btn-primary text-sm flex items-center gap-1">
                  <PlusCircle className="h-4 w-4" /> New Listing
                </button>
              </div>
              {myListings?.length === 0 ? (
                <EmptyState title="No listings" message="Create your first listing to start earning." icon={BookOpen} />
              ) : (
                myListings?.map(l => (
                  <div key={l.listing_id} className="card flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{l.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${l.status === 'active' ? 'bg-green-100 text-green-700' : l.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{l.status}</span>
                      </div>
                      <p className="text-text-muted text-sm mt-1"><SkillBadge skill={l.skill_name} size="sm" /> | GHS {Number(l.hourly_rate).toFixed(0)}/hr</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setListingModal(l.listing_id); setListingForm({ skill_id: l.skill_id, title: l.title, description: l.description, hourly_rate: l.hourly_rate, delivery_format: l.delivery_format }); }} className="p-2 hover:bg-gray-100 rounded-lg"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => updateListing.mutate({ id: l.listing_id, data: { status: l.status === 'active' ? 'paused' : 'active' } })} className="p-2 hover:bg-gray-100 rounded-lg">
                        {l.status === 'active' ? <Pause className="h-4 w-4 text-warning" /> : <Play className="h-4 w-4 text-success" />}
                      </button>
                      <button onClick={() => deleteListing.mutate(l.listing_id)} className="p-2 hover:bg-gray-100 rounded-lg"><Trash2 className="h-4 w-4 text-danger" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Availability Tab (Tutor) */}
          {path === '/availability' && isTutor && (
            <div className="space-y-6">
              <h1 className="font-display font-bold text-2xl">Manage Availability</h1>

              <div className="card">
                <h3 className="font-display font-semibold mb-4">Add Time Slot</h3>
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium mb-1">Day</label>
                    <select value={availForm.day_of_week} onChange={e => setAvailForm(p => ({ ...p, day_of_week: e.target.value }))} className="input-field text-sm py-2">
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Start</label>
                    <input type="time" value={availForm.start_time} onChange={e => setAvailForm(p => ({ ...p, start_time: e.target.value }))} className="input-field text-sm py-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">End</label>
                    <input type="time" value={availForm.end_time} onChange={e => setAvailForm(p => ({ ...p, end_time: e.target.value }))} className="input-field text-sm py-2" />
                  </div>
                  <button onClick={() => addAvailability.mutate(availForm)} className="btn-primary text-sm py-2">Add Slot</button>
                </div>
              </div>

              <div className="card">
                <h3 className="font-display font-semibold mb-4">Weekly Schedule</h3>
                <div className="space-y-4">
                  {DAYS.map(day => {
                    const daySlots = myAvailability?.filter(s => s.day_of_week === day) || [];
                    return (
                      <div key={day} className="flex items-start gap-4">
                        <span className="w-24 text-sm font-medium pt-1">{day}</span>
                        <div className="flex flex-wrap gap-2 flex-1">
                          {daySlots.length === 0 ? (
                            <span className="text-text-muted text-sm italic">No slots</span>
                          ) : (
                            daySlots.map(slot => (
                              <div key={slot.availability_id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${slot.is_booked ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                                {slot.start_time}-{slot.end_time}
                                {!slot.is_booked && (
                                  <button onClick={() => removeAvailability.mutate(slot.availability_id)} className="hover:text-red-600">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                                {slot.is_booked && <span className="text-xs">(booked)</span>}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Earnings Tab (Tutor) */}
          {path === '/earnings' && isTutor && (
            <div className="space-y-6">
              <h1 className="font-display font-bold text-2xl">Earnings</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <WalletCard balance={user?.earnings_balance} type="earnings" />
                {dashboard?.tutor_stats && (
                  <StatCard title="Total Sessions" value={dashboard.tutor_stats.total_sessions} icon={TrendingUp} color="success" subtitle={`Avg Rating: ${dashboard.tutor_stats.avg_rating}`} />
                )}
              </div>
              <div className="card">
                <h3 className="font-display font-semibold mb-4">Withdrawal</h3>
                <p className="text-text-muted text-sm mb-4">To withdraw your earnings, visit the <Link to="/dashboard/wallet" className="text-primary font-medium hover:underline">Wallet page</Link>.</p>
              </div>
            </div>
          )}

          {/* My Gigs Tab (Freelancers) */}
          {path === '/my-gigs' && canFreelance && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="font-display font-bold text-2xl">My Service Gigs</h1>
                <button onClick={() => { setGigModal('new'); setGigForm({ category_id: '', title: '', description: '', min_price: '', max_price: '', delivery_time: '', delivery_format: 'remote' }); }} className="btn-primary text-sm flex items-center gap-1">
                  <PlusCircle className="h-4 w-4" /> New Gig
                </button>
              </div>
              {myGigs?.length === 0 ? (
                <EmptyState title="No gigs yet" message="Create your first service gig to start earning from projects." icon={Briefcase} />
              ) : (
                myGigs?.map(g => (
                  <div key={g.gig_id} className="card flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{g.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${g.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{g.status}</span>
                      </div>
                      <p className="text-text-muted text-sm mt-1">{g.category_name} | GHS {Number(g.min_price).toFixed(0)} - {Number(g.max_price).toFixed(0)} | {g.completed_orders || 0} orders</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setGigModal(g.gig_id); setGigForm({ category_id: g.category_id, title: g.title, description: g.description, min_price: g.min_price, max_price: g.max_price, delivery_time: g.delivery_time || '', delivery_format: g.delivery_format }); }} className="p-2 hover:bg-gray-100 rounded-lg"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => updateGig.mutate({ id: g.gig_id, data: { status: g.status === 'active' ? 'paused' : 'active' } })} className="p-2 hover:bg-gray-100 rounded-lg">
                        {g.status === 'active' ? <Pause className="h-4 w-4 text-warning" /> : <Play className="h-4 w-4 text-success" />}
                      </button>
                      <button onClick={() => deleteGig.mutate(g.gig_id)} className="p-2 hover:bg-gray-100 rounded-lg"><Trash2 className="h-4 w-4 text-danger" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Service Orders Tab */}
          {path === '/service-orders' && (
            <div className="space-y-4">
              <h1 className="font-display font-bold text-2xl">Service Orders</h1>
              {serviceOrders?.length === 0 ? (
                <EmptyState title="No service orders" message="Browse the marketplace to order services or post gigs to receive orders." icon={Package} />
              ) : (
                serviceOrders?.map(o => (
                  <div key={o.order_id} className="card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{o.gig_title || o.request_title || 'Service Order'}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            o.status === 'completed' ? 'bg-green-100 text-green-700' :
                            o.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            o.status === 'delivered' ? 'bg-purple-100 text-purple-700' :
                            o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>{o.status.replace('_', ' ')}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            o.escrow_status === 'held' ? 'bg-yellow-100 text-yellow-700' :
                            o.escrow_status === 'released' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>Escrow: {o.escrow_status}</span>
                        </div>
                        <p className="text-text-muted text-sm mt-1">
                          {o.buyer_id === user?.user_id ? `Freelancer: ${o.freelancer_name}` : `Buyer: ${o.buyer_name}`}
                          <span className="mx-1">|</span>
                          {o.gig_category || o.request_category || 'Service'}
                        </p>
                        <p className="text-accent font-semibold text-sm mt-1">GHS {Number(o.agreed_price).toFixed(2)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {/* Freelancer: mark as delivered */}
                        {o.freelancer_id === user?.user_id && o.status === 'in_progress' && (
                          <button onClick={() => deliverOrder.mutate(o.order_id)} className="bg-purple-600 text-white text-xs py-1.5 px-3 rounded-lg hover:bg-purple-700">Mark Delivered</button>
                        )}
                        {/* Buyer: confirm completion */}
                        {o.buyer_id === user?.user_id && o.status === 'delivered' && (
                          <button onClick={() => confirmOrder.mutate(o.order_id)} className="bg-success text-white text-xs py-1.5 px-3 rounded-lg">Confirm & Pay</button>
                        )}
                        {/* Cancel */}
                        {['pending', 'in_progress'].includes(o.status) && (
                          <button onClick={() => cancelOrder.mutate(o.order_id)} className="text-danger text-xs py-1.5 px-3 border border-danger rounded-lg hover:bg-red-50">Cancel</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* My Requests Tab */}
          {path === '/my-requests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="font-display font-bold text-2xl">My Service Requests</h1>
                <Link to="/post-request" className="btn-primary text-sm flex items-center gap-1">
                  <PlusCircle className="h-4 w-4" /> Post Request
                </Link>
              </div>
              {myServiceRequests?.length === 0 ? (
                <EmptyState title="No requests yet" message="Post a service request to find freelancers for your projects." icon={Megaphone} />
              ) : (
                myServiceRequests?.map(r => (
                  <Link key={r.request_id} to={`/service-request/${r.request_id}`} className="card block hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{r.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            r.status === 'open' ? 'bg-green-100 text-green-700' :
                            r.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            r.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                            'bg-red-100 text-red-700'
                          }`}>{r.status}</span>
                        </div>
                        <p className="text-text-muted text-sm mt-1">
                          {r.category_name || 'Uncategorized'}
                          {r.budget_max && <span> | Budget: GHS {Number(r.budget_min || 0).toFixed(0)} - {Number(r.budget_max).toFixed(0)}</span>}
                          <span> | {r.application_count || 0} applications</span>
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-text-muted" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* Profile Tab */}
          {path === '/profile' && <ProfileForm />}

          {/* Wallet Tab (handled by separate route) */}
          {path === '/wallet' && <Outlet />}
        </div>
      </div>

      {/* Review Modal */}
      <Modal isOpen={!!reviewModal} onClose={() => setReviewModal(null)} title="Leave a Review">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">How was your session?</p>
            <StarRating rating={reviewForm.star_rating} onRate={v => setReviewForm(p => ({ ...p, star_rating: v }))} size="lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Review (optional)</label>
            <textarea value={reviewForm.review_text} onChange={e => setReviewForm(p => ({ ...p, review_text: e.target.value }))} className="input-field" rows={3} placeholder="Share your experience..." />
          </div>
          <button onClick={() => submitReview.mutate({ booking_id: reviewModal?.booking_id, ...reviewForm })} disabled={submitReview.isPending} className="btn-primary w-full">
            {submitReview.isPending ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </Modal>

      {/* Listing Modal */}
      <Modal isOpen={!!listingModal} onClose={() => setListingModal(null)} title={listingModal === 'new' ? 'Create Listing' : 'Edit Listing'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Skill</label>
            <select value={listingForm.skill_id} onChange={e => setListingForm(p => ({ ...p, skill_id: e.target.value }))} className="input-field">
              <option value="">Select skill</option>
              {skills?.map(s => <option key={s.skill_id} value={s.skill_id}>{s.skill_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" value={listingForm.title} onChange={e => setListingForm(p => ({ ...p, title: e.target.value }))} className="input-field" placeholder="e.g. Python Tutoring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={listingForm.description} onChange={e => setListingForm(p => ({ ...p, description: e.target.value }))} className="input-field" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Rate (GHS/hr)</label>
              <input type="number" value={listingForm.hourly_rate} onChange={e => setListingForm(p => ({ ...p, hourly_rate: e.target.value }))} className="input-field" min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Format</label>
              <select value={listingForm.delivery_format} onChange={e => setListingForm(p => ({ ...p, delivery_format: e.target.value }))} className="input-field">
                <option value="online">Online</option>
                <option value="in_person">In-Person</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => {
              if (listingModal === 'new') {
                createListing.mutate({ ...listingForm, hourly_rate: parseFloat(listingForm.hourly_rate) });
              } else {
                updateListing.mutate({ id: listingModal, data: { ...listingForm, hourly_rate: parseFloat(listingForm.hourly_rate) } });
              }
            }}
            className="btn-primary w-full"
          >
            {listingModal === 'new' ? 'Create Listing' : 'Update Listing'}
          </button>
        </div>
      </Modal>

      {/* Message Modal */}
      <Modal isOpen={!!messageModal} onClose={() => setMessageModal(null)} title="Send Message">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">Regarding: {messageModal?.title}</p>
          <textarea value={messageText} onChange={e => setMessageText(e.target.value)} className="input-field" rows={3} placeholder="Type your message..." />
          <button onClick={() => sendMessage.mutate({ bookingId: messageModal?.booking_id, text: messageText })} disabled={!messageText.trim()} className="btn-primary w-full">Send</button>
        </div>
      </Modal>

      {/* Gig Modal */}
      <Modal isOpen={!!gigModal} onClose={() => setGigModal(null)} title={gigModal === 'new' ? 'Create Service Gig' : 'Edit Gig'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select value={gigForm.category_id} onChange={e => setGigForm(p => ({ ...p, category_id: e.target.value }))} className="input-field">
              <option value="">Select category</option>
              {serviceCategories?.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" value={gigForm.title} onChange={e => setGigForm(p => ({ ...p, title: e.target.value }))} className="input-field" placeholder="e.g. Build a responsive website" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={gigForm.description} onChange={e => setGigForm(p => ({ ...p, description: e.target.value }))} className="input-field" rows={3} placeholder="Describe what you offer..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Min Price (GHS)</label>
              <input type="number" value={gigForm.min_price} onChange={e => setGigForm(p => ({ ...p, min_price: e.target.value }))} className="input-field" min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Price (GHS)</label>
              <input type="number" value={gigForm.max_price} onChange={e => setGigForm(p => ({ ...p, max_price: e.target.value }))} className="input-field" min="1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Delivery Time</label>
              <input type="text" value={gigForm.delivery_time} onChange={e => setGigForm(p => ({ ...p, delivery_time: e.target.value }))} className="input-field" placeholder="e.g. 3-5 days" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Format</label>
              <select value={gigForm.delivery_format} onChange={e => setGigForm(p => ({ ...p, delivery_format: e.target.value }))} className="input-field">
                <option value="remote">Remote</option>
                <option value="in_person">In-Person</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => {
              const data = { ...gigForm, min_price: parseFloat(gigForm.min_price), max_price: parseFloat(gigForm.max_price) };
              if (gigModal === 'new') createGig.mutate(data);
              else updateGig.mutate({ id: gigModal, data });
            }}
            className="btn-primary w-full"
          >
            {gigModal === 'new' ? 'Create Gig' : 'Update Gig'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ProfileForm() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    bio: user?.bio || '',
    institution: user?.institution || '',
    programme: user?.programme || '',
    year_of_study: user?.year_of_study || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersAPI.updateProfile(form);
      await refreshUser();
      addToast('Profile updated!');
    } catch {
      addToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-2xl">Edit Profile</h1>
      <form onSubmit={handleSave} className="card space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Bio</label>
          <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} className="input-field" rows={3} placeholder="Tell people about yourself..." />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Institution</label>
          <input type="text" value={form.institution} onChange={e => setForm(p => ({ ...p, institution: e.target.value }))} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Programme</label>
            <input type="text" value={form.programme} onChange={e => setForm(p => ({ ...p, programme: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Year of Study</label>
            <select value={form.year_of_study} onChange={e => setForm(p => ({ ...p, year_of_study: e.target.value }))} className="input-field">
              <option value="">Select</option>
              {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  );
}
