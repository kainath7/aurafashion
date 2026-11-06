import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useStoreSettings } from '../context/StoreSettingsContext';

export const ForgotPasswordPage: React.FC = () => {
  const { settings } = useStoreSettings();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address (e.g., name@example.com).');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email: trimmedEmail });
      if (res.data.success) {
        setSubmitted(true);
      } else {
        setError(res.data.message || 'Unable to send password reset email. Please try again.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Unable to process password reset request. Please check your connection and try again.'
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
            {settings?.shopName || 'Aura Fashion'}
          </span>
          <h1 className="font-serif text-xl font-bold text-stone-900">Forgot Password</h1>
          <p className="text-xs text-stone-500">
            Enter your registered email address to receive password recovery instructions.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="font-serif text-lg font-bold text-stone-900">Check Your Inbox</h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                If an account exists with <strong className="text-stone-900">{email}</strong>, we have sent a secure password reset link to your email.
              </p>
            </div>
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 text-[11px] text-stone-500 text-left space-y-1">
              <p>• The reset link is valid for <strong>20 minutes</strong>.</p>
              <p>• Make sure to check your <em>Spam</em> or <em>Promotions</em> folder if you don't see it within a couple of minutes.</p>
              <p>• The reset link can only be used once.</p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setEmail('');
                }}
                className="text-xs text-[#832729] font-medium hover:underline"
              >
                Need to try another email address?
              </button>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-1.5 text-xs text-stone-600 hover:text-[#832729] font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Registered Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] text-xs"
                />
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#832729] text-white font-bold uppercase tracking-widest rounded-lg hover:bg-[#6E1F21] transition-all shadow-lg flex items-center justify-center gap-2 text-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-stone-500 hover:text-[#832729] text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;