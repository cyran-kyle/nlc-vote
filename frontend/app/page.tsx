'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Lock,
  Smartphone,
  UserPlus,
  Vote,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function LoginPage() {
  const router = useRouter();

  // Step 1: 'id_entry', Step 2: 'otp_entry'
  const [step, setStep] = useState<'id_entry' | 'otp_entry'>('id_entry');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [idValidationError, setIdValidationError] = useState<string | null>(null);
  const [isPollsOpen, setIsPollsOpen] = useState<boolean | null>(null);

  // Check live election polls status on mount
  useEffect(() => {
    const checkPolls = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/election/status`);
        const json = await res.json();
        if (res.ok && json.data) {
          setIsPollsOpen(Boolean(json.data.is_polls_open));
        } else {
          setIsPollsOpen(true);
        }
      } catch {
        setIsPollsOpen(true);
      }
    };
    checkPolls();
  }, []);

  // Student details returned from request-otp
  const [studentData, setStudentData] = useState<{
    student_id: string;
    full_name: string;
    department: string;
    level: string;
    masked_phone: string;
  } | null>(null);

  // 6-digit OTP state
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer in seconds (5 minutes = 300s)
  const [countdown, setCountdown] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Timer interval
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp_entry' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Resend cooldown timer
  useEffect(() => {
    let cooldownTimer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      cooldownTimer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(cooldownTimer);
  }, [resendCooldown]);

  // Validate Student ID format (must start with NLC)
  const validateStudentId = (value: string): string | null => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) return 'Please enter your official Student ID.';
    if (!trimmed.startsWith('NLC')) return 'Student ID must start with NLC (e.g. NLC/2026/001).';
    if (trimmed.length < 5) return 'Student ID is too short.';
    return null;
  };

  const handleStudentIdBlur = () => {
    if (studentId.trim()) {
      setIdValidationError(validateStudentId(studentId));
    }
  };

  // Request OTP from Backend
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const validationErr = validateStudentId(studentId);
    if (validationErr) {
      setIdValidationError(validationErr);
      setErrorMessage(validationErr);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIdValidationError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to request OTP');
      }

      setStudentData(data.data);
      setStudentId(studentId.trim());
      setStep('otp_entry');
      setCountdown(300);
      setResendCooldown(30);
      setSuccessMessage(data.message);
      setOtpValues(['', '', '', '', '', '']);

      // Focus first OTP input on transition
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while connecting to the election server.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // If user pasted multi-digit text
      const cleanDigits = value.replace(/[^0-9]/g, '').slice(0, 6);
      const newOtp = [...otpValues];
      for (let i = 0; i < cleanDigits.length; i++) {
        newOtp[i] = cleanDigits[i];
      }
      setOtpValues(newOtp);
      const nextIndex = Math.min(cleanDigits.length, 5);
      otpInputsRef.current[nextIndex]?.focus();
      return;
    }

    const digit = value.replace(/[^0-9]/g, '');
    const newOtp = [...otpValues];
    newOtp[index] = digit;
    setOtpValues(newOtp);

    // Auto-focus next input box
    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  // Verify OTP and proceed to Ballot
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpValues.join('');

    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit One-Time Password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId.trim(),
          otp: fullOtp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Invalid or expired OTP');
      }

      // Store authenticated voting session in sessionStorage
      sessionStorage.setItem('nlc_voter_token', data.data.token);
      sessionStorage.setItem('nlc_student_id', studentId.trim());
      sessionStorage.setItem('nlc_voter_otp', fullOtp);
      sessionStorage.setItem('nlc_voter_profile', JSON.stringify(data.data.student));

      // Redirect to Ballot page
      router.push('/ballot');
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Timer urgency: red + pulse when < 60s
  const timerUrgent = countdown < 60 && countdown > 0;
  const timerExpired = countdown === 0;

  return (
    <div className="max-w-xl mx-auto py-6 sm:py-8 space-y-6">
      {/* Hero Welcome Banner */}
      <div className="text-center space-y-4 animate-fadeSlideIn">
        <div className="flex justify-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-[#418ccd]/40 shadow-xl shadow-[#418ccd]/20">
            <img src="/nlc-logo.png" alt="New Life College" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#ffb606]/15 border border-[#ffb606]/35 text-[#ffb606] text-xs font-bold">
          <Vote className="w-3.5 h-3.5" aria-hidden="true" />
          <span>SRC General Elections 2026/2027</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Student Voter Authentication
        </h1>
        <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
          Enter your official Student ID to receive a verification OTP on your registered WhatsApp number.
        </p>

        {/* Quick Info Badges */}
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <Lock className="w-3 h-3 text-[#418ccd]" aria-hidden="true" />
            <span>Secret Ballot</span>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3 h-3 text-[#5ebb3e]" aria-hidden="true" />
            <span>Tamper-Proof</span>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <BarChart3 className="w-3 h-3 text-[#ffb606]" aria-hidden="true" />
            <span>Instant Results</span>
          </div>
        </div>
      </div>

      {/* Main Authentication Card with NLC Theme */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl border border-[#2a4856] relative overflow-hidden">
        {/* Decorative Top Gradient Line with NLC Gold & Blue */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#418ccd] via-[#ffb606] to-[#5ebb3e]" aria-hidden="true" />

        {/* Error Alert Box */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 flex items-start space-x-3 text-red-200 text-sm animate-fadeIn"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" aria-hidden="true" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Success Alert Box */}
        {successMessage && step === 'otp_entry' && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-[#5ebb3e]/15 border border-[#5ebb3e]/40 flex items-start space-x-3 text-emerald-200 text-sm animate-fadeIn"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#5ebb3e]" aria-hidden="true" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Polls Closed Announcement Banner */}
        {isPollsOpen === false && (
          <div className="p-6 rounded-2xl bg-red-950/40 border border-red-500/40 text-center space-y-4 animate-fadeSlideIn my-2">
            <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-white">Voting Polls are Currently Closed</h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                The official voting period is either concluded or currently suspended by the Electoral Commission.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/results"
                className="inline-flex items-center justify-center space-x-2 py-3 px-6 rounded-xl bg-gradient-to-r from-[#418ccd] to-[#2c6ea6] hover:from-[#5ca3db] hover:to-[#418ccd] text-white font-bold text-sm shadow-lg shadow-[#418ccd]/25 transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                <span>View Live Election Results</span>
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center space-x-2 py-3 px-6 rounded-xl bg-[#2a4856] hover:bg-[#365b6d] text-slate-200 text-sm font-semibold transition-colors border border-[#418ccd]/40"
              >
                <UserPlus className="w-4 h-4 text-[#ffb606]" />
                <span>Voter Registration</span>
              </Link>
            </div>
          </div>
        )}

        {/* STEP 1: Student ID Entry Form (Only if polls are open) */}
        {isPollsOpen !== false && step === 'id_entry' && (
          <form onSubmit={handleRequestOtp} className="space-y-6 animate-fadeSlideIn">
            <div>
              <label
                htmlFor="student_id"
                className="block text-sm font-semibold text-slate-100 mb-2"
              >
                Student Identification Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#418ccd]">
                  <Shield className="w-5 h-5" aria-hidden="true" />
                </div>
                <input
                  id="student_id"
                  type="text"
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value.toUpperCase());
                    if (idValidationError) setIdValidationError(null);
                  }}
                  onBlur={handleStudentIdBlur}
                  placeholder="e.g. NLC/2026/001"
                  className={`w-full pl-11 pr-4 py-3 bg-[#0e1e2e]/90 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#418ccd] focus:border-[#418ccd] font-medium tracking-wide transition-colors uppercase text-sm sm:text-base min-h-[48px] ${
                    idValidationError ? 'border-red-500/60' : 'border-[#2a4856]'
                  }`}
                  required
                  autoFocus
                />
              </div>
              {/* Inline Validation Hint */}
              {idValidationError ? (
                <p className="mt-2 text-xs text-red-400 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                  <span>{idValidationError}</span>
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-300">
                  Your one-time password (OTP) will be dispatched to your registered WhatsApp phone number.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !studentId.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#418ccd] to-[#2c6ea6] hover:from-[#5ca3db] hover:to-[#418ccd] text-white font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-[#418ccd]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] min-h-[48px] focus-visible:ring-2 focus-visible:ring-[#ffb606]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>Verifying Eligibility...</span>
                </>
              ) : (
                <>
                  <span>Request WhatsApp OTP</span>
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </>
              )}
            </button>

            {/* Link for Unregistered Students */}
            <div className="p-4 rounded-xl bg-[#0e1e2e]/90 border border-[#2a4856] flex items-center justify-between text-xs sm:text-sm">
              <div className="text-slate-300">
                Not yet on the voter register?
              </div>
              <Link
                href="/register"
                className="text-[#ffb606] hover:text-[#fad556] font-bold flex items-center space-x-1.5 focus-visible:ring-2 focus-visible:ring-[#418ccd] rounded p-1 transition-colors"
              >
                <span>Register here</span>
                <UserPlus className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: WhatsApp OTP Verification Form */}
        {step === 'otp_entry' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6 animate-slideInRight">
            {/* Student Profile Card */}
            {studentData && (
              <div className="p-4 rounded-xl bg-[#0e1e2e]/95 border border-[#2a4856] flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-lg bg-[#418ccd]/20 text-[#418ccd] flex items-center justify-center font-bold text-sm">
                  {studentData.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-white truncate">
                    {studentData.full_name}
                  </h2>
                  <div className="flex items-center space-x-2 text-xs text-slate-300 mt-0.5">
                    <span className="font-mono text-[#ffb606] font-semibold">{studentData.student_id}</span>
                    <span>•</span>
                    <span>{studentData.department}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-slate-100">
                  Enter 6-Digit WhatsApp OTP
                </label>
                <div
                  className={`flex items-center space-x-1.5 text-xs font-semibold transition-colors ${
                    timerExpired ? 'text-red-400' : timerUrgent ? 'text-red-400 animate-pulse' : 'text-[#ffb606]'
                  }`}
                  aria-live="polite"
                >
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{timerExpired ? 'OTP Expired' : `Expires in ${formatTime(countdown)}`}</span>
                </div>
              </div>

              {/* 6-Box OTP Inputs */}
              <div className="grid grid-cols-6 gap-2 sm:gap-3" role="group" aria-label="One-Time Password 6 digits">
                {otpValues.map((val, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputsRef.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    aria-label={`Digit ${idx + 1} of 6`}
                    className="w-full h-14 sm:h-16 text-center text-xl sm:text-2xl font-bold bg-[#0e1e2e] border border-[#2a4856] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#418ccd] focus:border-[#418ccd] font-mono transition-colors"
                    required
                  />
                ))}
              </div>

              <div className="mt-3.5 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center space-x-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#5ebb3e]" aria-hidden="true" />
                  <span>Sent to {studentData?.masked_phone}</span>
                </span>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={() => handleRequestOtp()}
                  className="text-[#418ccd] hover:text-[#5ca3db] disabled:text-slate-500 font-semibold flex items-center space-x-1 transition-colors focus-visible:ring-2 focus-visible:ring-[#ffb606] rounded p-1"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : 'Resend OTP'}
                  </span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={loading || otpValues.join('').length !== 6 || countdown === 0}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#5ebb3e] to-[#2c6ea6] hover:from-[#6ed349] hover:to-[#418ccd] text-white font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-[#5ebb3e]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] min-h-[48px] focus-visible:ring-2 focus-visible:ring-[#ffb606]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-5 h-5" aria-hidden="true" />
                    <span>Verify & Access Ballot</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('id_entry');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-[#2a4856]/60 text-slate-300 hover:text-white text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#418ccd]"
              >
                Use a different Student ID
              </button>
            </div>
          </form>
        )}

        {/* Security Seals */}
        <div className="mt-8 pt-6 border-t border-[#2a4856] flex flex-wrap items-center justify-around gap-4 text-xs text-slate-300">
          <div className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-[#418ccd]" aria-hidden="true" />
            <span>Identity Verification</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-[#5ebb3e]" aria-hidden="true" />
            <span>Secret Ballot Protection</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#ffb606]" aria-hidden="true" />
            <span>Single Vote Enforcement</span>
          </div>
        </div>
      </div>
    </div>
  );
}
