import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { gigsAPI, serviceOrdersAPI, serviceMessagesAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import StarRating from '../components/StarRating';
import Loader from '../components/Loader';
import { Star, Clock, MapPin, MessageSquare, ShoppingCart, User, Briefcase, ArrowLeft } from 'lucide-react';

export default function GigDetail() {
  const { gigId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [orderModal, setOrderModal] = useState(false);
  const [messageModal, setMessageModal] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState('');
  const [orderDescription, setOrderDescription] = useState('');
  const [messageText, setMessageText] = useState('');

  const { data: gig, isLoading } = useQuery({
    queryKey: ['gig', gigId],
    queryFn: () => gigsAPI.getById(gigId).then(r => r.data),
  });

  const createOrder = useMutation({
    mutationFn: (data) => serviceOrdersAPI.create(data),
    onSuccess: (res) => {
      addToast('Order created! Funds held in escrow.');
      setOrderModal(false);
      navigate(`/dashboard/service-orders`);
    },
    onError: (err) => addToast(err.response?.data?.error || 'Failed to create order', 'error'),
  });

  const sendMessage = useMutation({
    mutationFn: (data) => serviceMessagesAPI.send(data),
    onSuccess: () => {
      addToast('Message sent!');
      setMessageModal(false);
      setMessageText('');
    },
    onError: () => addToast('Failed to send message', 'error'),
  });

  if (isLoading) return <div className="max-w-4xl mx-auto p-8"><Loader /></div>;
  if (!gig) return <div className="max-w-4xl mx-auto p-8"><p>Gig not found.</p></div>;

  const isOwner = user?.user_id === gig.freelancer_id;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/marketplace" className="text-primary text-sm font-medium hover:underline flex items-center gap-1 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">{gig.category_name}</span>
            <h1 className="font-display font-bold text-2xl text-text-main mt-3">{gig.title}</h1>
            <div className="flex items-center gap-4 mt-3 text-sm text-text-muted">
              {gig.avg_rating && (
                <span className="flex items-center gap-1 text-accent">
                  <Star className="h-4 w-4 fill-accent" /> {gig.avg_rating} ({gig.review_count} reviews)
                </span>
              )}
              {gig.completed_orders > 0 && (
                <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" /> {gig.completed_orders} orders completed</span>
              )}
            </div>
            <hr className="my-4 border-border" />
            <div className="prose prose-sm max-w-none">
              <h3 className="font-display font-semibold text-lg mb-2">About This Service</h3>
              <p className="text-text-main whitespace-pre-wrap">{gig.description}</p>
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-text-muted">
              {gig.delivery_time && (
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Delivery: {gig.delivery_time}</span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {gig.delivery_format === 'remote' ? 'Remote' : gig.delivery_format === 'in_person' ? 'In-Person' : 'Remote / In-Person'}
              </span>
            </div>
          </div>

          {/* Reviews */}
          {gig.reviews?.length > 0 && (
            <div className="card">
              <h3 className="font-display font-semibold text-lg mb-4">Reviews</h3>
              <div className="space-y-4">
                {gig.reviews.map(review => (
                  <div key={review.review_id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-text-muted">
                          {review.reviewer_name?.charAt(0)}
                        </div>
                        <span className="font-medium text-sm">{review.reviewer_name}</span>
                      </div>
                      <StarRating rating={review.star_rating} size="sm" readonly />
                    </div>
                    {review.review_text && <p className="text-text-muted text-sm">{review.review_text}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Price Card */}
          <div className="card sticky top-24">
            <div className="text-center mb-4">
              <p className="text-text-muted text-sm">Starting from</p>
              <p className="font-display font-bold text-3xl text-accent">GHS {Number(gig.min_price).toFixed(0)}</p>
              <p className="text-text-muted text-sm">up to GHS {Number(gig.max_price).toFixed(0)}</p>
            </div>

            {!isOwner && isAuthenticated && (
              <div className="space-y-2">
                <button onClick={() => { setOrderModal(true); setAgreedPrice(gig.min_price); }} className="btn-primary w-full flex items-center justify-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Order Now
                </button>
                <button onClick={() => setMessageModal(true)} className="btn-outline w-full flex items-center justify-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Contact Freelancer
                </button>
              </div>
            )}
            {!isAuthenticated && (
              <Link to="/login" className="btn-primary w-full text-center block">Login to Order</Link>
            )}
            {isOwner && (
              <p className="text-center text-text-muted text-sm">This is your gig.</p>
            )}
          </div>

          {/* Freelancer Card */}
          <div className="card">
            <h3 className="font-display font-semibold mb-3">About the Freelancer</h3>
            <Link to={`/tutor/${gig.freelancer_user_id}`} className="flex items-center gap-3 mb-3 hover:text-primary">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                {gig.freelancer_name?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{gig.freelancer_name}</p>
                <p className="text-text-muted text-sm">{gig.institution}</p>
              </div>
            </Link>
            {gig.freelancer_bio && <p className="text-text-muted text-sm">{gig.freelancer_bio}</p>}
          </div>
        </div>
      </div>

      {/* Order Modal */}
      <Modal isOpen={orderModal} onClose={() => setOrderModal(false)} title="Place Order">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Ordering: <span className="font-medium text-text-main">{gig.title}</span>
          </p>
          <div>
            <label className="block text-sm font-medium mb-1">Agreed Price (GHS)</label>
            <input
              type="number"
              value={agreedPrice}
              onChange={e => setAgreedPrice(e.target.value)}
              className="input-field"
              min={gig.min_price}
              max={gig.max_price}
              placeholder={`${gig.min_price} - ${gig.max_price}`}
            />
            <p className="text-xs text-text-muted mt-1">Range: GHS {Number(gig.min_price).toFixed(0)} - {Number(gig.max_price).toFixed(0)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Project Details (optional)</label>
            <textarea
              value={orderDescription}
              onChange={e => setOrderDescription(e.target.value)}
              className="input-field"
              rows={3}
              placeholder="Describe what you need..."
            />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-text-muted">Service fee:</span><span>GHS {Number(agreedPrice || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Platform fee (10%):</span><span>GHS {(Number(agreedPrice || 0) * 0.1).toFixed(2)}</span></div>
            <hr className="border-border" />
            <div className="flex justify-between font-semibold"><span>Total (from wallet):</span><span className="text-accent">GHS {Number(agreedPrice || 0).toFixed(2)}</span></div>
          </div>
          <p className="text-xs text-text-muted">Funds will be held in escrow until both parties confirm completion.</p>
          <button
            onClick={() => createOrder.mutate({ gig_id: gigId, agreed_price: parseFloat(agreedPrice), description: orderDescription })}
            disabled={!agreedPrice || createOrder.isPending}
            className="btn-primary w-full"
          >
            {createOrder.isPending ? 'Processing...' : 'Confirm & Pay'}
          </button>
        </div>
      </Modal>

      {/* Message Modal */}
      <Modal isOpen={messageModal} onClose={() => setMessageModal(false)} title="Contact Freelancer">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">Send a message to {gig.freelancer_name} about this gig.</p>
          <textarea
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            className="input-field"
            rows={4}
            placeholder="Hi, I'm interested in your service. I'd like to discuss..."
          />
          <button
            onClick={() => sendMessage.mutate({ receiver_id: gig.freelancer_id, message_text: messageText, gig_id: gigId })}
            disabled={!messageText.trim() || sendMessage.isPending}
            className="btn-primary w-full"
          >
            {sendMessage.isPending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
