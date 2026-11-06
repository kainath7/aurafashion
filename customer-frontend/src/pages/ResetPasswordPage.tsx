import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';

export const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { settings } = useStoreSettings();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.put(`/auth/reset-password/${token}`, {
        password,
        confirmPassword
      });

      if (res.data.success) {
        if (res.data.token) {
          localStorage.setItem('aura_customer_token', res.data.token);
        }
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'This password reset link is invalid or has expired. Please request a new link.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-8 space-y-6">
        <div className="text-center space-y-2">
          <span className="font-serif text-2xl font-bold uppercase tracking-widest text-[#832729]">
            {settings.shopName}
          </span>
          <h1 className="font-serif text-xl font-bold text-stone-900">Set New Password</h1>
          <p className="text-xs text-stone-500">
            Create a secure new password for your customer account.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span>{error}</span>
              <div className="mt-1">
                <Link to="/forgot-password" className="font-bold underline text-[#832729]">
                  Request a new password reset link
                </Link>
              </div>
            </div>
          </div>
        )}

        {success ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-lg font-bold text-stone-900">Password Reset Complete!</h2>
            <p className="text-xs text-stone-600">
              Your password has been successfully updated. Redirecting you to the Aura Fashion home page...
            </p>
            <div className="pt-3">
              <Link
                to="/"
                className="inline-block px-5 py-2.5 bg-[#832729] text-white text-xs font-bold rounded-lg shadow"
              >
                Go to Shop Now
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-stone-700 block mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] text-xs"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] text-xs"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#832729] text-white font-bold uppercase tracking-widest rounded-lg hover:bg-[#6E1F21] transition-all shadow-lg flex items-center justify-center gap-2 text-xs disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
