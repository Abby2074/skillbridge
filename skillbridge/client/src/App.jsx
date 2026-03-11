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

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
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

            {/* Protected Dashboard Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
              <Route path="wallet" element={<WalletPage />} />
            </Route>
            <Route path="/dashboard/bookings" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/listings" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/availability" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/earnings" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/profile" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/reviews" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/finance" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/skills" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/requests" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </ToastProvider>
  );
}
