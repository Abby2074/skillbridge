import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersAPI, availabilityAPI, reviewsAPI } from '../api';
import StarRating from '../components/StarRating';
import SkillBadge from '../components/SkillBadge';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { MapPin, Clock, Users, Calendar, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TutorProfile() {
  const { userId } = useParams();
  const [activeTab, setActiveTab] = useState('about');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['tutor-profile', userId],
    queryFn: () => usersAPI.getProfile(userId).then(r => r.data),
  });

  const { data: availability } = useQuery({
    queryKey: ['tutor-availability', userId],
    queryFn: () => availabilityAPI.getByTutor(userId).then(r => r.data),
  });

  const { data: reviewData } = useQuery({
    queryKey: ['tutor-reviews', userId],
    queryFn: () => reviewsAPI.getByTutor(userId).then(r => r.data),
  });

  if (isLoading) return <div className="max-w-7xl mx-auto p-8"><Loader /></div>;
  if (!profile) return <div className="max-w-7xl mx-auto p-8"><EmptyState title="Tutor not found" /></div>;

  const slotsByDay = DAYS.reduce((acc, day) => {
    acc[day] = availability?.filter(s => s.day_of_week === day) || [];
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1">
          {/* Profile Header */}
          <div className="card">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center text-white font-display font-bold text-4xl flex-shrink-0">
                {profile.full_name?.charAt(0)}
              </div>
              <div className="flex-1">
                <h1 className="font-display font-bold text-2xl text-text-main">{profile.full_name}</h1>
                <div className="flex items-center gap-2 text-text-muted mt-1">
                  <MapPin className="h-4 w-4" /> {profile.institution}
                  {profile.programme && <span>| {profile.programme}</span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {profile.listings?.map(l => <SkillBadge key={l.listing_id} skill={l.skill_name} />)}
                </div>
                <div className="flex items-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <StarRating rating={profile.avg_rating} size="sm" />
                    <span className="font-semibold">{profile.avg_rating}</span>
                    <span className="text-text-muted">({profile.review_count} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1 text-text-muted">
                    <Users className="h-4 w-4" /> {profile.session_count} sessions
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 bg-gray-100 rounded-lg p-1">
            {['about', 'availability', 'reviews'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors capitalize ${
                  activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-main'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'about' && (
              <div className="card space-y-6">
                <div>
                  <h3 className="font-display font-semibold text-lg mb-2">About</h3>
                  <p className="text-text-muted leading-relaxed">{profile.bio || 'No bio provided.'}</p>
                </div>
                {profile.listings?.length > 0 && (
                  <div>
                    <h3 className="font-display font-semibold text-lg mb-3">Services Offered</h3>
                    <div className="space-y-3">
                      {profile.listings.map(listing => (
                        <div key={listing.listing_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium">{listing.title}</h4>
                            <p className="text-text-muted text-sm mt-0.5">{listing.delivery_format === 'both' ? 'Online & In-Person' : listing.delivery_format === 'online' ? 'Online' : 'In-Person'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-display font-bold text-accent">GHS {Number(listing.hourly_rate).toFixed(0)}/hr</p>
                            <Link to={`/book/${listing.listing_id}`} className="text-primary text-sm font-medium hover:underline">Book Now</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'availability' && (
              <div className="card">
                <h3 className="font-display font-semibold text-lg mb-4">Weekly Availability</h3>
                <div className="space-y-3">
                  {DAYS.map(day => (
                    <div key={day} className="flex items-start gap-4">
                      <span className="w-24 text-sm font-medium text-text-main pt-1">{day}</span>
                      <div className="flex flex-wrap gap-2 flex-1">
                        {slotsByDay[day].length === 0 ? (
                          <span className="text-text-muted text-sm italic">Not available</span>
                        ) : (
                          slotsByDay[day].map(slot => (
                            <span
                              key={slot.availability_id}
                              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                                slot.is_booked ? 'bg-red-50 text-red-600 line-through' : 'bg-green-50 text-green-700'
                              }`}
                            >
                              {slot.start_time} - {slot.end_time}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* Rating Breakdown */}
                {reviewData?.stats && (
                  <div className="card">
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="font-display font-bold text-4xl text-text-main">{Number(reviewData.stats.average).toFixed(1)}</p>
                        <StarRating rating={reviewData.stats.average} size="sm" />
                        <p className="text-text-muted text-sm mt-1">{reviewData.stats.total} reviews</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5, 4, 3, 2, 1].map(star => {
                          const count = reviewData.stats[['', 'one_star', 'two_star', 'three_star', 'four_star', 'five_star'][star]] || 0;
                          const pct = reviewData.stats.total > 0 ? (count / reviewData.stats.total) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-2 text-sm">
                              <span className="w-3 text-text-muted">{star}</span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-8 text-text-muted text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Reviews List */}
                {reviewData?.reviews?.length === 0 ? (
                  <EmptyState title="No reviews yet" message="This tutor hasn't received any reviews." icon={MessageSquare} />
                ) : (
                  reviewData?.reviews?.map(review => (
                    <div key={review.review_id} className="card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary-light/20 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                            {review.student_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{review.student_name}</p>
                            <p className="text-text-muted text-xs">{format(new Date(review.created_at), 'MMM dd, yyyy')}</p>
                          </div>
                        </div>
                        <StarRating rating={review.star_rating} size="sm" />
                      </div>
                      {review.review_text && (
                        <p className="text-text-muted text-sm mt-3">{review.review_text}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Book Session */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="card sticky top-24">
            <h3 className="font-display font-semibold text-lg mb-4">Book a Session</h3>
            {profile.listings?.length > 0 && (
              <div className="space-y-3">
                {profile.listings.map(listing => (
                  <div key={listing.listing_id}>
                    <p className="text-sm text-text-muted">{listing.skill_name.split('(')[0].trim()}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="font-display font-bold text-2xl text-accent">GHS {Number(listing.hourly_rate).toFixed(0)}<span className="text-sm font-normal text-text-muted">/hr</span></p>
                    </div>
                    <Link to={`/book/${listing.listing_id}`} className="btn-primary w-full mt-3 text-center block">
                      Book Now
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
