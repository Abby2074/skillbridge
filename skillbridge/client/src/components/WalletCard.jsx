import { Link } from 'react-router-dom';
import { Wallet, ArrowUpRight } from 'lucide-react';

export default function WalletCard({ balance = 0, type = 'wallet' }) {
  return (
    <div className={`rounded-xl p-6 text-white ${type === 'earnings' ? 'bg-gradient-to-r from-green-600 to-green-500' : 'bg-gradient-to-r from-primary to-primary-light'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/70 text-sm font-medium">{type === 'earnings' ? 'Earnings Balance' : 'Wallet Balance'}</p>
          <p className="font-display font-bold text-3xl mt-1">GHS {Number(balance).toFixed(2)}</p>
        </div>
        <Wallet className="h-10 w-10 text-white/30" />
      </div>
      <Link to="/dashboard/wallet" className="inline-flex items-center gap-1 mt-4 text-sm text-white/80 hover:text-white transition-colors">
        {type === 'earnings' ? 'Withdraw' : 'Top Up'} <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
