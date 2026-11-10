import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Lock, KeyRound } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAdminAuth();

  const [email, setEmail] = useState('shoppe.aurafashion@gmail.com');
  const [password, setPassword] = useState('AuraAdmin@2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Administrative verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-3">
          <img
            src="/logo-white.png"
            alt="Aura Fashion"
            className="h-16 w-auto mx-auto object-contain drop-shadow-md"
          />
          <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
            Administrative Control Center
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-300">
          <div>
            <label className="font-bold uppercase tracking-wider block mb-1 text-slate-400">
              Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold uppercase tracking-wider text-slate-400">
                Master Password
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] text-[#D4AF37] hover:underline font-medium"
              >
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#832729] text-white font-bold uppercase tracking-widest rounded-lg hover:bg-[#6E1F21] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#832729]/30"
          >
            {loading ? 'Authenticating...' : 'Enter Dashboard'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-700 text-[11px] text-slate-500">
          Authorized personnel only &bull; Bengaluru Studio
        </div>
      </div>
    </div>
  );
};
