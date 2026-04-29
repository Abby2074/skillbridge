import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { Wallet as WalletIcon, ArrowUpCircle, ArrowDownCircle, CreditCard, Smartphone, Banknote } from 'lucide-react';
import { format } from 'date-fns';

export default function WalletPage() {
  const { user, isTutor, refreshUser } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpMethod, setTopUpMethod] = useState('mtn_momo');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('mtn_momo');
  const [withdrawAccount, setWithdrawAccount] = useState('');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => walletAPI.getTransactions().then(r => r.data),
  });

  const topUpMutation = useMutation({
    mutationFn: (data) => walletAPI.topUp(data),
    onSuccess: (res) => {
      addToast(`Wallet topped up! New balance: GHS ${res.data.new_balance.toFixed(2)}`);
      setTopUpAmount('');
      refreshUser();
      queryClient.invalidateQueries(['transactions']);
    },
    onError: () => addToast('Top-up failed', 'error'),
  });

  const withdrawMutation = useMutation({
    mutationFn: (data) => walletAPI.withdraw(data),
    onSuccess: (res) => {
      addToast(`Withdrawal processed! Remaining: GHS ${res.data.new_earnings_balance.toFixed(2)}`);
      setWithdrawAmount('');
      setWithdrawAccount('');
      refreshUser();
      queryClient.invalidateQueries(['transactions']);
    },
    onError: (err) => addToast(err.response?.data?.error || 'Withdrawal failed', 'error'),
  });

  const methodIcons = { mtn_momo: Smartphone, vodafone_cash: Smartphone, card: CreditCard, bank_transfer: Banknote };
  const methodLabels = { mtn_momo: 'MTN MoMo', vodafone_cash: 'Vodafone Cash', card: 'Card Payment', bank_transfer: 'Bank Transfer' };

  const typeLabels = {
    top_up: 'Wallet Top-Up',
    session_payment: 'Session Payment',
    commission: 'Platform Commission',
    tutor_earnings: 'Tutor Earnings',
    refund: 'Refund',
    withdrawal: 'Withdrawal',
    service_escrow: 'Service Escrow',
    service_earnings: 'Service Earnings',
    service_commission: 'Service Commission',
    access_fee: 'Access Fee',
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-2xl">Wallet & Transactions</h1>

      {/* Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-red-brand via-red-brand to-orange-brand/80 rounded-xl p-6 text-white">
          <p className="text-white/70 text-sm">Wallet Balance</p>
          <p className="font-display font-bold text-3xl mt-1">GHS {Number(user?.wallet_balance || 0).toFixed(2)}</p>
        </div>
        {isTutor && (
          <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-xl p-6 text-white">
            <p className="text-white/70 text-sm">Earnings Balance</p>
            <p className="font-display font-bold text-3xl mt-1">GHS {Number(user?.earnings_balance || 0).toFixed(2)}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Up */}
        <div className="card">
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-success" /> Top Up Wallet
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (GHS)</label>
              <input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} className="input-field" placeholder="Enter amount" min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Payment Method</label>
              <div className="space-y-2">
                {(['mtn_momo', 'vodafone_cash', 'card']).map(m => {
                  const Icon = methodIcons[m];
                  return (
                    <label key={m} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${topUpMethod === m ? 'border-orange-brand bg-orange-soft' : 'border-border hover:border-orange-brand/30'}`}>
                      <input type="radio" name="topup-method" value={m} checked={topUpMethod === m} onChange={() => setTopUpMethod(m)} className="text-orange-brand" />
                      <Icon className="h-4 w-4 text-text-muted" />
                      <span className="text-sm">{methodLabels[m]}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              {[10, 50, 100, 200].map(amt => (
                <button key={amt} onClick={() => setTopUpAmount(String(amt))} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium hover:border-orange-brand hover:text-orange-brand transition-colors">
                  GHS {amt}
                </button>
              ))}
            </div>
            <button
              onClick={() => topUpMutation.mutate({ amount: parseFloat(topUpAmount), method: topUpMethod })}
              disabled={!topUpAmount || parseFloat(topUpAmount) < 1 || topUpMutation.isPending}
              className="w-full bg-gradient-to-r from-red-brand to-orange-brand text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {topUpMutation.isPending ? 'Processing...' : `Top Up GHS ${topUpAmount || '0'}`}
            </button>
          </div>
        </div>

        {/* Withdraw (Tutor only) */}
        {isTutor && (
          <div className="card">
            <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-accent" /> Withdraw Earnings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount (GHS)</label>
                <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="input-field" placeholder="Enter amount" min="1" max={user?.earnings_balance} />
                <p className="text-text-muted text-xs mt-1">Available: GHS {Number(user?.earnings_balance || 0).toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Withdrawal Method</label>
                <select value={withdrawMethod} onChange={e => setWithdrawMethod(e.target.value)} className="input-field">
                  <option value="mtn_momo">MTN MoMo</option>
                  <option value="vodafone_cash">Vodafone Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account/Phone Number</label>
                <input type="text" value={withdrawAccount} onChange={e => setWithdrawAccount(e.target.value)} className="input-field" placeholder="e.g. 024XXXXXXX" />
              </div>
              <button
                onClick={() => withdrawMutation.mutate({ amount: parseFloat(withdrawAmount), method: withdrawMethod, account_number: withdrawAccount })}
                disabled={!withdrawAmount || parseFloat(withdrawAmount) < 1 || parseFloat(withdrawAmount) > (user?.earnings_balance || 0) || !withdrawAccount.trim() || withdrawMutation.isPending}
                className="btn-accent w-full disabled:opacity-50"
              >
                {withdrawMutation.isPending ? 'Processing...' : `Withdraw GHS ${withdrawAmount || '0'}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="card">
        <h3 className="font-display font-semibold text-lg mb-4">Transaction History</h3>
        {isLoading ? <Loader /> : transactions?.length === 0 ? (
          <EmptyState title="No transactions" message="Your transactions will appear here." icon={WalletIcon} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 font-medium text-text-muted">Type</th>
                  <th className="text-left py-3 font-medium text-text-muted">Reference</th>
                  <th className="text-right py-3 font-medium text-text-muted">Amount</th>
                  <th className="text-left py-3 font-medium text-text-muted">Status</th>
                  <th className="text-right py-3 font-medium text-text-muted">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions?.map(t => (
                  <tr key={t.transaction_id} className="border-b border-border/50 hover:bg-gray-50">
                    <td className="py-3">{typeLabels[t.transaction_type] || t.transaction_type}</td>
                    <td className="py-3 text-text-muted text-xs">{t.payment_reference}</td>
                    <td className={`py-3 text-right font-semibold ${t.direction === 'credit' ? 'text-success' : 'text-danger'}`}>
                      {t.direction === 'credit' ? '+' : '-'}GHS {Number(t.amount).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.status === 'completed' ? 'bg-green-100 text-green-700' : t.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 text-right text-text-muted">{format(new Date(t.created_at), 'MMM dd, yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
