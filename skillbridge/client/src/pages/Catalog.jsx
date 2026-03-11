import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersAPI, skillsAPI } from '../api';
import TutorCard from '../components/TutorCard';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { Search, SlidersHorizontal, X, Lightbulb } from 'lucide-react';

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedSkill, setSelectedSkill] = useState(searchParams.get('skill') || '');
  const [maxRate, setMaxRate] = useState(searchParams.get('max_rate') || '');
  const [minRating, setMinRating] = useState(searchParams.get('min_rating') || '');
  const [deliveryFormat, setDeliveryFormat] = useState(searchParams.get('format') || 'all');
  const [sort, setSort] = useState(searchParams.get('sort') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [requestModal, setRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ skill_name: '', description: '' });

  const { data: skills } = useQuery({ queryKey: ['skills'], queryFn: () => skillsAPI.getAll().then(r => r.data) });

  const queryParams = {
    ...(search && { search }),
    ...(selectedSkill && { skill_id: selectedSkill }),
    ...(maxRate && { max_rate: maxRate }),
    ...(minRating && { min_rating: minRating }),
    ...(deliveryFormat !== 'all' && { delivery_format: deliveryFormat }),
    ...(sort && { sort }),
  };

  const { data: tutors, isLoading } = useQuery({
    queryKey: ['tutors', queryParams],
    queryFn: () => usersAPI.getTutors(queryParams).then(r => r.data),
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedSkill) params.set('skill', selectedSkill);
    if (sort) params.set('sort', sort);
    setSearchParams(params, { replace: true });
  }, [search, selectedSkill, sort]);

  const clearFilters = () => {
    setSearch('');
    setSelectedSkill('');
    setMaxRate('');
    setMinRating('');
    setDeliveryFormat('all');
    setSort('');
  };

  const handleSkillRequest = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      addToast('Please login to submit a skill request', 'warning');
      return;
    }
    try {
      await skillsAPI.submitRequest(requestForm);
      addToast('Skill request submitted! We\'ll review it soon.');
      setRequestModal(false);
      setRequestForm({ skill_name: '', description: '' });
    } catch {
      addToast('Failed to submit request', 'error');
    }
  };

  const hasFilters = search || selectedSkill || maxRate || minRating || deliveryFormat !== 'all' || sort;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-text-main">Browse Tutors</h1>
        <p className="text-text-muted mt-1">Find the perfect peer tutor for your learning needs</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name, skill, or keyword..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="btn-outline flex items-center gap-2 whitespace-nowrap">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Panel */}
        <div className={`lg:w-72 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="card space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">Filters</h3>
              {hasFilters && (
                <button onClick={clearFilters} className="text-sm text-danger hover:underline">Clear all</button>
              )}
            </div>

            {/* Skill Category */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Skill Category</label>
              <select
                value={selectedSkill}
                onChange={e => setSelectedSkill(e.target.value)}
                className="input-field text-sm"
              >
                <option value="">All Skills</option>
                {skills?.map(s => (
                  <option key={s.skill_id} value={s.skill_id}>{s.skill_name.split('(')[0].trim()}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Max Rate (GHS/hr)</label>
              <input
                type="number"
                value={maxRate}
                onChange={e => setMaxRate(e.target.value)}
                placeholder="e.g. 100"
                className="input-field text-sm"
                min="0"
              />
            </div>

            {/* Min Rating */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Minimum Rating</label>
              <select value={minRating} onChange={e => setMinRating(e.target.value)} className="input-field text-sm">
                <option value="">Any Rating</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="3.5">3.5+ Stars</option>
                <option value="3">3+ Stars</option>
              </select>
            </div>

            {/* Delivery Format */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Delivery Format</label>
              <div className="space-y-2">
                {['all', 'online', 'in_person'].map(f => (
                  <label key={f} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="format" value={f} checked={deliveryFormat === f} onChange={e => setDeliveryFormat(e.target.value)} className="text-primary" />
                    {f === 'all' ? 'All' : f === 'online' ? 'Online' : 'In-Person'}
                  </label>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Sort By</label>
              <select value={sort} onChange={e => setSort(e.target.value)} className="input-field text-sm">
                <option value="">Best Match</option>
                <option value="rating">Highest Rated</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="sessions">Most Sessions</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-text-muted text-sm">
              Showing <span className="font-medium text-text-main">{tutors?.length || 0}</span> tutors
            </p>
          </div>

          {isLoading ? <Loader /> : tutors?.length === 0 ? (
            <EmptyState title="No tutors found" message="Try adjusting your filters or search terms." icon={Search} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tutors?.map(tutor => (
                <TutorCard key={tutor.listing_id} tutor={tutor} />
              ))}
            </div>
          )}

          {/* Request Skill Banner */}
          <div className="mt-8 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-6 border border-primary/10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lightbulb className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-text-main">Can't find what you're looking for?</h3>
                <p className="text-text-muted text-sm mt-1">Request a new skill and we'll find tutors for you.</p>
              </div>
              <button onClick={() => setRequestModal(true)} className="btn-accent text-sm whitespace-nowrap">
                Request a Skill
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Skill Request Modal */}
      <Modal isOpen={requestModal} onClose={() => setRequestModal(false)} title="Request a New Skill">
        <form onSubmit={handleSkillRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Skill Name</label>
            <input
              type="text"
              value={requestForm.skill_name}
              onChange={e => setRequestForm(p => ({ ...p, skill_name: e.target.value }))}
              className="input-field"
              placeholder="e.g. Machine Learning with Python"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              value={requestForm.description}
              onChange={e => setRequestForm(p => ({ ...p, description: e.target.value }))}
              className="input-field"
              rows={3}
              placeholder="Describe what you'd like to learn..."
            />
          </div>
          <button type="submit" className="btn-primary w-full">Submit Request</button>
        </form>
      </Modal>
    </div>
  );
}
