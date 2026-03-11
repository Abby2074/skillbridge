import { Link } from 'react-router-dom';
import StarRating from './StarRating';
import SkillBadge from './SkillBadge';
import { MapPin, Clock, Users } from 'lucide-react';

export default function TutorCard({ tutor }) {
  return (
    <div className="card hover:shadow-md hover:border-orange-brand/20 transition-all duration-200">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-red-brand to-orange-brand rounded-full flex items-center justify-center text-white font-display font-bold text-xl flex-shrink-0">
          {tutor.full_name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <Link to={`/tutor/${tutor.user_id}`} className="font-display font-semibold text-lg text-text-main hover:text-red-brand transition-colors">
            {tutor.full_name}
          </Link>
          <div className="flex items-center gap-1 text-text-muted text-sm mt-0.5">
            <MapPin className="h-3.5 w-3.5" />
            {tutor.institution}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <SkillBadge skill={tutor.skill_name} />
      </div>

      <p className="text-text-muted text-sm mt-3 line-clamp-2">{tutor.description || tutor.bio}</p>

      <div className="flex items-center gap-4 mt-4 text-sm text-text-muted">
        <div className="flex items-center gap-1">
          <StarRating rating={tutor.avg_rating} size="sm" />
          <span className="font-medium text-text-main">{Number(tutor.avg_rating).toFixed(1)}</span>
          <span>({tutor.review_count})</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {tutor.session_count} sessions
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div>
          <span className="font-display font-bold text-xl text-orange-brand">GHS {Number(tutor.hourly_rate).toFixed(0)}</span>
          <span className="text-text-muted text-sm">/hr</span>
        </div>
        <Link to={`/book/${tutor.listing_id}`} className="bg-gradient-to-r from-red-brand to-orange-brand text-white px-5 py-2 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity">
          Book Session
        </Link>
      </div>
    </div>
  );
}
