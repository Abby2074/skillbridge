import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsAPI, availabilityAPI, bookingsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Loader from '../components/Loader';
import StarRating from '../components/StarRating';
import SkillBadge from '../components/SkillBadge';
import { Calendar, Clock, MapPin, Monitor, User, AlertTriangle, Wallet } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function BookingForm() {
  const { listingId } = useParams();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [deliveryFormat, setDeliveryFormat] = useState('online');
  const [objectives, setObjectives] = useState('');

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => listingsAPI.getById(listingId).then(r => r.data),
  });

  const { data: availability } = useQuery({
    queryKey: ['availability', listing?.tutor_id],
    queryFn: () => availabilityAPI.getByTutor(listing.tutor_id).then(r => r.data),
    enabled: !!listing?.tutor_id,
  });

  const bookMutation = useMutation({
    mutationFn: (data) => bookingsAPI.create(data),
    onSuccess: () => {
      addToast('Session booked successfully!');
      refreshUser();
      queryClient.invalidateQueries(['bookings']);
      navigate('/dashboard/bookings');
    },
    onError: (err) => {
      addToast(err.response?.data?.error || 'Booking failed', 'error');
    },
  });

  if (isLoading) return <div className="max-w-7xl mx-auto p-8"><Loader /></div>;
  if (!listing) return <div className="max-w-7xl mx-auto p-8">Listing not found</div>;

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="font-display font-bold text-2xl mb-4">Login Required</h2>
        <p className="text-text-muted mb-6">You need to be logged in to book a session.</p>
        <Link to="/login" className="btn-primary">Login</Link>
      </div>
    );
  }

  const sessionFee = listing.hourly_rate;
  const commission = Math.round(sessionFee * 0.10 * 100) / 100;
  const totalCost = sessionFee;
  const walletBalance = user?.wallet_balance || 0;
  const hasEnoughBalance = walletBalance >= totalCost;

  const availableSlots = availability?.filter(s => !s.is_booked) || [];
  const slotsByDay = DAYS.reduce((acc, day) => {
    acc[day] = availableSlots.filter(s => s.day_of_week === day);
    return acc;
  }, {});

  const handleBook = () => {
    if (!selectedSlot || !selectedDate) {
      addToast('Please select a time slot and date', 'warning');
      return;
    }
    bookMutation.mutate({
      listing_id: listingId,
      availability_id: selectedSlot.availability_id,
      scheduled_date: selectedDate,
      delivery_format: deliveryFormat,
      learning_objectives: objectives,
    });
  };

  // Calculate next available date for the selected day
  const getNextDate = (dayName) => {
    const dayIndex = DAYS.indexOf(dayName);
    const today = new Date();
    const todayDay = (today.getDay() + 6) % 7; // Monday = 0
    let diff = dayIndex - todayDay;
    if (diff <= 0) diff += 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + diff);
    return nextDate.toISOString().split('T')[0];
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display font-bold text-2xl text-text-main mb-6">Book a Session</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left - Details & Slot Picker */}
        <div className="flex-1 space-y-6">
          {/* Session Info */}
          <div className="card">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center text-white font-display font-bold text-2xl">
                {listing.tutor_name?.charAt(0)}
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg">{listing.title}</h2>
                <p className="text-text-muted text-sm flex items-center gap-1 mt-0.5">
                  <User className="h-3.5 w-3.5" /> {listing.tutor_name}
                  <span className="mx-1">|</span>
                  <MapPin className="h-3.5 w-3.5" /> {listing.institution}
                </p>
                <div className="mt-2"><SkillBadge skill={listing.skill_name} /></div>
                <div className="flex items-center gap-2 mt-2">
                  <StarRating rating={listing.avg_rating} size="sm" />
                  <span className="text-sm font-medium">{Number(listing.avg_rating).toFixed(1)}</span>
                  <span className="text-text-muted text-sm">({listing.review_count} reviews)</span>
                </div>
              </div>
            </div>
            <p className="text-text-muted text-sm mt-4">{listing.description}</p>
          </div>

          {/* Time Slot Picker */}
          <div className="card">
            <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Select a Time Slot
            </h3>
            <div className="space-y-3">
              {DAYS.map(day => slotsByDay[day].length > 0 && (
                <div key={day}>
                  <p className="text-sm font-medium text-text-main mb-2">{day}</p>
                  <div className="flex flex-wrap gap-2">
                    {slotsByDay[day].map(slot => (
                      <button
                        key={slot.availability_id}
                        onClick={() => {
                          setSelectedSlot(slot);
                          setSelectedDate(getNextDate(day));
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedSlot?.availability_id === slot.availability_id
                            ? 'bg-primary text-white'
                            : 'bg-gray-50 text-text-main hover:bg-primary/10'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {slot.start_time} - {slot.end_time}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {availableSlots.length === 0 && (
                <p className="text-text-muted text-sm italic">No available slots at the moment.</p>
              )}
            </div>
          </div>

          {/* Date Picker */}
          {selectedSlot && (
            <div className="card">
              <h3 className="font-display font-semibold mb-3">Session Date</h3>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="input-field"
              />
            </div>
          )}

          {/* Delivery Format */}
          <div className="card">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" /> Delivery Format
            </h3>
            <div className="flex gap-3">
              {['online', 'in_person'].map(f => (
                <button
                  key={f}
                  onClick={() => setDeliveryFormat(f)}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium border-2 transition-all ${
                    deliveryFormat === f ? 'border-primary bg-primary/5 text-primary' : 'border-border text-text-muted hover:border-primary/30'
                  }`}
                >
                  {f === 'online' ? 'Online (Video Call)' : 'In-Person'}
                </button>
              ))}
            </div>
          </div>

          {/* Learning Objectives */}
          <div className="card">
            <h3 className="font-display font-semibold mb-3">Learning Objectives (Optional)</h3>
            <textarea
              value={objectives}
              onChange={e => setObjectives(e.target.value)}
              className="input-field"
              rows={3}
              placeholder="What would you like to learn or work on during this session?"
            />
          </div>
        </div>

        {/* Right - Cost Summary */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="card sticky top-24 space-y-4">
            <h3 className="font-display font-semibold text-lg">Session Summary</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Session Fee (1 hour)</span>
                <span className="font-medium">GHS {sessionFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Platform Fee (10%)</span>
                <span>GHS {commission.toFixed(2)}</span>
              </div>
              <p className="text-xs text-text-muted">* Platform fee is included in the session fee</p>
            </div>

            <div className="border-t border-border pt-3 flex justify-between">
              <span className="font-display font-semibold">Total</span>
              <span className="font-display font-bold text-xl text-accent">GHS {totalCost.toFixed(2)}</span>
            </div>

            {/* Wallet Balance */}
            <div className={`flex items-center gap-3 p-3 rounded-lg ${hasEnoughBalance ? 'bg-green-50' : 'bg-red-50'}`}>
              <Wallet className={`h-5 w-5 ${hasEnoughBalance ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <p className="text-sm font-medium">Wallet: GHS {walletBalance.toFixed(2)}</p>
                {!hasEnoughBalance && (
                  <Link to="/dashboard/wallet" className="text-xs text-danger hover:underline">Insufficient balance - Top Up</Link>
                )}
              </div>
            </div>

            {!hasEnoughBalance && (
              <div className="flex items-start gap-2 text-sm text-danger bg-red-50 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>You need GHS {(totalCost - walletBalance).toFixed(2)} more to book this session.</p>
              </div>
            )}

            <button
              onClick={handleBook}
              disabled={!hasEnoughBalance || !selectedSlot || !selectedDate || bookMutation.isPending}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
            </button>

            {selectedSlot && (
              <p className="text-xs text-text-muted text-center">
                {selectedSlot.day_of_week} {selectedSlot.start_time}-{selectedSlot.end_time} | {selectedDate}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
