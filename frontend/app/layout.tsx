import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { ShieldCheck, Vote, BarChart3, Lock, MessageSquare, UserPlus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'New Life College - Student Voting Portal',
  description:
    'Official digital voting system for New Life College Student Representative Council Elections with WhatsApp OTP authentication.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0e1e2e] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-[#418ccd] selection:text-white font-sans">
        {/* Top Security & System Status Banner with NLC Toolbar Theme */}
        <div className="bg-[#1a3240] border-b border-[#2a4856] text-xs py-2 px-3 sm:px-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-slate-200">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <span className="flex items-center space-x-1.5 text-[#5ebb3e] font-semibold">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5ebb3e] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5ebb3e]"></span>
                </span>
                <span>Polls Open</span>
              </span>
              <span className="hidden md:inline text-slate-500" aria-hidden="true">|</span>
              <span className="hidden md:inline-flex items-center space-x-1.5 text-slate-200">
                <Lock className="w-3.5 h-3.5 text-[#418ccd]" aria-hidden="true" />
                <span>Encrypted Secret Ballot</span>
              </span>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-4 text-xs">
              <span className="flex items-center space-x-1.5 text-[#5ebb3e] font-medium">
                <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                <span>WhatsApp OTP Active</span>
              </span>
              <span className="text-slate-500" aria-hidden="true">|</span>
              <span className="text-[#ffb606] font-semibold">2026/2027 Academic Year</span>
            </div>
          </div>
        </div>

        {/* Main Navigation Header */}
        <header className="sticky top-0 z-40 glass-panel border-b border-[#2a4856] backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
            {/* College Brand Logo */}
            <Link
              href="/"
              className="flex items-center space-x-3 group min-w-0 rounded-xl focus-visible:ring-2 focus-visible:ring-[#418ccd]"
              aria-label="New Life College SRC Voting Portal Home"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#418ccd] via-[#2a4856] to-[#ffb606] p-0.5 shadow-md shadow-[#418ccd]/20 group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                <div className="w-full h-full bg-[#0e1e2e] rounded-[9px] flex items-center justify-center">
                  <Vote className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffb606]" aria-hidden="true" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-[#418ccd] transition-colors truncate">
                    NEW LIFE COLLEGE
                  </span>
                  <span className="bg-[#ffb606]/15 text-[#ffb606] text-[10px] sm:text-xs font-bold uppercase px-2 py-0.5 rounded-md border border-[#ffb606]/30 flex-shrink-0">
                    SRC
                  </span>
                </div>
                <p className="text-xs text-slate-300 tracking-wide font-medium truncate hidden xs:block">
                  Excellence in Teaching, Research and Service
                </p>
              </div>
            </Link>

            {/* Public Voter Navigation Links (Admin Hidden) */}
            <nav className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0" aria-label="Main Navigation">
              <Link
                href="/"
                className="flex items-center space-x-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-200 hover:text-white hover:bg-[#2a4856]/80 transition-colors border border-transparent hover:border-[#418ccd]/40 focus-visible:ring-2 focus-visible:ring-[#418ccd] min-h-[40px]"
              >
                <Vote className="w-4 h-4 text-[#418ccd]" aria-hidden="true" />
                <span>Vote</span>
              </Link>

              <Link
                href="/register"
                className="flex items-center space-x-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-200 hover:text-white hover:bg-[#2a4856]/80 transition-colors border border-transparent hover:border-[#418ccd]/40 focus-visible:ring-2 focus-visible:ring-[#418ccd] min-h-[40px]"
              >
                <UserPlus className="w-4 h-4 text-[#ffb606]" aria-hidden="true" />
                <span className="hidden sm:inline">Register</span>
                <span className="sm:hidden">Join</span>
              </Link>
              
              <Link
                href="/results"
                className="flex items-center space-x-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-[#2a4856] hover:bg-[#365b6d] text-white transition-colors border border-[#418ccd]/30 hover:border-[#ffb606]/60 shadow-sm focus-visible:ring-2 focus-visible:ring-[#418ccd] min-h-[40px]"
              >
                <BarChart3 className="w-4 h-4 text-[#5ebb3e]" aria-hidden="true" />
                <span className="hidden sm:inline">Live Results</span>
                <span className="sm:hidden">Results</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" id="main-content">
          {children}
        </main>

        {/* Official Footer with NLC Theme */}
        <footer className="border-t border-[#2a4856] bg-[#091420] py-6 sm:py-8 text-xs text-slate-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-center md:text-left">
              <ShieldCheck className="w-5 h-5 text-[#5ebb3e] flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-slate-100">
                  New Life College Electoral Commission
                </p>
                <p className="text-slate-300 text-xs">
                  Excellence in Teaching, Research and Service • Official Student Voting Portal
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 text-center sm:text-right w-full md:w-auto pt-3 md:pt-0 border-t border-[#2a4856]/60 md:border-0">
              <div>
                <p className="text-slate-200 font-semibold">New Life College, Ghana</p>
                <p className="text-slate-400 text-xs">WhatsApp OTP Verification System</p>
              </div>

              {/* Discreet Admin Link */}
              <Link
                href="/admin"
                title="Electoral Commission Admin Console"
                aria-label="Electoral Commission Admin Console"
                className="p-2.5 text-slate-500 hover:text-slate-200 transition-colors rounded-lg hover:bg-[#1a3240] border border-transparent hover:border-[#2a4856] focus-visible:ring-2 focus-visible:ring-[#418ccd]"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
