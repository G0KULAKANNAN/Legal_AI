import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, FileText, LayoutDashboard, User as UserIcon, Shield, Sparkles, Zap } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 text-slate-900 shadow-xs font-sans no-print print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to={!user ? '/' : user.role === 'ADMIN' ? '/admin/controls' : '/dashboard'} className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                Legal<span className="text-blue-600">AI</span>
              </span>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                PROD
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium tracking-tight">Review Before You Sign</p>
          </div>
        </Link>

        {/* Dynamic Navigation Links Based on Auth State */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/pricing" className="text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors">
            Pricing
          </Link>
          {!user ? (
            /* LOGGED OUT STATE */
            <>
              <Link to="/" className="text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors">
                Home
              </Link>
            </>
          ) : user.role === 'ADMIN' ? (
            /* LOGGED-IN ADMIN STATE */
            <>
              <Link to="/admin/controls" className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 hover:bg-amber-100 transition-all flex items-center space-x-1.5">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Admin Controls</span>
              </Link>
            </>
          ) : (
            /* LOGGED-IN USER STATE */
            <>
              <Link to="/dashboard" className="text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center space-x-1.5">
                <LayoutDashboard className="w-4 h-4 text-slate-400" />
                <span>My Documents</span>
              </Link>
              <Link to="/profile" className="text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center space-x-1.5">
                <UserIcon className="w-4 h-4 text-slate-400" />
                <span>Profile</span>
              </Link>
            </>
          )}
        </nav>

        {/* User Auth Controls / Logout */}
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              {/* Subscription Pill */}
              {user.role === 'ADMIN' ? (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                  ADMIN
                </span>
              ) : user.subscription?.status === 'ACTIVE' ? (
                <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{user.subscription.plan}</span>
                </span>
              ) : (
                <Link
                  to="/pricing"
                  className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all shadow-xs"
                >
                  <Zap className="w-3 h-3" />
                  <span>Subscribe (₹299)</span>
                </Link>
              )}

              <Link to="/profile" className="hidden sm:flex items-center space-x-3 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80 transition-colors">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 leading-tight">{user.name}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{user.email}</span>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold text-xs rounded-xl transition-all border border-slate-200 flex items-center space-x-1.5"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/pricing"
                className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Pricing
              </Link>
              <Link
                to="/login"
                className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm shadow-blue-600/20 transition-all flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
