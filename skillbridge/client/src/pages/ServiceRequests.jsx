import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { serviceRequestsAPI, gigsAPI } from '../api';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { Search, PlusCircle, Megaphone, Calendar, DollarSign, Users, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function ServiceRequests() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sort, setSort] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: () => gigsAPI.getCategories().then(r => r.data),
  });

  const queryParams = {
    ...(search && { search }),
    ...(selectedCategory && { category_id: selectedCategory }),
    ...(sort && { sort }),
  };

  const { data: requests, isLoading } = useQuery({
    queryKey: ['service-requests', queryParams],
    queryFn: () => serviceRequestsAPI.getAll(queryParams).then(r => r.data),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/marketplace" className="text-primary text-sm font-medium hover:underline flex items-center gap-1 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Marketplace
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-text-main">Service Requests</h1>
          <p className="text-text-muted mt-1">Browse what buyers are looking for and offer your skills</p>
        </div>
        {isAuthenticated && (
          <Link to="/post-request" className="btn-primary text-sm flex items-center gap-1">
            <PlusCircle className="h-4 w-4" /> Post a Request
          </Link>
        )}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
          <input type="text" placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="input-field text-sm w-48">
          <option value="">All Categories</option>
          {categories?.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="input-field text-sm w-40">
          <option value="">Newest</option>
          <option value="budget_high">Budget: High to Low</option>
          <option value="budget_low">Budget: Low to High</option>
          <option value="deadline">Deadline: Soonest</option>
        </select>
      </div>

      {/* Results */}
      {isLoading ? <Loader /> : requests?.length === 0 ? (
        <EmptyState title="No requests found" message="Be the first to post a service request!" icon={Megaphone} />
      ) : (
        <div className="space-y-4">
          {requests?.map(req => (
            <Link key={req.request_id} to={`/service-request/${req.request_id}`} className="card block hover:shadow-md hover:border-primary/20 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {req.category_name && (
                      <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full">{req.category_name}</span>
                    )}
                    <span className="text-xs text-text-muted">{format(new Date(req.created_at), 'MMM dd, yyyy')}</span>
                  </div>
                  <h3 className="font-display font-semibold text-lg text-text-main">{req.title}</h3>
                  <p className="text-text-muted text-sm mt-1 line-clamp-2">{req.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-text-muted">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Budget: GHS {Number(req.budget_min || 0).toFixed(0)} - {Number(req.budget_max || 0).toFixed(0)}
                    </span>
                    {req.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" /> Deadline: {format(new Date(req.deadline), 'MMM dd, yyyy')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" /> {req.application_count} applications
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-sm font-bold">
                    {req.buyer_name?.charAt(0)}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium">{req.buyer_name}</p>
                    <p className="text-xs text-text-muted">{req.institution}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
