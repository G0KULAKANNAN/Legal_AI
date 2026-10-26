import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/axios';
import {
  User,
  ShieldCheck,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  CreditCard,
  Building2,
  ArrowRight,
  XCircle,
  Lock,
  Eye,
  EyeOff,
  Key,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || 'en');
  const [saving, setSaving] = useState(false);
  const [cancellingSub, setCancellingSub] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await api.put('/users/me', { name, preferredLanguage });
      if (res.data?.success) {
        await refreshUser();
        setMessage('Profile preferences updated successfully.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update profile preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password.');
      return;
    }

    setChangingPassword(true);

    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.data?.success) {
        setPasswordSuccess('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.data?.error?.message || 'Failed to change password.');
      }
    } catch (err: any) {
      setPasswordError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to change password. Please verify your current password.'
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your Premium subscription? You will retain access until the end of your current 30-day billing cycle.')) {
      return;
    }

    setCancellingSub(true);
    setError(null);
    setMessage(null);

    try {
      const res = await api.post('/subscription/cancel');
      if (res.data?.success) {
        await refreshUser();
        setMessage(res.data.message || 'Subscription cancellation scheduled successfully.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to cancel subscription.');
    } finally {
      setCancellingSub(false);
    }
  };

  const sub = user?.subscription;
  const isSubActive = sub?.status === 'ACTIVE' && new Date(sub.currentPeriodEnd) >= new Date();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans antialiased">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        
        {/* Header */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-md shadow-blue-600/20">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{user?.name}</h1>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-xs text-slate-500 font-medium">{user?.email}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  user?.role === 'ADMIN' ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {message && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800 flex items-center space-x-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 flex items-center space-x-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Subscription & Billing Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-extrabold text-slate-900">Subscription & Billing</h2>
            </div>
            <Link to="/pricing" className="text-xs font-bold text-blue-600 hover:underline flex items-center space-x-1">
              <span>View Plans</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {user?.role === 'ADMIN' ? (
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
              <span className="text-xs font-bold text-purple-900">Administrator Access</span>
              <p className="text-xs text-purple-700">You have full system administrator bypass with unrestricted legal document analysis capabilities.</p>
            </div>
          ) : isSubActive && sub ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase">Current Plan</span>
                  <span className="text-base font-extrabold text-blue-700">{sub.plan}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">₹299 / month</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase">Monthly Document Usage</span>
                  <span className="text-base font-extrabold text-slate-900">
                    {sub.documentsAnalyzedThisMonth || 0} / 50
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Documents analyzed this cycle</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase">Billing Cycle Ends</span>
                  <span className="text-base font-extrabold text-slate-900">
                    {new Date(sub.currentPeriodEnd).toLocaleDateString('en-IN')}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    {sub.cancelAtPeriodEnd ? 'Cancels at end of cycle' : 'Auto-renews monthly'}
                  </span>
                </div>
              </div>

              {sub.cancelAtPeriodEnd ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                  Your subscription has been scheduled for cancellation. You will retain full Premium access until {new Date(sub.currentPeriodEnd).toLocaleDateString('en-IN')}.
                </div>
              ) : (
                <div className="pt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-500">Need to cancel or change your plan?</p>
                  <button
                    type="button"
                    onClick={handleCancelSubscription}
                    disabled={cancellingSub}
                    className="px-3.5 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all cursor-pointer"
                  >
                    {cancellingSub ? 'Processing...' : 'Cancel Subscription'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>No Active Subscription</span>
                </div>
                <p className="text-xs text-amber-800">
                  You currently have no active subscription. Subscribe to the <strong>Premium Plan (₹299/month)</strong> to unlock automated legal contract analysis and Tamil/English voice explanations.
                </p>
              </div>
              <Link
                to="/pricing"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shrink-0 text-center"
              >
                Upgrade to Premium
              </Link>
            </div>
          )}
        </div>

        {/* Profile Edit Form */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
            Account Preferences
          </h2>

          <form onSubmit={handleSave} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1">Email address cannot be changed.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Assigned System Role</label>
              <input
                type="text"
                disabled
                value={user?.role || 'USER'}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500 font-bold uppercase cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1">System roles are managed by system administrators.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Preferred Analysis Output Language</label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="en">English</option>
                <option value="ta">Tamil</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile Preferences</span>
              )}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Lock className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-extrabold text-slate-900">
              Security & Password
            </h2>
          </div>

          {passwordSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800 flex items-center space-x-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 flex items-center space-x-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 pr-10 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 pr-10 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Must be at least 8 characters long.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  minLength={8}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 pr-10 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Key className="w-3.5 h-3.5" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        </div>

      </main>

      <Footer />
    </div>
  );
};

export default ProfilePage;
