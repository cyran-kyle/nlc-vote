'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Users,
  Vote,
  RefreshCw,
  Trophy,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface CandidateResult {
  id: string;
  name: string;
  running_mate: string | null;
  avatar_url: string | null;
  votes: number;
  percentage: number;
}

interface PositionResult {
  id: string;
  title: string;
  total_votes: number;
  candidates: CandidateResult[];
}

interface ResultsData {
  election: {
    id: string;
    title: string;
    academic_year: string;
  };
  turnout: {
    total_registered: number;
    total_voted: number;
    total_pending: number;
    percentage: number;
  };
  results: PositionResult[];
}

export default function ResultsPage() {
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchResults = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/election/results`);
      const json = await res.json();
      if (res.ok && json.data) {
        setData(json.data);
        setLastUpdated(new Date());
      }
    } catch {
      // Keep existing data on network interruption
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Auto-refresh interval every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchResults();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchResults]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4" role="status">
        <RefreshCw className="w-10 h-10 text-[#418ccd] animate-spin" aria-hidden="true" />
        <p className="text-slate-200 font-medium tracking-wide">
          Loading Official Election Results...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-8" aria-live="polite">
      {/* Top Header & Turnout Summary with NLC Colors */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-[#2a4856] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#418ccd] via-[#ffb606] to-[#5ebb3e]" aria-hidden="true" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#5ebb3e] uppercase tracking-wider mb-1">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5ebb3e] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5ebb3e]"></span>
              </span>
              <span>Official Election Results</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-white">
              {data?.election.title || 'New Life College SRC Elections'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Academic Year: {data?.election.academic_year || '2026/2027'} • Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:self-start">
            <button
              onClick={() => fetchResults(true)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-[#2a4856] hover:bg-[#365b6d] text-slate-200 hover:text-white border border-[#418ccd]/40 text-xs sm:text-sm font-semibold flex items-center space-x-2 transition-colors focus-visible:ring-2 focus-visible:ring-[#ffb606] min-h-[40px]"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#418ccd]' : ''}`}
                aria-hidden="true"
              />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#418ccd] min-h-[40px] ${
                autoRefresh
                  ? 'bg-[#418ccd]/20 border-[#418ccd]/50 text-[#5ca3db]'
                  : 'bg-[#0e1e2e] border-[#2a4856] text-slate-400'
              }`}
            >
              Auto-Refresh: {autoRefresh ? 'ON (10s)' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Turnout Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#2a4856]">
          <div className="p-4 rounded-xl bg-[#0e1e2e] border border-[#2a4856] flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#418ccd]/20 text-[#418ccd] flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs text-slate-300 font-medium">Registered Voters</div>
              <div className="text-xl font-bold text-white font-mono">
                {data?.turnout.total_registered || 0}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0e1e2e] border border-[#2a4856] flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#5ebb3e]/20 text-[#5ebb3e] flex items-center justify-center flex-shrink-0">
              <Vote className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs text-slate-300 font-medium">Total Ballots Cast</div>
              <div className="text-xl font-bold text-[#5ebb3e] font-mono">
                {data?.turnout.total_voted || 0}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0e1e2e] border border-[#2a4856] flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#ffb606]/20 text-[#ffb606] flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs text-slate-300 font-medium">Voter Turnout Rate</div>
              <div className="text-xl font-bold text-[#ffb606] font-mono">
                {data?.turnout.percentage || 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Turnout Progress Bar */}
        <div className="mt-4">
          <div
            role="progressbar"
            aria-valuenow={data?.turnout.percentage || 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Voter Turnout Percentage"
            className="w-full h-2.5 bg-[#0e1e2e] rounded-full overflow-hidden border border-[#2a4856]"
          >
            <div
              className="h-full bg-gradient-to-r from-[#418ccd] to-[#5ebb3e] transition-all duration-500"
              style={{ width: `${data?.turnout.percentage || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Position Tallies & Candidate Standings */}
      <div className="space-y-8">
        {data?.results.map((pos, pIdx) => (
          <section
            key={pos.id}
            aria-labelledby={`portfolio-result-${pos.id}`}
            className="glass-panel rounded-2xl p-6 sm:p-8 border border-[#2a4856] shadow-xl"
          >
            {/* Portfolio Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-[#2a4856] gap-2">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-lg bg-[#418ccd]/20 text-[#418ccd] text-xs font-bold flex items-center justify-center font-mono" aria-hidden="true">
                  {pIdx + 1}
                </span>
                <h2 id={`portfolio-result-${pos.id}`} className="text-lg sm:text-xl font-bold text-white">
                  {pos.title}
                </h2>
              </div>

              <div className="text-xs sm:text-sm text-slate-300">
                Total Portfolio Votes:{' '}
                <span className="font-bold text-white font-mono">
                  {pos.total_votes}
                </span>
              </div>
            </div>

            {/* Candidate Standings Bars */}
            <div className="space-y-4 sm:space-y-5">
              {pos.candidates.map((cand, cIdx) => {
                const isLeader = cIdx === 0 && cand.votes > 0;

                return (
                  <div
                    key={cand.id}
                    className={`p-4 sm:p-5 rounded-xl border transition-colors ${
                      isLeader
                        ? 'bg-[#1c334a] border-[#5ebb3e]/50 shadow-md shadow-[#5ebb3e]/5'
                        : 'bg-[#16283b] border-[#2a4856]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center space-x-3">
                        {isLeader ? (
                          <div className="w-8 h-8 rounded-lg bg-[#5ebb3e]/20 text-[#5ebb3e] flex items-center justify-center flex-shrink-0">
                            <Trophy className="w-4 h-4" aria-hidden="true" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[#0e1e2e] text-slate-300 flex items-center justify-center text-xs font-bold flex-shrink-0 font-mono">
                            #{cIdx + 1}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm sm:text-base font-bold text-white">
                              {cand.name}
                            </h3>
                            {isLeader && (
                              <span className="px-2.5 py-0.5 rounded-full bg-[#5ebb3e]/20 text-[#5ebb3e] text-[10px] font-extrabold uppercase border border-[#5ebb3e]/40">
                                Leading
                              </span>
                            )}
                          </div>
                          {cand.running_mate && (
                            <p className="text-xs text-[#ffb606] font-medium">
                              Vice: {cand.running_mate}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                        <div className="text-sm sm:text-base font-extrabold text-white font-mono">
                          {cand.votes} <span className="text-xs text-slate-300 font-normal">votes</span>
                        </div>
                        <div className="text-xs font-bold text-[#ffb606] font-mono">
                          {cand.percentage}%
                        </div>
                      </div>
                    </div>

                    {/* Animated Percentage Bar */}
                    <div
                      role="progressbar"
                      aria-valuenow={cand.percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${cand.name} vote percentage: ${cand.percentage}%`}
                      className="w-full h-3 bg-[#0e1e2e] rounded-full overflow-hidden border border-[#2a4856]"
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLeader
                            ? 'bg-gradient-to-r from-[#5ebb3e] to-[#418ccd]'
                            : 'bg-gradient-to-r from-[#418ccd] to-[#2c6ea6]'
                        }`}
                        style={{ width: `${cand.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Official Disclaimer & Back Link */}
      <div className="p-5 rounded-2xl glass-panel border border-[#2a4856] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-300">
        <div className="flex items-center space-x-2.5">
          <ShieldCheck className="w-5 h-5 text-[#418ccd] flex-shrink-0" aria-hidden="true" />
          <span>
            Official election results computed directly from the anonymous voting ledger.
          </span>
        </div>

        <Link
          href="/"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#2a4856] hover:bg-[#365b6d] text-white font-semibold transition-colors border border-[#418ccd]/40 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#ffb606]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Return to Voting Portal</span>
        </Link>
      </div>
    </div>
  );
}
