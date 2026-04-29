import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Loader from './components/Loader';

// Pages
import Homepage from './pages/Homepage';
import Catalog from './pages/Catalog';
import TutorProfile from './pages/TutorProfile';
import Register from './pages/Register';
import Login from './pages/Login';
import BookingForm from './pages/BookingForm';
import Dashboard from './pages/Dashboard';
import WalletPage from './pages/Wallet';
import AdminDashboard from './pages/AdminDashboard';
import Support from './pages/Support';
import Marketplace from './pages/Marketplace';
import GigDetail from './pages/GigDetail';
import ServiceRequests from './pages/ServiceRequests';
import ServiceRequestDetail from './pages/ServiceRequestDetail';
import PostServiceRequest from './pages/PostServiceRequest';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderTracking from './pages/OrderTracking';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader text="Loading SkillBridge..." />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/browse" element={<Catalog />} />
            <Route path="/tutor/:userId" element={<TutorProfile />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/book/:listingId" element={<BookingForm />} />
            <Route path="/support" element={<Support />} />

            {/* Service Marketplace Routes */}
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/gig/:gigId" element={<GigDetail />} />
            <Route path="/service-requests" element={<ServiceRequests />} />
            <Route path="/service-request/:requestId" element={<ServiceRequestDetail />} />
            <Route path="/post-request" element={<ProtectedRoute><PostServiceRequest /></ProtectedRoute>} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/order-tracking" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />

            {/* Protected Dashboard Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
              <Route path="wallet" element={<WalletPage />} />
            </Route>
            <Route path="/dashboard/bookings" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/listings" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/availability" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/earnings" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/my-gigs" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/service-orders" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/service-messages" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/my-requests" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/profile" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/crm" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/finance" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/orders" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/inventory" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/supply-chain" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/deliveries" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/requests" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </ToastProvider>
  );
}
