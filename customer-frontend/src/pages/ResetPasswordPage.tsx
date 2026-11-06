import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';

export const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setAuthSession } = useAuth();
  const { settings } = useStoreSettings();

  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState<boolean>(false);
  const [tokenError, setTokenError] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Validate token immediately on component mount
  useEffect(() => {
    let isMounted = true;

    const verifyToken = async () => {
      if (!token) {
        if (isMounted) {
          setTokenValid(false);
          setTokenError('The password reset link is missing a valid token.');
          setValidatingToken(false);
        }
        return;
      }

      try {
        const res = await api.get(`/auth/reset-password/${token}`);
        if (isMounted) {
          if (res.data?.success && res.data?.valid) {
            setTokenValid(true);
            if (res.data.email) {
              setUserEmail(res.data.email);
            }
          } else {
            setTokenValid(false);
            setTokenError(res.data?.message || 'This password reset link is invalid or has expired.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setTokenValid(false);
          setTokenError(
            err.response?.data?.message ||
            'This password reset link is invalid, expired, or has already been used. Please request a new link.'
          );
        }
      } finally {
        if (isMounted) {
          setValidatingToken(false);
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

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
        if (res.data.token && res.data.user) {
          setAuthSession(res.data.token, res.data.user);
        } else if (res.data.token) {
          localStorage.setItem('aura_customer_token', res.data.token);
        }
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 2500);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Failed to reset password. This link may have expired or already been used.'
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
          <h1 className="font-serif text-xl font-bold text-stone-900">Set New Password</h1>
          <p className="text-xs text-stone-500">
            Create a secure new password for your customer account.
          </p>
        </div>

        {/* State 1: Validating reset token */}
        {validatingToken && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#832729] animate-spin mx-auto" />
            <p className="text-xs font-medium text-stone-600">
              Verifying your password reset link...
            </p>
          </div>
        )}

        {/* State 2: Token is invalid, expired, or already used */}
        {!validatingToken && !tokenValid && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-800">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>Link Invalid or Expired</span>
              </div>
              <p className="leading-relaxed">
                {tokenError || 'This password reset link is invalid, expired, or has already been used.'}
              </p>
              <p className="text-[11px] text-red-600">
                For security reasons, password reset links expire within 20 minutes and can only be used once.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <Link
                to="/forgot-password"
                className="w-full py-3 bg-[#832729] text-white font-bold uppercase tracking-widest rounded-lg hover:bg-[#6E1F21] transition-all shadow flex items-center justify-center gap-2 text-xs"
              >
                <span>Request a New Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="w-full py-2.5 bg-stone-100 text-stone-700 font-semibold rounded-lg hover:bg-stone-200 transition-all flex items-center justify-center gap-1.5 text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </div>
        )}

        {/* State 3: Password reset succeeded */}
        {!validatingToken && tokenValid && success && (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-lg font-bold text-stone-900">Password Reset Complete!</h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Your password has been successfully updated. You are now securely logged in. Redirecting you to the Aura Fashion home page...
            </p>
            <div className="pt-3">
              <Link
                to="/"
                className="inline-block px-5 py-2.5 bg-[#832729] text-white text-xs font-bold rounded-lg shadow hover:bg-[#6E1F21] transition-all"
              >
                Go to Shop Now
              </Link>
            </div>
          </div>
        )}

        {/* State 4: Token valid, show reset form */}
        {!validatingToken && tokenValid && !success && (
          <>
            {userEmail && (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex items-center gap-2 text-xs text-stone-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Resetting password for: <strong className="text-stone-900">{userEmail}</strong>
                </span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span>{error}</span>
                </div>
              </div>
            )}

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
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    className="w-full pl-10 pr-10 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] text-xs"
                  />
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
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
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Save New Password</span>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-stone-500 hover:text-[#832729] text-xs font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;