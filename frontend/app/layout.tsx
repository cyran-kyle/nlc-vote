'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Vote,
  BarChart3,
  Lock,
  MessageSquare,
  UserPlus,
  Menu,
  X,
  HelpCircle,
  Mail,
} from 'lucide-react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pollStatus, setPollStatus] = useState<'open' | 'closed' | 'loading'>('loading');

  // Fetch election status dynamically
  useEffect(() => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/election/status`);
        const json = await res.json();
        if (res.ok && json.data) {
          setPollStatus(json.data.is_polls_open ? 'open' : 'closed');
        } else {
          setPollStatus('closed');
        }
      } catch {
        setPollStatus('closed');
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: '/', label: 'Vote', mobileLabel: 'Vote', icon: Vote, iconColor: 'text-[#418ccd]' },
    { href: '/register', label: 'Register', mobileLabel: 'Register', icon: UserPlus, iconColor: 'text-[#ffb606]' },
    { href: '/results', label: 'Live Results', mobileLabel: 'Live Results', icon: BarChart3, iconColor: 'text-[#5ebb3e]' },
  ];

  return (
    <html lang="en" className="dark">
      <head>
        <title>New Life College - Student Voting Portal</title>
        <meta
          name="description"
          content="Official digital voting system for New Life College Student Representative Council Elections with WhatsApp OTP authentication."
        />
      </head>
      <body className="bg-[#0e1e2e] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-[#418ccd] selection:text-white font-sans">
        {/* Top Security & System Status Banner with NLC Toolbar Theme */}
        <div className="bg-[#1a3240] border-b border-[#2a4856] text-xs py-2 px-3 sm:px-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-slate-200">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <span className={`flex items-center space-x-1.5 font-semibold ${pollStatus === 'open' ? 'text-[#5ebb3e]' : pollStatus === 'closed' ? 'text-red-400' : 'text-slate-400'}`}>
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  {pollStatus === 'open' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5ebb3e] opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${pollStatus === 'open' ? 'bg-[#5ebb3e]' : pollStatus === 'closed' ? 'bg-red-400' : 'bg-slate-500'}`}></span>
                </span>
                <span>{pollStatus === 'open' ? 'Polls Open' : pollStatus === 'closed' ? 'Polls Closed' : 'Checking...'}</span>
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
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shadow-md shadow-[#418ccd]/20 group-hover:scale-105 transition-transform duration-200 flex-shrink-0 border border-[#2a4856]">
                <img
                  src="/nlc-logo.png"
                  alt="New Life College Logo"
                  className="w-full h-full object-cover"
                />
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
                <p className="text-xs text-slate-300 tracking-wide font-medium truncate hidden sm:block">
                  Excellence in Teaching, Research and Service
                </p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0" aria-label="Main Navigation">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors border min-h-[40px] focus-visible:ring-2 focus-visible:ring-[#418ccd] ${
                      isActive
                        ? 'text-white bg-[#2a4856]/80 border-[#418ccd]/50'
                        : 'text-slate-200 hover:text-white hover:bg-[#2a4856]/80 border-transparent hover:border-[#418ccd]/40'
                    }`}
                  >
                    <link.icon className={`w-4 h-4 ${link.iconColor}`} aria-hidden="true" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#2a4856] transition-colors focus-visible:ring-2 focus-visible:ring-[#418ccd]"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-[#2a4856] bg-[#0e1e2e]/95 backdrop-blur-xl animate-fadeSlideIn">
              <nav className="max-w-7xl mx-auto px-4 py-3 space-y-1" aria-label="Mobile Navigation">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-white bg-[#2a4856] border border-[#418ccd]/40'
                          : 'text-slate-300 hover:text-white hover:bg-[#2a4856]/60'
                      }`}
                    >
                      <link.icon className={`w-5 h-5 ${link.iconColor}`} aria-hidden="true" />
                      <span>{link.mobileLabel}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" id="main-content">
          <div className="animate-fadeSlideIn">
            {children}
          </div>
        </main>

        {/* Official Footer with NLC Theme */}
        <footer className="border-t border-[#2a4856] bg-[#091420] py-6 sm:py-8 text-xs text-slate-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
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

            {/* Additional Footer Links */}
            <div className="mt-4 pt-4 border-t border-[#2a4856]/40 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400">
              <Link href="/results" className="flex items-center space-x-1.5 hover:text-[#418ccd] transition-colors">
                <BarChart3 className="w-3 h-3" aria-hidden="true" />
                <span>Election Results</span>
              </Link>
              <span className="text-slate-600 hidden sm:inline" aria-hidden="true">•</span>
              <Link href="/register" className="flex items-center space-x-1.5 hover:text-[#ffb606] transition-colors">
                <UserPlus className="w-3 h-3" aria-hidden="true" />
                <span>Voter Registration</span>
              </Link>
              <span className="text-slate-600 hidden sm:inline" aria-hidden="true">•</span>
              <span className="flex items-center space-x-1.5 text-slate-500">
                <HelpCircle className="w-3 h-3" aria-hidden="true" />
                <span>Contact EC Helpdesk</span>
              </span>
              <span className="text-slate-600 hidden sm:inline" aria-hidden="true">•</span>
              <span className="flex items-center space-x-1.5 text-slate-500">
                <Mail className="w-3 h-3" aria-hidden="true" />
                <span>ec@newlifecollege.edu.gh</span>
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
