import { useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI, reviewsAPI, skillsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import StatCard from '../components/StatCard';
import BookingStatusBadge from '../components/BookingStatusBadge';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  LayoutDashboard, Users, BookOpen, DollarSign, ShoppingCart, Star, Shield,
  Search, UserX, UserCheck, Flag, Download, Building, AlertTriangle, CheckCircle, XCircle, Clock,
  Package, Truck, Briefcase, MessageSquare, Database, TrendingUp, MapPin, Eye
} from 'lucide-react';

export default function AdminDashboard() {
  const { isAdmin, loading } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [dateRange, setDateRange] = useState({ start_date: '', end_date: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);

  if (loading) return <Loader />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const path = location.pathname.replace('/admin', '') || '/';

  const tabs = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/crm', label: 'CRM', icon: Users },
    { path: '/finance', label: 'Finance', icon: DollarSign },
    { path: '/orders', label: 'Orders', icon: ShoppingCart },
    { path: '/inventory', label: 'Inventory', icon: Database },
    { path: '/supply-chain', label: 'Supply Chain', icon: Truck },
    { path: '/deliveries', label: 'Deliveries', icon: Package },
    { path: '/requests', label: 'Requests', icon: Shield },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-text-main">Admin Dashboard</h1>
        <p className="text-text-muted text-sm">Back-office management for SkillBridge</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => (
          <Link
            key={tab.path}
            to={`/admin${tab.path === '/' ? '' : tab.path}`}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              path === tab.path ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </Link>
        ))}
      </div>

      {/* Overview */}
      {path === '/' && <AdminOverview />}
      {path === '/crm' && <AdminCRM />}
      {path === '/finance' && <AdminFinance dateRange={dateRange} setDateRange={setDateRange} />}
      {path === '/orders' && <AdminOrders status={orderStatus} setStatus={setOrderStatus} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} />}
      {path === '/inventory' && <AdminInventory />}
      {path === '/supply-chain' && <AdminSupplyChain />}
      {path === '/deliveries' && <AdminDeliveries />}
      {path === '/requests' && <AdminRequests />}
    </div>
  );
}

