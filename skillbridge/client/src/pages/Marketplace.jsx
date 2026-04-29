import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { gigsAPI } from '../api';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { Search, SlidersHorizontal, Star, Clock, Briefcase, PlusCircle, Megaphone, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, canFreelance } = useAuth();
  const { addItem, items } = useCart();
  const { addToast } = useToast();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [maxPrice, setMaxPrice] = useState('');
  const [deliveryFormat, setDeliveryFormat] = useState('all');
  const [sort, setSort] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: () => gigsAPI.getCategories().then(r => r.data),
  });

  const queryParams = {
    ...(search && { search }),
    ...(selectedCategory && { category_id: selectedCategory }),
    ...(maxPrice && { max_price: maxPrice }),
    ...(deliveryFormat !== 'all' && { delivery_format: deliveryFormat }),
    ...(sort && { sort }),
  };

  const { data: gigs, isLoading } = useQuery({
    queryKey: ['gigs', queryParams],
    queryFn: () => gigsAPI.getAll(queryParams).then(r => r.data),
  });

  const clearFilters = () => {
    setSearch(''); setSelectedCategory(''); setMaxPrice(''); setDeliveryFormat('all'); setSort('');
  };

  const hasFilters = search || selectedCategory || maxPrice || deliveryFormat !== 'all' || sort;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-text-main">Service Marketplace</h1>
          <p className="text-text-muted mt-1">Hire skilled freelancers for your projects</p>
        </div>
        <div className="flex gap-3">
          <Link to="/service-requests" className="btn-outline text-sm flex items-center gap-1">
            <Megaphone className="h-4 w-4" /> Browse Ads
          </Link>
          {isAuthenticated && canFreelance && (
            <Link to="/dashboard/my-gigs" className="btn-primary text-sm flex items-center gap-1">
              <PlusCircle className="h-4 w-4" /> My Gigs
            </Link>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
          <input
            type="text"
            placeholder="Search services..."
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
              {hasFilters && <button onClick={clearFilters} className="text-sm text-danger hover:underline">Clear all</button>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Category</label>
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="input-field text-sm">
                <option value="">All Categories</option>
                {categories?.map(c => (
                  <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Max Budget (GHS)</label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="e.g. 500" className="input-field text-sm" min="0" />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Delivery</label>
              <div className="space-y-2">
                {['all', 'remote', 'in_person'].map(f => (
                  <label key={f} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="delivery" value={f} checked={deliveryFormat === f} onChange={e => setDeliveryFormat(e.target.value)} className="text-primary" />
                    {f === 'all' ? 'All' : f === 'remote' ? 'Remote' : 'In-Person'}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Sort By</label>
              <select value={sort} onChange={e => setSort(e.target.value)} className="input-field text-sm">
                <option value="">Newest</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1">
          <p className="text-text-muted text-sm mb-4">
            Showing <span className="font-medium text-text-main">{gigs?.length || 0}</span> services
          </p>

          {isLoading ? <Loader /> : gigs?.length === 0 ? (
            <EmptyState title="No services found" message="Try adjusting your filters or search terms." icon={Briefcase} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gigs?.map(gig => {
                const inCart = items.some(i => i.cart_key === `gig-${gig.gig_id}`);
                return (
                  <div key={gig.gig_id} className="card hover:shadow-md hover:border-primary/20 transition-all group">
                    <Link to={`/gig/${gig.gig_id}`}>
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">{gig.category_name}</span>
                        {gig.avg_rating && (
                          <span className="flex items-center gap-1 text-sm text-accent">
                            <Star className="h-3.5 w-3.5 fill-accent" /> {gig.avg_rating}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-semibold text-text-main group-hover:text-primary transition-colors mb-2">{gig.title}</h3>
                      <p className="text-text-muted text-sm line-clamp-2 mb-4">{gig.description}</p>
                    </Link>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                          {gig.freelancer_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{gig.freelancer_name}</p>
                          <p className="text-xs text-text-muted">{gig.institution}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="font-semibold text-accent text-sm">
                            GHS {Number(gig.min_price).toFixed(0)} - {Number(gig.max_price).toFixed(0)}
                          </p>
                          {gig.delivery_time && (
                            <p className="text-xs text-text-muted flex items-center gap-1 justify-end">
                              <Clock className="h-3 w-3" /> {gig.delivery_time}
                            </p>
                          )}
                        </div>
                        {isAuthenticated && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              addItem({ type: 'gig', gig_id: gig.gig_id, title: gig.title, provider_name: gig.freelancer_name, agreed_price: gig.min_price, price: gig.min_price, description: gig.description?.slice(0, 100), delivery_format: gig.delivery_format });
                              addToast('Added to cart!');
                            }}
                            disabled={inCart}
                            className={`p-2 rounded-lg transition-colors ${inCart ? 'bg-green-100 text-green-600' : 'bg-accent/10 text-accent hover:bg-accent/20'}`}
                            title={inCart ? 'In Cart' : 'Add to Cart'}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Post Service Request CTA */}
          {isAuthenticated && (
            <div className="mt-8 bg-gradient-to-r from-accent/5 to-primary/5 rounded-xl p-6 border border-accent/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Megaphone className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-text-main">Need something specific?</h3>
                  <p className="text-text-muted text-sm mt-1">Post a service request and let freelancers come to you.</p>
                </div>
                <Link to="/post-request" className="btn-accent text-sm whitespace-nowrap">Post a Request</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
