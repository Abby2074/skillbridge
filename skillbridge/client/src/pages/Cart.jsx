import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Trash2, ArrowRight, Briefcase, BookOpen, ArrowLeft } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function Cart() {
  const { items, removeItem, totalPrice } = useCart();
  const { isAuthenticated } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingCart className="h-6 w-6 text-red-brand" />
        <h1 className="font-display font-bold text-2xl text-text-main">Shopping Cart</h1>
        <span className="bg-red-brand text-white text-xs font-bold px-2 py-0.5 rounded-full">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <EmptyState
            title="Your cart is empty"
            message="Browse our marketplace to find services and tutoring sessions."
            icon={ShoppingCart}
          />
          <div className="flex justify-center gap-4 mt-6">
            <Link to="/browse" className="btn-outline flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Browse Tutors
            </Link>
            <Link to="/marketplace" className="btn-primary flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Marketplace
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <div key={item.cart_key} className="card flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${item.type === 'gig' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                  {item.type === 'gig' ? <Briefcase className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.type === 'gig' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                        {item.type === 'gig' ? 'Service' : 'Tutoring Session'}
                      </span>
                      <h3 className="font-semibold text-text-main mt-1">{item.title}</h3>
                      <p className="text-text-muted text-sm">{item.provider_name}</p>
                      {item.description && <p className="text-text-muted text-xs mt-1 line-clamp-2">{item.description}</p>}
                    </div>
                    <button onClick={() => removeItem(item.cart_key)} className="p-2 text-danger hover:bg-red-50 rounded-lg flex-shrink-0" title="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-text-muted text-sm">{item.delivery_format || 'Online'}</span>
                    <span className="font-display font-bold text-accent text-lg">GHS {Number(item.agreed_price || item.price || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <div className="card sticky top-24">
              <h2 className="font-display font-semibold text-lg mb-4">Order Summary</h2>
              <div className="space-y-3 text-sm">
                {items.map(item => (
                  <div key={item.cart_key} className="flex justify-between">
                    <span className="text-text-muted truncate pr-2">{item.title}</span>
                    <span className="font-medium flex-shrink-0">GHS {Number(item.agreed_price || item.price || 0).toFixed(2)}</span>
                  </div>
                ))}
                <hr className="border-border" />
                <div className="flex justify-between">
                  <span className="text-text-muted">Subtotal ({items.length} items)</span>
                  <span className="font-medium">GHS {totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Platform Fee (10%)</span>
                  <span className="font-medium">GHS {(totalPrice * 0.1).toFixed(2)}</span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between font-display font-bold text-lg">
                  <span>Total</span>
                  <span className="text-accent">GHS {totalPrice.toFixed(2)}</span>
                </div>
                <p className="text-xs text-text-muted">Platform fee is included in the service price.</p>
              </div>

              {isAuthenticated ? (
                <Link to="/checkout" className="btn-primary w-full text-center flex items-center justify-center gap-2 mt-4">
                  Proceed to Checkout <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link to="/login" className="btn-primary w-full text-center block mt-4">Login to Checkout</Link>
              )}

              <Link to="/marketplace" className="btn-outline w-full text-center flex items-center justify-center gap-2 mt-2">
                <ArrowLeft className="h-4 w-4" /> Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
