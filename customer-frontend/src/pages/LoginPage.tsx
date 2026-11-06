import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { settings } = useStoreSettings();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If redirected from checkout or specific page, navigate back there after login
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please check credentials.');
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
          <h1 className="font-serif text-xl font-bold text-stone-900">Welcome Back</h1>
          <p className="text-xs text-stone-500">Sign in to your customer account</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-stone-700 block mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. customer@aurafashion.com"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-stone-700">Password</label>
              <Link to="/forgot-password" className="text-[11px] text-[#832729] font-semibold hover:underline">
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#832729] text-white font-bold uppercase tracking-widest rounded-lg hover:bg-[#6E1F21] transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? 'Signing In...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-stone-100 text-xs text-stone-500">
          New to Aura Fashion?{' '}
          <Link to="/register" state={{ from: location.state?.from }} className="text-[#832729] font-bold hover:underline">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
};
