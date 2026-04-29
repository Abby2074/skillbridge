import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { serviceOrdersAPI, bookingsAPI } from '../api';
import { ShieldCheck, CreditCard, Wallet, CheckCircle, ShoppingCart, ArrowLeft } from 'lucide-react';

export default function Checkout() {
  const { items, totalPrice, clearCart, removeItem } = useCart();
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [completedItems, setCompletedItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('wallet');

  if (items.length === 0 && completedItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShoppingCart className="h-12 w-12 text-text-muted mx-auto mb-4" />
        <h2 className="font-display font-bold text-xl mb-2">Cart is empty</h2>
        <p className="text-text-muted mb-4">Add services to your cart before checking out.</p>
        <Link to="/marketplace" className="btn-primary">Browse Marketplace</Link>
      </div>
    );
  }

  const handleCheckout = async () => {
    if (paymentMethod === 'wallet' && user.wallet_balance < totalPrice) {
      addToast('Insufficient wallet balance. Please top up first.', 'error');
      return;
    }

    setProcessing(true);
    const results = [];

    for (const item of items) {
      try {
        if (item.type === 'gig') {
          await serviceOrdersAPI.create({
            gig_id: item.gig_id,
            agreed_price: parseFloat(item.agreed_price || item.price),
            description: item.order_description || '',
          });
        } else if (item.type === 'session') {
          await bookingsAPI.create({
            listing_id: item.listing_id,
            availability_id: item.availability_id,
            scheduled_date: item.scheduled_date,
            notes: item.notes || '',
          });
        }
        results.push({ ...item, success: true });
        removeItem(item.cart_key);
      } catch (err) {
        results.push({ ...item, success: false, error: err.response?.data?.error || 'Failed' });
      }
    }

    setCompletedItems(results);
    setProcessing(false);

    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      await refreshUser();
      addToast(`${successCount} order(s) placed successfully!`);
    }
    if (results.some(r => !r.success)) {
      addToast('Some orders failed. See details below.', 'error');
    }
  };

  // Show results after checkout
  if (completedItems.length > 0) {
    const successItems = completedItems.filter(i => i.success);
    const failedItems = completedItems.filter(i => !i.success);

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
          <h1 className="font-display font-bold text-2xl mb-2">Order Confirmation</h1>
          <p className="text-text-muted">{successItems.length} of {completedItems.length} orders placed successfully</p>
        </div>

        {successItems.length > 0 && (
          <div className="card mb-4">
            <h3 className="font-semibold text-success mb-3">Successful Orders</h3>
            <div className="space-y-2">
              {successItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-text-muted text-xs">{item.type === 'gig' ? 'Service Order' : 'Tutoring Session'} - {item.provider_name}</p>
                  </div>
                  <span className="font-semibold text-accent">GHS {Number(item.agreed_price || item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {failedItems.length > 0 && (
          <div className="card mb-4 border-danger/30">
            <h3 className="font-semibold text-danger mb-3">Failed Orders</h3>
            <div className="space-y-2">
              {failedItems.map((item, i) => (
                <div key={i} className="text-sm py-2 border-b border-border/50 last:border-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-danger text-xs">{item.error}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-center mt-6">
          <Link to="/dashboard/service-orders" className="btn-primary">View My Orders</Link>
          <Link to="/marketplace" className="btn-outline">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/cart" className="text-primary text-sm font-medium hover:underline flex items-center gap-1 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Cart
      </Link>

      <h1 className="font-display font-bold text-2xl text-text-main mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Payment & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Method */}
          <div className="card">
            <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Payment Method
            </h2>
            <div className="space-y-3">
              <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${paymentMethod === 'wallet' ? 'border-primary bg-primary/5' : 'border-border hover:border-gray-300'}`}>
                <input type="radio" name="payment" value="wallet" checked={paymentMethod === 'wallet'} onChange={() => setPaymentMethod('wallet')} className="text-primary" />
                <Wallet className="h-5 w-5 text-accent" />
                <div className="flex-1">
                  <p className="font-medium text-sm">SkillBridge Wallet</p>
                  <p className="text-text-muted text-xs">Balance: GHS {Number(user?.wallet_balance || 0).toFixed(2)}</p>
                </div>
                {user?.wallet_balance < totalPrice && (
                  <Link to="/dashboard/wallet" className="text-xs text-danger font-medium hover:underline">Top Up</Link>
                )}
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${paymentMethod === 'momo' ? 'border-primary bg-primary/5' : 'border-border hover:border-gray-300'}`}>
                <input type="radio" name="payment" value="momo" checked={paymentMethod === 'momo'} onChange={() => setPaymentMethod('momo')} className="text-primary" />
                <CreditCard className="h-5 w-5 text-accent" />
                <div>
                  <p className="font-medium text-sm">Mobile Money (MTN / Vodafone)</p>
                  <p className="text-text-muted text-xs">Pay with mobile money</p>
                </div>
              </label>
            </div>
          </div>

          {/* Order Items */}
          <div className="card">
            <h2 className="font-display font-semibold text-lg mb-4">Order Items ({items.length})</h2>
            <div className="divide-y divide-border">
              {items.map(item => (
                <div key={item.cart_key} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-text-muted text-xs">{item.provider_name} - {item.type === 'gig' ? 'Service' : 'Session'}</p>
                  </div>
                  <span className="font-semibold text-accent">GHS {Number(item.agreed_price || item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security Note */}
          <div className="flex items-start gap-3 bg-green-50 rounded-lg p-4">
            <ShieldCheck className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-success">Secure Escrow Payment</p>
              <p className="text-text-muted">Your payment is held securely in escrow until both parties confirm service completion.</p>
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <div>
          <div className="card sticky top-24">
            <h2 className="font-display font-semibold text-lg mb-4">Payment Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Subtotal ({items.length} items)</span>
                <span className="font-medium">GHS {totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Platform fee</span>
                <span className="font-medium text-success">Included</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between font-display font-bold text-lg">
                <span>Total</span>
                <span className="text-accent">GHS {totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={processing || (paymentMethod === 'wallet' && user?.wallet_balance < totalPrice)}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>Processing...</>
              ) : (
                <><ShieldCheck className="h-4 w-4" /> Pay GHS {totalPrice.toFixed(2)}</>
              )}
            </button>

            {paymentMethod === 'wallet' && user?.wallet_balance < totalPrice && (
              <p className="text-danger text-xs text-center mt-2">
                Insufficient balance. You need GHS {(totalPrice - user.wallet_balance).toFixed(2)} more.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
