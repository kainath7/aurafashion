import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Check
} from 'lucide-react';
import api from '../services/api';

export const AdminForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // Steps: 1 (Email), 2 (OTP), 3 (New Password), 4 (Success)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [email, setEmail] = useState('shoppe.aurafashion@gmail.com');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 60-second cooldown timer for OTP resend
  const [cooldown, setCooldown] = useState<number>(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Step 1: Request OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid administrative email.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/admin/auth/forgot-password/request-otp', {
        email: email.trim().toLowerCase()
      });

      setSuccessMsg(res.data?.message || 'If an administrator account exists, a 6-digit recovery code has been dispatched.');
      setCooldown(60);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to process OTP request. Please check rate limits.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setError('Please enter the full 6-digit security code received via Brevo SMTP.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/admin/auth/forgot-password/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: cleanOtp
      });

      if (res.data?.success) {
        setSuccessMsg(res.data?.message || 'OTP verified successfully.');
        setStep(3);
      } else {
        setError(res.data?.message || 'Invalid or expired OTP.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'OTP verification failed. Please check the code or request a new one.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must include uppercase, lowercase, and numeric characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/admin/auth/forgot-password/reset-password', {
        email: email.trim().toLowerCase(),
        otp,
        newPassword,
        confirmPassword
      });

      if (res.data?.success) {
        setStep(4);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(res.data?.message || 'Unable to update password.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password update failed.');
    } finally {
      setLoading(false);
    }
  };

  // Password criteria checkers
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber;

  // Password strength checker helper
  const getPasswordStrength = () => {
    if (!newPassword) return 0;
    let score = 0;
    if (hasMinLength) score += 25;
    if (hasUpper) score += 25;
    if (hasLower) score += 25;
    if (hasNumber) score += 25;
    return score;
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <img
            src="/logo-white.png"
            alt="Aura Fashion"
            className="h-16 w-auto mx-auto object-contain drop-shadow-md"
          />
          <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
            Admin Master Password Recovery
          </p>
        </div>

        {/* Step Progress Pills */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-[#832729]'
                  : s < step
                  ? 'w-6 bg-emerald-500'
                  : 'w-4 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/50 border border-emerald-700 text-emerald-200 text-xs rounded-lg flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Enter Admin Email */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4 text-xs text-slate-300">
            <div>
              <p className="text-slate-400 mb-3 text-xs leading-relaxed">
                Enter your registered administrator email address. A single-use 6-digit cryptographic verification OTP will be sent to your inbox via Brevo SMTP.
              </p>
              <label className="font-bold uppercase tracking-wider block mb-1 text-slate-400">
                Registered Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@aurafashion.com"
                  className="w-full pl-9 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#832729] text-white font-bold uppercase tracking-widest rounded-lg hover:bg-[#6E1F21] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#832729]/30 cursor-pointer disabled:bg-slate-700"
            >
              {loading ? 'Transmitting OTP...' : 'Send Recovery OTP'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: Enter 6-digit OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs text-slate-300">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs">Sent to: <strong className="text-white">{email}</strong></span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[11px] text-[#D4AF37] hover:underline"
                >
                  Change Email
                </button>
              </div>

              <label className="font-bold uppercase tracking-wider block mb-1 text-slate-400">
                6-Digit Security OTP (Expires in 5 mins)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full py-3 text-center tracking-[0.5em] font-mono text-2xl font-bold bg-slate-900/80 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Enter the six digits received in your administrator email. Maximum 5 attempts allowed.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 bg-[#832729] text-white font-bold uppercase tracking-widest rounded-lg hover:bg-[#6E1F21] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#832729]/30 cursor-pointer disabled:bg-slate-700"
            >
              {loading ? 'Verifying Code...' : 'Verify OTP & Continue'} <ArrowRight className="w-4 h-4" />
            </button>

            {/* Resend OTP with 60s cooldown */}
            <div className="pt-2 text-center border-t border-slate-700">
              {cooldown > 0 ? (
                <span className="text-slate-500 text-[11px]">
                  Resend code available in <strong className="text-white font-mono">{cooldown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleRequestOtp()}
                  className="text-xs text-[#D4AF37] font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Resend Security OTP
                </button>
              )}
            </div>
          </form>
        )}

        {/* STEP 3: Set New Master Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4 text-xs text-slate-300">
            <div>
              <label className="font-bold uppercase tracking-wider block mb-1 text-slate-400">
                New Master Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars: uppercase, lowercase & number"
                  className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#832729] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter */}
              <div className="mt-2 space-y-1.5">
                <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strength <= 25
                        ? 'bg-rose-500 w-1/4'
                        : strength <= 50
                        ? 'bg-amber-500 w-2/4'
                        : strength <= 75
                        ? 'bg-blue-500 w-3/4'
                        : 'bg-emerald-500 w-full'
                    }`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Required strength</span>
                  <span className={`font-semibold ${isPasswordValid ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {strength <= 25 ? 'Weak' : strength <= 50 ? 'Fair' : strength <= 75 ? 'Good' : 'Strong & Valid'}
                  </span>
                </div>

                {/* Real-time criteria checklist */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                    {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0" />}
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                    {hasUpper ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0" />}
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                    {hasLower ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0" />}
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                    {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block shrink-0" />}
                    <span>Number (0-9)</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold uppercase tracking-wider text-slate-400">
                  Confirm New Master Password
                </label>
                {confirmPassword && (
                  <span className={`text-[10px] font-semibold ${newPassword === confirmPassword ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </span>
                )}
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid || newPassword !== confirmPassword}
              className="w-full py-3.5 bg-[#832729] text-white font-bold uppercase tracking-widest rounded-lg hover:bg-[#6E1F21] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#832729]/30 cursor-pointer disabled:bg-slate-700 disabled:opacity-60"
            >
              {loading ? 'Encrypting & Saving...' : 'Update Admin Password'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 4: Success Confirmation */}
        {step === 4 && (
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-white">Password Updated</h3>
              <p className="text-xs text-slate-400 mt-1">
                Your administrative master password was securely hashed and saved. All previous recovery OTPs have been invalidated.
              </p>
            </div>
            <p className="text-[11px] text-[#D4AF37]">
              Redirecting you to the admin login portal...
            </p>
            <Link
              to="/login"
              className="inline-block w-full py-3 bg-[#832729] text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#6E1F21] transition-all"
            >
              Return to Admin Login
            </Link>
          </div>
        )}

        {/* Back to Login Link */}
        {step < 4 && (
          <div className="text-center pt-2 border-t border-slate-700 text-xs">
            <Link
              to="/login"
              className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
