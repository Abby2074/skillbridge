import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, ChevronDown, User, LogOut, LayoutDashboard, Wallet, BookOpen, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
  };

  return (
    <nav className="bg-white border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="font-display font-bold text-xl text-primary">SkillBridge</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/browse" className="text-text-muted hover:text-primary font-medium transition-colors">Browse Tutors</Link>
            {isAuthenticated ? (
              <div className="relative">
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 text-text-main hover:text-primary font-medium transition-colors">
                  <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden lg:inline">{user?.full_name?.split(' ')[0]}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-border py-2 z-50">
                    <div className="px-4 py-2 border-b border-border">
                      <p className="font-medium text-sm">{user?.full_name}</p>
                      <p className="text-xs text-text-muted">{user?.email}</p>
                    </div>
                    <Link to="/dashboard" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link to="/dashboard/wallet" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50">
                      <Wallet className="h-4 w-4" /> Wallet
                    </Link>
                    <Link to="/dashboard/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50">
                      <User className="h-4 w-4" /> Edit Profile
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 text-accent">
                        <Shield className="h-4 w-4" /> Admin Panel
                      </Link>
                    )}
                    <hr className="my-1 border-border" />
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 text-sm text-danger hover:bg-gray-50 w-full">
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-primary font-medium hover:text-primary-light transition-colors">Login</Link>
                <Link to="/register" className="btn-primary text-sm">Sign Up</Link>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2">
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-border px-4 pb-4">
          <Link to="/browse" onClick={() => setMobileOpen(false)} className="block py-3 text-text-muted hover:text-primary font-medium">Browse Tutors</Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block py-3 text-text-muted hover:text-primary font-medium">Dashboard</Link>
              <Link to="/dashboard/wallet" onClick={() => setMobileOpen(false)} className="block py-3 text-text-muted hover:text-primary font-medium">Wallet</Link>
              {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block py-3 text-accent font-medium">Admin Panel</Link>}
              <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="block py-3 text-danger font-medium">Logout</button>
            </>
          ) : (
            <div className="flex gap-3 pt-3">
              <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-outline text-sm flex-1 text-center">Login</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary text-sm flex-1 text-center">Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
