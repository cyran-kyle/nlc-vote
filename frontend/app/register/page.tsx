'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Smartphone,
  ArrowRight,
  RefreshCw,
  Info,
  Lock,
  Clock,
} from 'lucide-react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Business Administration',
  'Accounting & Finance',
  'Nursing & Midwifery',
  'Human Resource Management',
  'Marketing',
  'General Studies',
];

const LEVELS = ['Level 100', 'Level 200', 'Level 300', 'Level 400'];

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [level, setLevel] = useState(LEVELS[0]);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredStudent, setRegisteredStudent] = useState<{
    student_id: string;
    full_name: string;
    department: string;
    level: string;
    masked_phone: string;
    raw_phone: string;
    status: string;
  } | null>(null);

  // Check registration portal status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/register/status`);
        const data = await res.json();
        if (res.ok && data.data) {
          setIsRegistrationOpen(data.data.is_registration_open);
        }
      } catch {
        setIsRegistrationOpen(true);
      } finally {
        setCheckingStatus(false);
      }
    };
    fetchStatus();
  }, []);

  // Format phone helper preview
  const cleanPhonePreview = (val: string) => {
    let clean = val.replace(/[^0-9]/g, '');
    if (clean.startsWith('0') && clean.length === 10) {
      clean = '233' + clean.substring(1);
    }
    return clean;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const formattedPhone = cleanPhonePreview(whatsappNumber);

    if (!formattedPhone.startsWith('233') || formattedPhone.length !== 12) {
      setErrorMessage(
        'Please enter a valid 12-digit Ghana WhatsApp number starting with 233 (e.g. 233540001122).'
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/register/student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId.trim().toUpperCase(),
          full_name: fullName.trim(),
          department,
          level,
          phone_number: formattedPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      setRegisteredStudent(data.data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to complete student registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#ffb606]/15 border border-[#ffb606]/35 text-[#ffb606] text-xs font-bold">
          <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Voter Onboarding</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Student Voter Registration
        </h1>
        <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
          Submit your official student ID and WhatsApp number to register for the 2026/2027 SRC Elections.
        </p>
      </div>

      {/* Main Card with NLC Theme */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl border border-[#2a4856] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#418ccd] via-[#ffb606] to-[#5ebb3e]" aria-hidden="true" />

        {/* Portal Closed Banner */}
        {!checkingStatus && !isRegistrationOpen && !registeredStudent && (
          <div className="p-6 rounded-xl bg-amber-950/40 border border-[#ffb606]/40 text-center space-y-3 my-2" role="alert">
            <div className="w-12 h-12 rounded-full bg-[#ffb606]/20 text-[#ffb606] flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-base font-bold text-white">Self-Registration is Currently Closed</h2>
            <p className="text-xs sm:text-sm text-slate-200 max-w-sm mx-auto">
              The Electoral Commission has closed online voter registration. For assistance, please contact the Electoral Commission Helpdesk in person.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#2a4856] hover:bg-[#365b6d] text-[#ffb606] text-xs sm:text-sm font-semibold border border-[#418ccd]/40 transition-colors focus-visible:ring-2 focus-visible:ring-[#ffb606]"
              >
                <span>Go to Voting Portal</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-5 p-4 rounded-xl bg-red-950/60 border border-red-500/40 flex items-start space-x-3 text-red-200 text-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" aria-hidden="true" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Success View */}
        {registeredStudent ? (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-[#418ccd]/20 text-[#418ccd] flex items-center justify-center mx-auto border border-[#418ccd]/40">
              <Clock className="w-8 h-8 stroke-[2.5]" aria-hidden="true" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                Registration Submitted
              </h2>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 mt-2 rounded-full bg-[#ffb606]/20 border border-[#ffb606]/40 text-[#ffb606] text-xs font-bold">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>PENDING COMMISSION APPROVAL</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-2.5 max-w-sm mx-auto leading-relaxed">
                Your registration details have been submitted. The Electoral Commission will review and activate your voter account.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0e1e2e] border border-[#2a4856] text-left space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between border-b border-[#2a4856] pb-2">
                <span className="text-slate-400 font-medium">Full Name:</span>
                <span className="font-semibold text-white">{registeredStudent.full_name}</span>
              </div>
              <div className="flex justify-between border-b border-[#2a4856] pb-2">
                <span className="text-slate-400 font-medium">Student ID:</span>
                <span className="font-mono font-bold text-[#418ccd]">{registeredStudent.student_id}</span>
              </div>
              <div className="flex justify-between border-b border-[#2a4856] pb-2">
                <span className="text-slate-400 font-medium">Department:</span>
                <span className="text-slate-200">{registeredStudent.department} ({registeredStudent.level})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">WhatsApp Number:</span>
                <span className="font-mono text-[#5ebb3e] font-semibold">+{registeredStudent.raw_phone}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#1a3544]/80 border border-[#418ccd]/40 flex items-start space-x-3 text-xs sm:text-sm text-slate-200 text-left">
              <Info className="w-5 h-5 text-[#418ccd] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="leading-relaxed">
                You will receive a WhatsApp message once your registration is approved. You may then authenticate and cast your ballot.
              </div>
            </div>

            <Link
              href="/"
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#418ccd] to-[#2c6ea6] hover:from-[#5ca3db] hover:to-[#418ccd] text-white font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-[#418ccd]/25 transition-all text-sm min-h-[48px] focus-visible:ring-2 focus-visible:ring-[#ffb606]"
            >
              <span>Go to Voting Portal</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          /* Registration Form */
          isRegistrationOpen && (
            <form onSubmit={handleRegister} className="space-y-4 sm:space-y-5">
              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="block text-xs font-semibold uppercase tracking-wider text-slate-200 mb-1.5">
                  Full Legal Name
                </label>
                <input
                  id="full_name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Samuel Kwaku Boakye"
                  className="w-full px-4 py-3 bg-[#0e1e2e] border border-[#2a4856] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#418ccd] text-sm font-medium transition-colors min-h-[48px]"
                />
              </div>

              {/* Student ID */}
              <div>
                <label htmlFor="reg_student_id" className="block text-xs font-semibold uppercase tracking-wider text-slate-200 mb-1.5">
                  Student ID Number
                </label>
                <input
                  id="reg_student_id"
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                  placeholder="e.g. NLC/2026/089"
                  className="w-full px-4 py-3 bg-[#0e1e2e] border border-[#2a4856] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#418ccd] text-sm font-mono uppercase font-bold tracking-wider transition-colors min-h-[48px]"
                />
              </div>

              {/* Department & Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="department" className="block text-xs font-semibold uppercase tracking-wider text-slate-200 mb-1.5">
                    Department / Faculty
                  </label>
                  <select
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#0e1e2e] border border-[#2a4856] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#418ccd] text-sm font-medium transition-colors min-h-[48px]"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept} className="bg-[#0e1e2e] text-white">
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="level" className="block text-xs font-semibold uppercase tracking-wider text-slate-200 mb-1.5">
                    Academic Level
                  </label>
                  <select
                    id="level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-3.5 py-3 bg-[#0e1e2e] border border-[#2a4856] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#418ccd] text-sm font-medium transition-colors min-h-[48px]"
                  >
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl} className="bg-[#0e1e2e] text-white">
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* WhatsApp Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="whatsapp_number" className="block text-xs font-semibold uppercase tracking-wider text-slate-200">
                    WhatsApp Phone Number
                  </label>
                  <span className="text-xs font-semibold text-[#5ebb3e]">
                    Starts with 233 (No +)
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5ebb3e]">
                    <Smartphone className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <input
                    id="whatsapp_number"
                    type="tel"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="e.g. 233540001122"
                    className="w-full pl-11 pr-4 py-3 bg-[#0e1e2e] border border-[#2a4856] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#5ebb3e] text-sm font-mono font-bold tracking-wider transition-colors min-h-[48px]"
                  />
                </div>

                {whatsappNumber && (
                  <div className="mt-2 text-xs text-slate-300 flex items-center space-x-1.5">
                    <span>Formatted number:</span>
                    <span className="font-mono text-[#5ebb3e] font-bold">
                      +{cleanPhonePreview(whatsappNumber)}
                    </span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#5ebb3e] to-[#418ccd] hover:from-[#6ed349] hover:to-[#5ca3db] text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-[#5ebb3e]/25 disabled:opacity-50 transition-all transform active:scale-98 min-h-[48px] focus-visible:ring-2 focus-visible:ring-[#ffb606]"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Submitting Registration...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                      <span>Submit for Verification</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )
        )}
      </div>

      {/* Return to login */}
      <div className="text-center">
        <Link
          href="/"
          className="text-xs sm:text-sm text-slate-300 hover:text-[#ffb606] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#418ccd] rounded p-1"
        >
          ← Already on the voter register? Access Voting Portal
        </Link>
      </div>
    </div>
  );
}
