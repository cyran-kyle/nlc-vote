'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  ShieldCheck,
  Printer,
  BarChart3,
  LogOut,
  Smartphone,
  Copy,
  Check,
  QrCode,
  Lock,
} from 'lucide-react';

interface ReceiptData {
  receipt_code: string;
  ballot_hash: string;
  election_title: string;
  timestamp: string;
  anonymous_guarantee: string;
}

interface VoterProfile {
  student_id: string;
  full_name: string;
  department: string;
  level: string;
}

export default function SuccessPage() {
  const router = useRouter();

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [voter, setVoter] = useState<VoterProfile | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 1. Fire celebration confetti in NLC colors (Blue, Gold, Green)
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#418ccd', '#ffb606', '#5ebb3e', '#fad556'],
      });
    } catch {
      // Ignore if canvas-confetti is not loaded
    }

    // 2. Load receipt data from sessionStorage
    const storedReceipt = sessionStorage.getItem('nlc_vote_receipt');
    const storedVoter = sessionStorage.getItem('nlc_voter_profile');

    if (!storedReceipt) {
      router.push('/');
      return;
    }

    try {
      setReceipt(JSON.parse(storedReceipt));
      if (storedVoter) {
        setVoter(JSON.parse(storedVoter));
      }
    } catch {
      // Fallback gracefully
    }
  }, [router]);

  const handleCopyCode = () => {
    if (receipt?.receipt_code) {
      navigator.clipboard.writeText(receipt.receipt_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleExitSession = () => {
    sessionStorage.clear();
    router.push('/');
  };

  const handlePrint = () => {
    window.print();
  };

  if (!receipt) {
    return null;
  }

  const formattedDate = new Date(receipt.timestamp).toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-8 space-y-6 animate-fadeSlideIn">
      {/* Top Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-full bg-[#5ebb3e]/20 text-[#5ebb3e] mb-2 border border-[#5ebb3e]/40 shadow-lg shadow-[#5ebb3e]/10">
          <CheckCircle2 className="w-12 h-12" aria-hidden="true" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Ballot Successfully Cast!
        </h1>
        <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
          Your vote has been recorded anonymously and decoupled from your student identification.
        </p>
      </div>

      {/* WhatsApp Dispatch Notification */}
      <div className="p-4 rounded-2xl bg-[#5ebb3e]/15 border border-[#5ebb3e]/40 flex items-center space-x-3.5 text-xs sm:text-sm text-emerald-200 shadow-lg no-print">
        <div className="w-9 h-9 rounded-xl bg-[#5ebb3e]/20 text-[#5ebb3e] flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-emerald-300">
            WhatsApp Confirmation Dispatched
          </p>
          <p className="text-emerald-200/90 mt-0.5 text-xs">
            A confirmation receipt reference has been sent to your registered WhatsApp phone number for your records.
          </p>
        </div>
      </div>

      {/* Official Printable Digital Voting Certificate with NLC Theme */}
      <div className="glass-panel print-area rounded-2xl p-6 sm:p-8 border border-[#2a4856] shadow-2xl relative overflow-hidden space-y-6">
        {/* Certificate Header with Official Logo */}
        <div className="flex items-center justify-between pb-6 border-b border-[#2a4856]">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#2a4856] shadow-md flex-shrink-0 bg-white flex items-center justify-center p-1">
              <img src="/nlc-logo.png" alt="New Life College" className="w-full h-full object-contain object-center" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#ffb606]">
                New Life College Electoral Commission
              </div>
              <div className="text-sm sm:text-base font-extrabold text-white">
                Official Digital Voting Certificate
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#0e1e2e] border border-[#2a4856] text-xs font-mono text-[#5ebb3e] font-bold">
            <Lock className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            <span>RECORDED</span>
          </div>
        </div>

        {/* Election Title */}
        <div>
          <div className="text-xs font-medium text-slate-400">Election:</div>
          <div className="text-base sm:text-lg font-bold text-white">
            {receipt.election_title}
          </div>
        </div>

        {/* Voter Details */}
        {voter && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 rounded-xl bg-[#0e1e2e] border border-[#2a4856] text-xs sm:text-sm">
            <div>
              <span className="text-slate-400 font-medium">Accredited Voter:</span>
              <p className="font-semibold text-slate-100">{voter.full_name}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Student ID:</span>
              <p className="font-mono font-bold text-[#418ccd]">{voter.student_id}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Department:</span>
              <p className="text-slate-200">{voter.department}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Academic Level:</span>
              <p className="text-slate-200">{voter.level}</p>
            </div>
          </div>
        )}

        {/* Official Receipt Reference Code in NLC Gold */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#0e1e2e] border border-[#ffb606]/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Receipt Reference Code
            </span>
            <button
              onClick={handleCopyCode}
              aria-label="Copy receipt reference code"
              className="no-print text-xs sm:text-sm text-[#ffb606] hover:text-[#fad556] flex items-center space-x-1.5 font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#418ccd] rounded p-1"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#5ebb3e]" aria-hidden="true" />
                  <span className="text-[#5ebb3e]">Copied to clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-extrabold text-[#ffb606] tracking-wider">
            {receipt.receipt_code}
          </div>
        </div>

        {/* Verification Details */}
        <div className="space-y-2.5 text-xs sm:text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-300">
            <span className="text-slate-400">Timestamp:</span>
            <span className="font-mono text-slate-100 font-medium">{formattedDate}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-300">
            <span className="text-slate-400">Anonymity Status:</span>
            <span className="text-[#5ebb3e] font-semibold">{receipt.anonymous_guarantee}</span>
          </div>

          <div className="pt-2">
            <span className="text-slate-400">Receipt Verification Hash:</span>
            <p className="font-mono text-xs text-slate-300 break-all bg-[#0e1e2e] p-2.5 rounded-lg border border-[#2a4856] mt-1">
              {receipt.ballot_hash}
            </p>
          </div>
        </div>

        {/* Footer Seal */}
        <div className="pt-4 border-t border-[#2a4856] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-[#418ccd]" aria-hidden="true" />
            <span>Official Electoral Commission Record</span>
          </div>
          <div className="font-mono font-semibold text-[#ffb606]">New Life College SRC 2026/2027</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 no-print">
        <button
          onClick={handlePrint}
          className="py-3 px-4 rounded-xl bg-[#2a4856] hover:bg-[#365b6d] text-white font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-colors border border-[#418ccd]/40 focus-visible:ring-2 focus-visible:ring-[#ffb606] min-h-[44px]"
        >
          <Printer className="w-4 h-4 text-[#ffb606]" aria-hidden="true" />
          <span>Print / Save PDF</span>
        </button>

        <Link
          href="/results"
          className="py-3 px-4 rounded-xl bg-[#2a4856] hover:bg-[#365b6d] text-white font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-colors border border-[#418ccd]/40 focus-visible:ring-2 focus-visible:ring-[#5ebb3e] min-h-[44px]"
        >
          <BarChart3 className="w-4 h-4 text-[#5ebb3e]" aria-hidden="true" />
          <span>View Live Results</span>
        </Link>

        <button
          onClick={handleExitSession}
          className="py-3 px-4 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-200 font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-colors border border-red-500/30 focus-visible:ring-2 focus-visible:ring-red-400 min-h-[44px]"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          <span>Exit Voting Session</span>
        </button>
      </div>
    </div>
  );
}