function AdminOverview() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => adminAPI.getDashboard().then(r => r.data) });
  const COLORS = ['#1B4F72', '#E67E22', '#1E8449', '#C0392B', '#8E44AD'];

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={data?.stats.total_users} icon={Users} color="primary" />
        <StatCard title="Active Tutors" value={data?.stats.active_tutors} icon={Users} color="accent" />
        <StatCard title="Completed Sessions" value={data?.stats.total_sessions} icon={ShoppingCart} color="success" />
        <StatCard title="Commission Earned" value={`GHS ${Number(data?.stats.commission_earned || 0).toFixed(0)}`} icon={DollarSign} color="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card">
          <h3 className="font-display font-semibold mb-4">Monthly Revenue</h3>
          {data?.monthly_revenue?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.monthly_revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `GHS ${v}`} />
                <Bar dataKey="revenue" fill="#1B4F72" radius={[4, 4, 0, 0]} />
                <Bar dataKey="commission" fill="#E67E22" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-text-muted text-sm">No revenue data yet.</p>}
        </div>

        {/* Top Tutors */}
        <div className="card">
          <h3 className="font-display font-semibold mb-4">Top Tutors by Earnings</h3>
          <div className="space-y-3">
            {data?.top_tutors?.map((t, i) => (
              <div key={t.user_id} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white text-xs font-bold">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{t.full_name}</p>
                  <p className="text-text-muted text-xs">{t.institution} | {t.sessions} sessions</p>
                </div>
                <span className="font-semibold text-sm text-accent">GHS {Number(t.total_earnings).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <h3 className="font-display font-semibold mb-4">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 font-medium text-text-muted">User</th>
                <th className="py-2 font-medium text-text-muted">Type</th>
                <th className="py-2 font-medium text-text-muted text-right">Amount</th>
                <th className="py-2 font-medium text-text-muted text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {data?.recent_transactions?.slice(0, 10).map(t => (
                <tr key={t.transaction_id} className="border-b border-border/50">
                  <td className="py-2">{t.user_name}</td>
                  <td className="py-2 text-text-muted">{t.transaction_type}</td>
                  <td className={`py-2 text-right font-medium ${t.direction === 'credit' ? 'text-success' : 'text-danger'}`}>
                    {t.direction === 'credit' ? '+' : '-'}GHS {Number(t.amount).toFixed(2)}
                  </td>
                  <td className="py-2 text-right text-text-muted">{format(new Date(t.created_at), 'MMM dd')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminUsers({ search, setSearch, roleFilter, setRoleFilter }) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: () => adminAPI.getUsers({ search, role: roleFilter }).then(r => r.data),
  });

  const suspendUser = useMutation({
    mutationFn: (id) => adminAPI.suspendUser(id),
    onSuccess: (res) => { addToast(res.data.message); queryClient.invalidateQueries(['admin-users']); },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="input-field pl-10 text-sm" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-field text-sm w-auto">
          <option value="">All Roles</option>
          <option value="student">Students</option>
          <option value="tutor">Tutors</option>
          <option value="both">Both</option>
        </select>
      </div>

      {isLoading ? <Loader /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 font-medium text-text-muted">Name</th>
                <th className="py-3 font-medium text-text-muted">Email</th>
                <th className="py-3 font-medium text-text-muted">Role</th>
                <th className="py-3 font-medium text-text-muted">Institution</th>
                <th className="py-3 font-medium text-text-muted text-center">Sessions</th>
                <th className="py-3 font-medium text-text-muted text-center">Status</th>
                <th className="py-3 font-medium text-text-muted text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.users?.map(u => (
                <tr key={u.user_id} className="border-b border-border/50 hover:bg-gray-50">
                  <td className="py-3 font-medium">{u.full_name}</td>
                  <td className="py-3 text-text-muted">{u.email}</td>
                  <td className="py-3"><span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">{u.role}</span></td>
                  <td className="py-3 text-text-muted">{u.institution}</td>
                  <td className="py-3 text-center">{u.session_count}</td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => suspendUser.mutate(u.user_id)}
                      className={`text-xs font-medium px-3 py-1 rounded-lg ${u.is_active ? 'text-danger hover:bg-red-50' : 'text-success hover:bg-green-50'}`}
                    >
                      {u.is_active ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-text-muted text-xs mt-3">Total: {data?.total} users</p>
        </div>
      )}
    </div>
  );
}

function AdminReviews() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () => reviewsAPI.getAdmin().then(r => r.data),
  });

  const flagReview = useMutation({
    mutationFn: (id) => reviewsAPI.flag(id),
    onSuccess: (res) => { addToast(res.data.message); queryClient.invalidateQueries(['admin-reviews']); },
  });

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-lg">Review Moderation</h2>
      {reviews?.map(r => (
        <div key={r.review_id} className={`card ${r.is_flagged ? 'border-danger/30 bg-red-50/30' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{r.student_name}</span>
                <span className="text-text-muted text-xs">reviewed</span>
                <span className="font-medium text-sm">{r.tutor_name}</span>
                {r.is_flagged && <Flag className="h-3.5 w-3.5 text-danger" />}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < r.star_rating ? 'fill-accent text-accent' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="text-text-muted text-xs">{format(new Date(r.created_at), 'MMM dd, yyyy')}</span>
              </div>
              {r.review_text && <p className="text-text-muted text-sm mt-2">{r.review_text}</p>}
            </div>
            <button
              onClick={() => flagReview.mutate(r.review_id)}
              className={`text-xs px-3 py-1 rounded-lg font-medium ${r.is_flagged ? 'text-success hover:bg-green-50' : 'text-danger hover:bg-red-50'}`}
            >
              {r.is_flagged ? 'Unflag' : 'Flag'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminFinance({ dateRange, setDateRange }) {
  const { addToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-finance', dateRange],
    queryFn: () => adminAPI.getFinancialReport(dateRange.start_date && dateRange.end_date ? dateRange : {}).then(r => r.data),
  });

  const handleExportCSV = async () => {
    try {
      const response = await adminAPI.downloadCSV(dateRange.start_date && dateRange.end_date ? dateRange : {});
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'skillbridge-financial-report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('CSV exported!');
    } catch {
      addToast('Export failed', 'error');
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display font-semibold text-lg">Financial Reports</h2>
        <div className="flex items-center gap-3">
          <input type="date" value={dateRange.start_date} onChange={e => setDateRange(p => ({ ...p, start_date: e.target.value }))} className="input-field text-sm py-1.5" />
          <span className="text-text-muted">to</span>
          <input type="date" value={dateRange.end_date} onChange={e => setDateRange(p => ({ ...p, end_date: e.target.value }))} className="input-field text-sm py-1.5" />
          <button onClick={handleExportCSV} className="btn-primary text-sm flex items-center gap-1 py-1.5">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data?.summary?.map(s => (
          <div key={s.transaction_type} className="card">
            <p className="text-text-muted text-sm capitalize">{s.transaction_type.replace('_', ' ')}</p>
            <p className="font-display font-bold text-xl mt-1">GHS {Number(s.total_amount).toFixed(2)}</p>
            <p className="text-text-muted text-xs">{s.count} transactions</p>
          </div>
        ))}
      </div>

      {/* Transaction Log */}
      <div className="card overflow-x-auto">
        <h3 className="font-display font-semibold mb-4">Transaction Log</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 font-medium text-text-muted">User</th>
              <th className="py-2 font-medium text-text-muted">Type</th>
              <th className="py-2 font-medium text-text-muted">Reference</th>
              <th className="py-2 font-medium text-text-muted text-right">Amount</th>
              <th className="py-2 font-medium text-text-muted text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {data?.transactions?.map(t => (
              <tr key={t.transaction_id} className="border-b border-border/50">
                <td className="py-2">{t.user_name}</td>
                <td className="py-2 text-text-muted capitalize">{t.transaction_type.replace('_', ' ')}</td>
                <td className="py-2 text-text-muted text-xs">{t.payment_reference}</td>
                <td className={`py-2 text-right font-medium ${t.direction === 'credit' ? 'text-success' : 'text-danger'}`}>
                  {t.direction === 'credit' ? '+' : '-'}GHS {Number(t.amount).toFixed(2)}
                </td>
                <td className="py-2 text-right text-text-muted">{format(new Date(t.created_at), 'MMM dd, yyyy')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminOrders({ status, setStatus, selectedOrder, setSelectedOrder }) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders', status],
    queryFn: () => adminAPI.getOrders(status ? { status } : {}).then(r => r.data),
  });

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg">All Bookings (Orders)</h2>
        <select value={status} onChange={e => setStatus(e.target.value)} className="input-field text-sm w-auto py-1.5">
          <option value="">All Statuses</option>
          {['requested', 'confirmed', 'in_progress', 'completed', 'rated', 'cancelled'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-3 font-medium text-text-muted">Session</th>
              <th className="py-3 font-medium text-text-muted">Student</th>
              <th className="py-3 font-medium text-text-muted">Tutor</th>
              <th className="py-3 font-medium text-text-muted">Date</th>
              <th className="py-3 font-medium text-text-muted text-right">Fee</th>
              <th className="py-3 font-medium text-text-muted text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map(o => (
              <tr key={o.booking_id} className="border-b border-border/50 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedOrder(o)}>
                <td className="py-3 font-medium">{o.title}</td>
                <td className="py-3">{o.student_name}</td>
                <td className="py-3">{o.tutor_name}</td>
                <td className="py-3 text-text-muted">{format(new Date(o.scheduled_date), 'MMM dd, yyyy')}</td>
                <td className="py-3 text-right font-medium">GHS {Number(o.session_fee).toFixed(2)}</td>
                <td className="py-3 text-center"><BookingStatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Booking Details" size="lg">
        {selectedOrder && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-text-muted">Booking ID</p><p className="font-mono text-xs">{selectedOrder.booking_id}</p></div>
              <div><p className="text-text-muted">Status</p><BookingStatusBadge status={selectedOrder.status} /></div>
              <div><p className="text-text-muted">Student</p><p className="font-medium">{selectedOrder.student_name}</p></div>
              <div><p className="text-text-muted">Tutor</p><p className="font-medium">{selectedOrder.tutor_name}</p></div>
              <div><p className="text-text-muted">Skill</p><p>{selectedOrder.skill_name}</p></div>
              <div><p className="text-text-muted">Date</p><p>{format(new Date(selectedOrder.scheduled_date), 'PPP')}</p></div>
              <div><p className="text-text-muted">Fee</p><p className="font-semibold text-accent">GHS {Number(selectedOrder.session_fee).toFixed(2)}</p></div>
              <div><p className="text-text-muted">Commission</p><p>GHS {Number(selectedOrder.platform_commission).toFixed(2)}</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function AdminSkills() {
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: () => adminAPI.getInventory().then(r => r.data),
  });

  const { data: partners } = useQuery({
    queryKey: ['admin-partners'],
    queryFn: () => adminAPI.getPartners().then(r => r.data),
  });

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <h2 className="font-display font-semibold text-lg">Supply Chain: Skill Inventory</h2>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-3 font-medium text-text-muted">Skill</th>
              <th className="py-3 font-medium text-text-muted">Category</th>
              <th className="py-3 font-medium text-text-muted text-center">Active Listings</th>
              <th className="py-3 font-medium text-text-muted text-center">Total Sessions</th>
              <th className="py-3 font-medium text-text-muted text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {inventory?.map(s => (
              <tr key={s.skill_id} className={`border-b border-border/50 ${s.active_listings === 0 ? 'bg-red-50/50' : ''}`}>
                <td className="py-3 font-medium">{s.skill_name.split('(')[0].trim()}</td>
                <td className="py-3 text-text-muted">{s.category}</td>
                <td className="py-3 text-center">{s.active_listings}</td>
                <td className="py-3 text-center">{s.total_sessions}</td>
                <td className="py-3 text-center">
                  {s.active_listings === 0 ? (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1 justify-center">
                      <AlertTriangle className="h-3 w-3" /> No Supply
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Partner/Institution Analytics */}
      <div className="card">
        <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
          <Building className="h-5 w-5 text-primary" /> Partner Institutions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 font-medium text-text-muted">Institution</th>
                <th className="py-2 font-medium text-text-muted text-center">Users</th>
                <th className="py-2 font-medium text-text-muted text-center">Tutors</th>
                <th className="py-2 font-medium text-text-muted text-center">Students</th>
                <th className="py-2 font-medium text-text-muted text-center">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {partners?.map(p => (
                <tr key={p.institution} className="border-b border-border/50">
                  <td className="py-2 font-medium">{p.institution}</td>
                  <td className="py-2 text-center">{p.user_count}</td>
                  <td className="py-2 text-center">{p.tutor_count}</td>
                  <td className="py-2 text-center">{p.student_count}</td>
                  <td className="py-2 text-center">{p.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminRequests() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['skill-requests'],
    queryFn: () => skillsAPI.getRequests().then(r => r.data),
  });

  const updateRequest = useMutation({
    mutationFn: ({ id, status }) => skillsAPI.updateRequest(id, { status }),
    onSuccess: (res) => {
      addToast(res.data.message);
      queryClient.invalidateQueries(['skill-requests', 'skills']);
    },
  });

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-lg">Skill Request Queue</h2>
      {requests?.length === 0 ? (
        <EmptyState title="No requests" message="No skill requests pending." />
      ) : (
        requests?.map(r => (
          <div key={r.request_id} className="card flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{r.skill_name}</h3>
              <p className="text-text-muted text-sm">{r.description || 'No description'}</p>
              <p className="text-text-muted text-xs mt-1">By: {r.student_name} ({r.student_email}) | {format(new Date(r.submitted_at), 'MMM dd, yyyy')}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                r.status === 'approved' ? 'bg-green-100 text-green-700' :
                r.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>{r.status}</span>
            </div>
            {r.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => updateRequest.mutate({ id: r.request_id, status: 'approved' })} className="p-2 text-success hover:bg-green-50 rounded-lg"><CheckCircle className="h-5 w-5" /></button>
                <button onClick={() => updateRequest.mutate({ id: r.request_id, status: 'awaiting_tutors' })} className="p-2 text-primary hover:bg-blue-50 rounded-lg"><Clock className="h-5 w-5" /></button>
                <button onClick={() => updateRequest.mutate({ id: r.request_id, status: 'declined' })} className="p-2 text-danger hover:bg-red-50 rounded-lg"><XCircle className="h-5 w-5" /></button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ========== CRM MODULE ==========
function AdminCRM() {
  const [crmTab, setCrmTab] = useState('customers');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['crm-customers', search, sort],
    queryFn: () => adminAPI.getCRMCustomers({ search, sort }).then(r => r.data),
  });

  const { data: customerDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['crm-customer', selectedCustomer],
    queryFn: () => adminAPI.getCRMCustomerDetail(selectedCustomer).then(r => r.data),
    enabled: !!selectedCustomer,
  });

  const { data: communications } = useQuery({
    queryKey: ['crm-communications'],
    queryFn: () => adminAPI.getCRMCommunications().then(r => r.data),
    enabled: crmTab === 'communications',
  });

  const { data: feedback } = useQuery({
    queryKey: ['crm-feedback'],
    queryFn: () => adminAPI.getCRMFeedback().then(r => r.data),
    enabled: crmTab === 'feedback',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg">CRM — Customer Relationship Management</h2>
      </div>

      {/* CRM Sub-tabs */}
      <div className="flex gap-2">
        {[{ key: 'customers', label: 'Customer Database', icon: Users }, { key: 'communications', label: 'Communications', icon: MessageSquare }, { key: 'feedback', label: 'Feedback', icon: Star }].map(t => (
          <button key={t.key} onClick={() => setCrmTab(t.key)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${crmTab === t.key ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted hover:bg-gray-200'}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Customer Database */}
      {crmTab === 'customers' && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="input-field pl-10 text-sm" />
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)} className="input-field text-sm w-auto">
              <option value="recent">Most Recent</option>
              <option value="spent">Highest Spending</option>
              <option value="active">Most Active</option>
            </select>
          </div>

          {isLoading ? <Loader /> : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-3 font-medium text-text-muted">Customer</th>
                    <th className="py-3 font-medium text-text-muted">Role</th>
                    <th className="py-3 font-medium text-text-muted">Institution</th>
                    <th className="py-3 font-medium text-text-muted text-center">Sessions</th>
                    <th className="py-3 font-medium text-text-muted text-center">Orders</th>
                    <th className="py-3 font-medium text-text-muted text-right">Spent</th>
                    <th className="py-3 font-medium text-text-muted text-center">Tickets</th>
                    <th className="py-3 font-medium text-text-muted text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customers?.map(c => (
                    <tr key={c.user_id} className="border-b border-border/50 hover:bg-gray-50">
                      <td className="py-3">
                        <p className="font-medium">{c.full_name}</p>
                        <p className="text-text-muted text-xs">{c.email}</p>
                      </td>
                      <td className="py-3"><span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">{c.role}</span></td>
                      <td className="py-3 text-text-muted">{c.institution}</td>
                      <td className="py-3 text-center">{c.total_sessions}</td>
                      <td className="py-3 text-center">{c.total_service_orders}</td>
                      <td className="py-3 text-right font-medium">GHS {Number(c.total_spent).toFixed(0)}</td>
                      <td className="py-3 text-center">{c.support_tickets}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => setSelectedCustomer(c.user_id)} className="text-primary hover:bg-primary/10 p-1.5 rounded-lg"><Eye className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-text-muted text-xs mt-3">Total: {customers?.length} customers</p>
            </div>
          )}

          {/* Customer Detail Modal */}
          <Modal isOpen={!!selectedCustomer} onClose={() => setSelectedCustomer(null)} title="Customer Profile" size="lg">
            {loadingDetail ? <Loader /> : customerDetail && (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-text-muted">Name</p><p className="font-medium">{customerDetail.customer.full_name}</p></div>
                  <div><p className="text-text-muted">Email</p><p className="font-medium">{customerDetail.customer.email}</p></div>
                  <div><p className="text-text-muted">Role</p><p className="font-medium capitalize">{customerDetail.customer.role}</p></div>
                  <div><p className="text-text-muted">Institution</p><p className="font-medium">{customerDetail.customer.institution}</p></div>
                  <div><p className="text-text-muted">Wallet Balance</p><p className="font-medium text-accent">GHS {Number(customerDetail.customer.wallet_balance).toFixed(2)}</p></div>
                  <div><p className="text-text-muted">Joined</p><p className="font-medium">{format(new Date(customerDetail.customer.created_at), 'MMM dd, yyyy')}</p></div>
                </div>

                {customerDetail.bookings.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Recent Bookings</h4>
                    <div className="space-y-1">
                      {customerDetail.bookings.slice(0, 5).map(b => (
                        <div key={b.booking_id} className="flex justify-between text-xs p-2 bg-gray-50 rounded">
                          <span>{b.title} ({b.skill_name})</span>
                          <BookingStatusBadge status={b.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {customerDetail.messages.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Communication Records ({customerDetail.messages.length})</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {customerDetail.messages.slice(0, 10).map(m => (
                        <div key={m.message_id} className="text-xs p-2 bg-gray-50 rounded">
                          <span className="font-medium">{m.sender_name}</span> to <span className="font-medium">{m.receiver_name}</span>
                          <p className="text-text-muted mt-0.5 truncate">{m.message_text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {customerDetail.support_tickets.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Support Tickets</h4>
                    <div className="space-y-1">
                      {customerDetail.support_tickets.map(t => (
                        <div key={t.ticket_id} className="text-xs p-2 bg-gray-50 rounded">
                          <p className="font-medium">{t.subject}</p>
                          <p className="text-text-muted">{t.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {customerDetail.transactions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Transaction History</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {customerDetail.transactions.map(t => (
                        <div key={t.transaction_id} className="flex justify-between text-xs p-2 bg-gray-50 rounded">
                          <span className="capitalize">{t.transaction_type.replace('_', ' ')}</span>
                          <span className={t.direction === 'credit' ? 'text-success font-medium' : 'text-danger font-medium'}>
                            {t.direction === 'credit' ? '+' : '-'}GHS {Number(t.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Modal>
        </>
      )}

      {/* Communications */}
      {crmTab === 'communications' && (
        <div className="space-y-4">
          <h3 className="font-display font-semibold">Platform Communications</h3>
          {communications?.support_tickets?.length > 0 && (
            <div className="card">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-danger" /> Support Tickets</h4>
              <div className="space-y-2">
                {communications.support_tickets.map(t => (
                  <div key={t.ticket_id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{t.user_name} ({t.email})</span>
                      <span className="text-xs text-text-muted">{format(new Date(t.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                    <p className="text-sm font-medium mt-1">{t.subject}</p>
                    <p className="text-text-muted text-sm">{t.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {communications?.messages?.length > 0 && (
            <div className="card">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Recent Messages</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {communications.messages.map(m => (
                  <div key={m.message_id} className="p-2 bg-gray-50 rounded text-sm">
                    <span className="font-medium">{m.sender_name}</span>
                    <span className="text-text-muted"> to </span>
                    <span className="font-medium">{m.receiver_name}</span>
                    <span className="text-xs text-text-muted ml-2">{format(new Date(m.sent_at), 'MMM dd, HH:mm')}</span>
                    <p className="text-text-muted text-xs mt-0.5 truncate">{m.message_text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback */}
      {crmTab === 'feedback' && (
        <div className="space-y-4">
          {feedback?.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard title="Session Reviews" value={feedback.stats.total_reviews} icon={Star} color="accent" />
              <StatCard title="Avg Session Rating" value={feedback.stats.avg_session_rating} icon={Star} color="warning" />
              <StatCard title="Service Reviews" value={feedback.stats.total_service_reviews} icon={Star} color="primary" />
              <StatCard title="Avg Service Rating" value={feedback.stats.avg_service_rating} icon={Star} color="success" />
            </div>
          )}
          <div className="card">
            <h4 className="font-semibold mb-3">All Session Reviews</h4>
            <div className="space-y-2">
              {feedback?.reviews?.map(r => (
                <div key={r.review_id} className={`p-3 rounded-lg ${r.is_flagged ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{r.student_name}</span>
                      <span className="text-text-muted">reviewed</span>
                      <span className="font-medium">{r.tutor_name}</span>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (<Star key={i} className={`h-3.5 w-3.5 ${i < r.star_rating ? 'fill-accent text-accent' : 'text-gray-300'}`} />))}
                    </div>
                  </div>
                  {r.review_text && <p className="text-text-muted text-sm mt-1">{r.review_text}</p>}
                </div>
              ))}
            </div>
          </div>
          {feedback?.service_reviews?.length > 0 && (
            <div className="card">
              <h4 className="font-semibold mb-3">Service Reviews</h4>
              <div className="space-y-2">
                {feedback.service_reviews.map(r => (
                  <div key={r.review_id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{r.reviewer_name}</span>
                        <span className="text-text-muted">reviewed</span>
                        <span className="font-medium">{r.reviewee_name}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (<Star key={i} className={`h-3.5 w-3.5 ${i < r.star_rating ? 'fill-accent text-accent' : 'text-gray-300'}`} />))}
                      </div>
                    </div>
                    {r.review_text && <p className="text-text-muted text-sm mt-1">{r.review_text}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ========== INVENTORY MANAGEMENT ==========
function AdminInventory() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-full-inventory'],
    queryFn: () => adminAPI.getFullInventory().then(r => r.data),
  });

  const [invTab, setInvTab] = useState('listings');

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <h2 className="font-display font-semibold text-lg">Inventory Management — Products & Services</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Products" value={data?.stats.total_products} icon={Database} color="primary" />
        <StatCard title="Active Listings" value={data?.stats.active_listings} icon={BookOpen} color="success" />
        <StatCard title="Active Gigs" value={data?.stats.active_gigs} icon={Briefcase} color="accent" />
        <StatCard title="Availability Slots" value={data?.stats.total_availability_slots} icon={Clock} color="warning" />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button onClick={() => setInvTab('listings')} className={`px-3 py-2 rounded-lg text-sm font-medium ${invTab === 'listings' ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted'}`}>
          Tutoring Listings ({data?.listings?.length})
        </button>
        <button onClick={() => setInvTab('gigs')} className={`px-3 py-2 rounded-lg text-sm font-medium ${invTab === 'gigs' ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted'}`}>
          Service Gigs ({data?.gigs?.length})
        </button>
      </div>

      {invTab === 'listings' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 font-medium text-text-muted">Service/Listing</th>
                <th className="py-3 font-medium text-text-muted">Supplier (Tutor)</th>
                <th className="py-3 font-medium text-text-muted">Category</th>
                <th className="py-3 font-medium text-text-muted text-center">Price/hr</th>
                <th className="py-3 font-medium text-text-muted text-center">Slots</th>
                <th className="py-3 font-medium text-text-muted text-center">Completed</th>
                <th className="py-3 font-medium text-text-muted text-center">Active</th>
                <th className="py-3 font-medium text-text-muted text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.listings?.map(l => (
                <tr key={l.listing_id} className="border-b border-border/50 hover:bg-gray-50">
                  <td className="py-3">
                    <p className="font-medium">{l.title}</p>
                    <p className="text-text-muted text-xs">{l.skill_name}</p>
                  </td>
                  <td className="py-3 text-text-muted">{l.tutor_name}</td>
                  <td className="py-3 text-text-muted">{l.category}</td>
                  <td className="py-3 text-center font-medium">GHS {Number(l.hourly_rate).toFixed(0)}</td>
                  <td className="py-3 text-center">{l.available_slots}</td>
                  <td className="py-3 text-center text-success">{l.completed_sessions}</td>
                  <td className="py-3 text-center text-accent">{l.active_bookings}</td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${l.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {invTab === 'gigs' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 font-medium text-text-muted">Service/Gig</th>
                <th className="py-3 font-medium text-text-muted">Supplier (Freelancer)</th>
                <th className="py-3 font-medium text-text-muted">Category</th>
                <th className="py-3 font-medium text-text-muted text-center">Price Range</th>
                <th className="py-3 font-medium text-text-muted text-center">Completed</th>
                <th className="py-3 font-medium text-text-muted text-center">Active</th>
                <th className="py-3 font-medium text-text-muted text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.gigs?.map(g => (
                <tr key={g.gig_id} className="border-b border-border/50 hover:bg-gray-50">
                  <td className="py-3">
                    <p className="font-medium">{g.title}</p>
                    <p className="text-text-muted text-xs">{g.delivery_time}</p>
                  </td>
                  <td className="py-3 text-text-muted">{g.freelancer_name}</td>
                  <td className="py-3 text-text-muted">{g.category_name}</td>
                  <td className="py-3 text-center font-medium">GHS {Number(g.min_price).toFixed(0)}-{Number(g.max_price).toFixed(0)}</td>
                  <td className="py-3 text-center text-success">{g.completed_orders}</td>
                  <td className="py-3 text-center text-accent">{g.active_orders}</td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${g.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {g.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ========== SUPPLY CHAIN MANAGEMENT ==========
function AdminSupplyChain() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-supply-chain'],
    queryFn: () => adminAPI.getSupplyChain().then(r => r.data),
  });

  const [scTab, setScTab] = useState('suppliers');
  const COLORS = ['#1B4F72', '#E67E22', '#1E8449', '#C0392B', '#8E44AD', '#2C3E50'];

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <h2 className="font-display font-semibold text-lg">Supply Chain Management</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Suppliers" value={data?.stats.total_suppliers} icon={Users} color="primary" />
        <StatCard title="Active Suppliers" value={data?.stats.active_suppliers} icon={CheckCircle} color="success" />
        <StatCard title="Partner Institutions" value={data?.stats.total_partners} icon={Building} color="accent" />
        <StatCard title="Products in Supply" value={data?.stats.total_products_in_supply} icon={Package} color="warning" />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {[
          { key: 'suppliers', label: 'Suppliers (Tutors & Freelancers)' },
          { key: 'partners', label: 'Partners (Institutions)' },
          { key: 'distribution', label: 'Distribution & E-Market' },
        ].map(t => (
          <button key={t.key} onClick={() => setScTab(t.key)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${scTab === t.key ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Suppliers */}
      {scTab === 'suppliers' && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold mb-4">Service Suppliers</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 font-medium text-text-muted">Supplier</th>
                <th className="py-3 font-medium text-text-muted">Institution</th>
                <th className="py-3 font-medium text-text-muted text-center">Listings</th>
                <th className="py-3 font-medium text-text-muted text-center">Gigs</th>
                <th className="py-3 font-medium text-text-muted text-center">Delivered</th>
                <th className="py-3 font-medium text-text-muted text-center">Rating</th>
                <th className="py-3 font-medium text-text-muted text-right">Earnings</th>
                <th className="py-3 font-medium text-text-muted text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.suppliers?.map(s => (
                <tr key={s.user_id} className="border-b border-border/50 hover:bg-gray-50">
                  <td className="py-3">
                    <p className="font-medium">{s.full_name}</p>
                    <p className="text-text-muted text-xs">{s.email}</p>
                  </td>
                  <td className="py-3 text-text-muted">{s.institution}</td>
                  <td className="py-3 text-center">{s.total_listings}</td>
                  <td className="py-3 text-center">{s.total_gigs}</td>
                  <td className="py-3 text-center font-medium text-success">{s.completed_sessions + s.completed_orders}</td>
                  <td className="py-3 text-center">
                    {s.avg_rating > 0 ? (
                      <span className="flex items-center justify-center gap-1"><Star className="h-3.5 w-3.5 fill-accent text-accent" /> {Number(s.avg_rating).toFixed(1)}</span>
                    ) : <span className="text-text-muted">N/A</span>}
                  </td>
                  <td className="py-3 text-right font-medium">GHS {Number(s.earnings_balance).toFixed(0)}</td>
                  <td className="py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Partners */}
      {scTab === 'partners' && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Building className="h-5 w-5 text-primary" /> Partner Institutions</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 font-medium text-text-muted">Institution</th>
                <th className="py-3 font-medium text-text-muted text-center">Total Users</th>
                <th className="py-3 font-medium text-text-muted text-center">Suppliers</th>
                <th className="py-3 font-medium text-text-muted text-center">Buyers</th>
                <th className="py-3 font-medium text-text-muted text-center">Listings</th>
                <th className="py-3 font-medium text-text-muted text-center">Gigs</th>
                <th className="py-3 font-medium text-text-muted text-center">Delivered</th>
                <th className="py-3 font-medium text-text-muted text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data?.partners?.map(p => (
                <tr key={p.institution} className="border-b border-border/50 hover:bg-gray-50">
                  <td className="py-3 font-medium">{p.institution}</td>
                  <td className="py-3 text-center">{p.total_users}</td>
                  <td className="py-3 text-center text-primary font-medium">{p.suppliers}</td>
                  <td className="py-3 text-center">{p.buyers}</td>
                  <td className="py-3 text-center">{p.listings_supplied}</td>
                  <td className="py-3 text-center">{p.gigs_supplied}</td>
                  <td className="py-3 text-center text-success font-medium">{p.sessions_delivered + p.services_delivered}</td>
                  <td className="py-3 text-right font-medium text-accent">GHS {Number(p.total_revenue).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Distribution */}
      {scTab === 'distribution' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold mb-4">E-Market: Tutoring Distribution by Category</h3>
              <div className="space-y-2">
                {data?.distribution?.by_category?.map((d, i) => (
                  <div key={d.category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium">{d.category}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-text-muted">{d.listings} listings</span>
                      <span className="mx-2 text-border">|</span>
                      <span className="text-success font-medium">{d.delivered} delivered</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-4">E-Market: Service Distribution by Category</h3>
              <div className="space-y-2">
                {data?.distribution?.by_service_category?.map((d, i) => (
                  <div key={d.category_name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(i + 3) % COLORS.length] }} />
                      <span className="text-sm font-medium">{d.category_name}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-text-muted">{d.gigs} gigs</span>
                      <span className="mx-2 text-border">|</span>
                      <span className="text-success font-medium">{d.delivered} delivered</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4">Distribution by Delivery Format</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {data?.distribution?.by_format?.map(f => (
                <div key={f.format} className="p-4 bg-gray-50 rounded-lg text-center">
                  <MapPin className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="font-semibold capitalize">{f.format === 'both' ? 'Hybrid' : f.format}</p>
                  <p className="text-text-muted text-sm">{f.count} listings</p>
                  <p className="text-success font-medium text-sm">{f.delivered} delivered</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== DELIVERY MANAGEMENT ==========
function AdminDeliveries() {
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-deliveries', statusFilter, typeFilter],
    queryFn: () => adminAPI.getDeliveries({ status: statusFilter || undefined, type: typeFilter || undefined }).then(r => r.data),
  });

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <h2 className="font-display font-semibold text-lg">Delivery Management</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard title="Total Deliveries" value={data?.stats.total} icon={Package} color="primary" />
        <StatCard title="Completed" value={data?.stats.completed} icon={CheckCircle} color="success" />
        <StatCard title="In Progress" value={data?.stats.in_progress} icon={Truck} color="accent" />
        <StatCard title="Pending" value={data?.stats.pending} icon={Clock} color="warning" />
        <div className="card flex flex-col items-center justify-center">
          <p className="text-text-muted text-xs">Completion Rate</p>
          <p className="font-display font-bold text-2xl text-success">{data?.stats.completion_rate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field text-sm w-auto">
          <option value="">All Statuses</option>
          {['requested', 'pending', 'confirmed', 'in_progress', 'delivered', 'completed', 'rated', 'cancelled'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field text-sm w-auto">
          <option value="">All Types</option>
          <option value="session">Tutoring Sessions</option>
          <option value="service">Service Orders</option>
        </select>
      </div>

      {/* Delivery Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-3 font-medium text-text-muted">Type</th>
              <th className="py-3 font-medium text-text-muted">Service/Product</th>
              <th className="py-3 font-medium text-text-muted">Provider</th>
              <th className="py-3 font-medium text-text-muted">Customer</th>
              <th className="py-3 font-medium text-text-muted text-center">Format</th>
              <th className="py-3 font-medium text-text-muted text-right">Price</th>
              <th className="py-3 font-medium text-text-muted text-center">Status</th>
              <th className="py-3 font-medium text-text-muted text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {data?.deliveries?.map(d => (
              <tr key={d.id} className="border-b border-border/50 hover:bg-gray-50">
                <td className="py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.type === 'service' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                    {d.type === 'service' ? 'Service' : 'Session'}
                  </span>
                </td>
                <td className="py-3">
                  <p className="font-medium">{d.title}</p>
                  {d.skill_name && <p className="text-text-muted text-xs">{d.skill_name}</p>}
                </td>
                <td className="py-3 text-text-muted">{d.provider_name}</td>
                <td className="py-3 text-text-muted">{d.customer_name}</td>
                <td className="py-3 text-center capitalize text-text-muted">{d.delivery_format}</td>
                <td className="py-3 text-right font-medium">GHS {Number(d.price).toFixed(2)}</td>
                <td className="py-3 text-center"><BookingStatusBadge status={d.status} /></td>
                <td className="py-3 text-right text-text-muted">{format(new Date(d.delivery_date || d.created_at), 'MMM dd')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-text-muted text-xs mt-3">Showing {data?.deliveries?.length} deliveries</p>
      </div>
    </div>
  );
}
