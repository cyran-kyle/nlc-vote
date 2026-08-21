'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Vote,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Check,
  ShieldCheck,
  Lock,
  ArrowRight,
  RefreshCw,
  X,
  AlertTriangle,
  Inbox,
} from 'lucide-react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

interface Candidate {
  id: string;
  name: string;
  running_mate: string | null;
  tagline: string | null;
  manifesto: string | null;
  avatar_url: string | null;
}

interface Position {
  id: string;
  title: string;
  description: string | null;
  max_selections: number;
  display_order: number;
  candidates: Candidate[];
}

interface ElectionData {
  election: {
    id: string;
    title: string;
    academic_year: string;
    description: string;
  };
  positions: Position[];
}

export default function BallotPage() {
  const router = useRouter();

  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentOtp, setStudentOtp] = useState<string | null>(null);
  const [voterProfile, setVoterProfile] = useState<{
    student_id: string;
    full_name: string;
    department: string;
    level: string;
  } | null>(null);

  const [electionData, setElectionData] = useState<ElectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected candidate map: { [position_id]: candidate_id }
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Manifesto Modal
  const [activeManifestoCandidate, setActiveManifestoCandidate] = useState<Candidate | null>(null);

  // Review & Confirmation Modal
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Candidate avatar url helper
  const getFullAvatarUrl = (url: string | null): string | null => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `${SERVER_BASE_URL}${url}`;
    return `${SERVER_BASE_URL}/${url}`;
  };

  // Fetch Ballot Details
  const fetchBallot = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/election/ballot`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load ballot');
      }
      setElectionData(data.data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect to election server.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. Authenticate Session on mount
  useEffect(() => {
    const storedId = sessionStorage.getItem('nlc_student_id');
    const storedOtp = sessionStorage.getItem('nlc_voter_otp');
    const storedProfile = sessionStorage.getItem('nlc_voter_profile');

    if (!storedId || !storedOtp) {
      router.push('/');
      return;
    }

    setStudentId(storedId);
    setStudentOtp(storedOtp);
    if (storedProfile) {
      try {
        setVoterProfile(JSON.parse(storedProfile));
      } catch {
        setVoterProfile({
          student_id: storedId,
          full_name: 'Accredited Voter',
          department: 'General',
          level: 'Level 100',
        });
      }
    }

    fetchBallot();
  }, [router, fetchBallot]);

  // Handle ESC key to close open modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeManifestoCandidate) setActiveManifestoCandidate(null);
        if (showReviewModal) setShowReviewModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeManifestoCandidate, showReviewModal]);

  // Select a candidate for a position
  const handleSelectCandidate = (positionId: string, candidateId: string) => {
    setSelections((prev) => ({
      ...prev,
      [positionId]: candidateId,
    }));
  };

  // Check if all positions have been voted
  const totalPositions = electionData?.positions.length || 0;
  const selectedPositionsCount = Object.keys(selections).length;
  const isBallotComplete = totalPositions > 0 && selectedPositionsCount === totalPositions;
  const progressPercent = totalPositions > 0 ? Math.round((selectedPositionsCount / totalPositions) * 100) : 0;

  // Submit Final Ballot
  const handleFinalSubmission = async () => {
    if (!studentId || !studentOtp || !electionData) return;

    if (!isBallotComplete) {
      setErrorMessage(`Please select a candidate for all ${totalPositions} positions before submitting.`);
      setShowReviewModal(false);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const votePayload = Object.entries(selections).map(([positionId, candidateId]) => ({
      position_id: positionId,
      candidate_id: candidateId,
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/election/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          otp: studentOtp,
          election_id: electionData.election.id,
          votes: votePayload,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Ballot submission failed');
      }

      // Store official receipt proof
      sessionStorage.setItem('nlc_vote_receipt', JSON.stringify(result.data));
      sessionStorage.removeItem('nlc_voter_otp'); // Clean sensitive OTP

      // Redirect to Success Certificate
      router.push('/success');
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during ballot submission.');
      setShowReviewModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading Skeleton View
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-4 space-y-8 animate-fadeIn">
        {/* Header Skeleton */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-[#2a4856] space-y-4">
          <div className="skeleton skeleton-title w-48" />
          <div className="skeleton skeleton-text w-72" />
          <div className="skeleton h-3 w-full rounded-full mt-4" />
        </div>

        {/* Position Skeletons */}
        {[1, 2].map((idx) => (
          <div key={idx} className="glass-panel rounded-2xl p-6 sm:p-8 border border-[#2a4856] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#2a4856]">
              <div className="skeleton skeleton-title w-56" />
              <div className="skeleton w-28 h-6 rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((cIdx) => (
                <div key={cIdx} className="p-5 rounded-xl bg-[#16283b]/60 border border-[#2a4856] space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="skeleton skeleton-avatar" />
                    <div className="space-y-2 flex-1">
                      <div className="skeleton skeleton-title w-32" />
                      <div className="skeleton skeleton-text w-24" />
                    </div>
                  </div>
                  <div className="skeleton skeleton-text w-full" />
                  <div className="skeleton skeleton-text w-3/4" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty State View
  if (!electionData || !electionData.positions || electionData.positions.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center animate-fadeSlideIn">
        <div className="glass-panel rounded-2xl p-8 sm:p-10 border border-[#2a4856] space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#418ccd]/20 text-[#418ccd] flex items-center justify-center mx-auto border border-[#418ccd]/40">
            <Inbox className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">No Active Ballot Available</h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            There are currently no active portfolios or candidates configured for this election. Please contact the Electoral Commission.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#2a4856] hover:bg-[#365b6d] text-white text-sm font-semibold transition-colors"
            >
              <span>Return to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8">
      {/* Top Accredited Voter & Election Info Header */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-[#2a4856] shadow-xl relative overflow-hidden animate-fadeSlideIn">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#418ccd] via-[#ffb606] to-[#5ebb3e]" aria-hidden="true" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#418ccd] uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-[#5ebb3e]" aria-hidden="true" />
              <span>Accredited Voter Session</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {electionData?.election.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Academic Year: {electionData?.election.academic_year} • Anonymous Secret Ballot
            </p>
          </div>

          {voterProfile && (
            <div className="p-3.5 bg-[#0e1e2e]/95 rounded-xl border border-[#2a4856] text-xs sm:text-right min-w-[200px]">
              <div className="text-slate-400 font-medium">Voter:</div>
              <div className="font-semibold text-white text-sm">{voterProfile.full_name}</div>
              <div className="font-mono text-[#ffb606] font-semibold">{voterProfile.student_id}</div>
            </div>
          )}
        </div>

        {/* Ballot Progress Bar */}
        <div className="mt-6 pt-6 border-t border-[#2a4856]">
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mb-2">
            <span className="text-slate-200">Ballot Completion Progress</span>
            <span className={isBallotComplete ? 'text-[#5ebb3e]' : 'text-[#ffb606]'}>
              {selectedPositionsCount} of {totalPositions} Portfolios Selected ({progressPercent}%)
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Ballot Completion Progress"
            className="w-full h-3 bg-[#0e1e2e] rounded-full overflow-hidden border border-[#2a4856]"
          >
            <div
              className="h-full bg-gradient-to-r from-[#418ccd] to-[#5ebb3e] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 flex items-start space-x-3 text-red-200 text-sm font-medium animate-fadeIn"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" aria-hidden="true" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* Positions & Candidate Cards */}
      <div className="space-y-8 sm:space-y-10">
        {electionData?.positions.map((position, pIdx) => {
          const selectedCandidateId = selections[position.id];
          const isPositionCompleted = Boolean(selectedCandidateId);

          return (
            <section
              key={position.id}
              aria-labelledby={`position-title-${position.id}`}
              className={`rounded-2xl p-6 sm:p-8 transition-colors border animate-fadeSlideIn ${
                isPositionCompleted
                  ? 'glass-panel border-[#418ccd]/60'
                  : 'glass-panel-subtle border-[#2a4856]'
              }`}
            >
              {/* Position Title Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 mb-6 border-b border-[#2a4856]">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 rounded-full bg-[#418ccd]/20 text-[#418ccd] text-xs font-bold flex items-center justify-center font-mono" aria-hidden="true">
                      {pIdx + 1}
                    </span>
                    <h2 id={`position-title-${position.id}`} className="text-lg sm:text-xl font-bold text-white">
                      {position.title}
                    </h2>
                  </div>
                  {position.description && (
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 pl-10">
                      {position.description}
                    </p>
                  )}
                </div>

                <div className="pl-10 sm:pl-0">
                  {isPositionCompleted ? (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-[#5ebb3e]/15 border border-[#5ebb3e]/40 text-[#5ebb3e] text-xs font-bold">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Choice Selected</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-[#ffb606]/15 border border-[#ffb606]/40 text-[#ffb606] text-xs font-bold">
                      <span>Selection Required</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Candidate Radio Group Grid */}
              <div
                role="radiogroup"
                aria-labelledby={`position-title-${position.id}`}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {position.candidates.map((candidate) => {
                  const isSelected = selectedCandidateId === candidate.id;
                  const avatarSrc = getFullAvatarUrl(candidate.avatar_url);

                  return (
                    <div
                      key={candidate.id}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => handleSelectCandidate(position.id, candidate.id)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          handleSelectCandidate(position.id, candidate.id);
                        }
                      }}
                      className={`relative rounded-xl p-5 cursor-pointer transition-all duration-200 border flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-[#ffb606] focus-visible:outline-none ${
                        isSelected
                          ? 'bg-[#1c334a] border-[#418ccd] shadow-lg shadow-[#418ccd]/20 ring-1 ring-[#418ccd]'
                          : 'bg-[#16283b]/80 hover:bg-[#1c334a]/80 border-[#2a4856] hover:border-[#418ccd]/40'
                      }`}
                    >
                      {/* Candidate Info Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center space-x-3.5">
                          {/* Candidate Avatar with Image fallback */}
                          <div
                            className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-base overflow-hidden border flex-shrink-0 transition-colors ${
                              isSelected
                                ? 'border-[#418ccd] bg-[#418ccd] text-white shadow-md shadow-[#418ccd]/30'
                                : 'border-[#2a4856] bg-[#0e1e2e] text-slate-300'
                            }`}
                          >
                            {avatarSrc ? (
                              <img
                                src={avatarSrc}
                                alt={candidate.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to icon on error
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <User className="w-7 h-7" aria-hidden="true" />
                            )}
                          </div>

                          <div>
                            <h3 className="text-base font-bold text-white leading-snug">
                              {candidate.name}
                            </h3>
                            {candidate.running_mate && (
                              <p className="text-xs text-[#ffb606] font-medium mt-0.5">
                                Vice: {candidate.running_mate}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Custom Accessible Radio Circle with NLC Colors */}
                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 ${
                            isSelected
                              ? 'bg-[#418ccd] border-[#418ccd] text-white'
                              : 'border-slate-500 bg-[#0e1e2e]'
                          }`}
                          aria-hidden="true"
                        >
                          {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Tagline */}
                      {candidate.tagline && (
                        <p className="text-xs sm:text-sm text-slate-200 italic mb-4 line-clamp-2">
                          "{candidate.tagline}"
                        </p>
                      )}

                      {/* Manifesto Button & State Indicator */}
                      <div className="pt-3 border-t border-[#2a4856] flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveManifestoCandidate(candidate);
                          }}
                          className="text-xs sm:text-sm text-[#418ccd] hover:text-[#5ca3db] flex items-center space-x-1.5 font-medium hover:underline focus-visible:ring-2 focus-visible:ring-[#ffb606] rounded p-1"
                        >
                          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>View Manifesto</span>
                        </button>

                        <span
                          className={`text-xs font-semibold ${
                            isSelected ? 'text-[#ffb606]' : 'text-slate-400'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Click to select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Bottom Sticky Submission Bar with NLC Theme */}
      <div className="sticky bottom-4 z-30 p-4 sm:p-5 rounded-2xl glass-panel border border-[#2a4856] shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#418ccd]/20 text-[#418ccd] flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {isBallotComplete ? 'All Portfolios Completed' : 'Ballot Incomplete'}
            </div>
            <div className="text-xs text-slate-300">
              {isBallotComplete
                ? 'Review your choices before submitting your final ballot.'
                : `Please make a selection for all ${totalPositions} portfolios.`}
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!isBallotComplete || submitting}
          onClick={() => setShowReviewModal(true)}
          className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-gradient-to-r from-[#5ebb3e] to-[#418ccd] hover:from-[#6ed349] hover:to-[#5ca3db] text-white font-bold flex items-center justify-center space-x-2 shadow-lg shadow-[#5ebb3e]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 min-h-[48px] focus-visible:ring-2 focus-visible:ring-[#ffb606]"
        >
          <span>Review & Submit Ballot</span>
          <ArrowRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* MANIFESTO MODAL */}
      {activeManifestoCandidate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manifesto-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div className="glass-panel max-w-lg w-full rounded-2xl p-6 sm:p-8 border border-[#2a4856] shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setActiveManifestoCandidate(null)}
              aria-label="Close Manifesto"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-[#0e1e2e] hover:bg-[#2a4856] transition-colors focus-visible:ring-2 focus-visible:ring-[#418ccd]"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="flex items-center space-x-3.5 mb-4">
              <div className="w-14 h-14 rounded-xl bg-[#418ccd]/20 text-[#418ccd] flex items-center justify-center font-bold overflow-hidden border border-[#2a4856] flex-shrink-0">
                {activeManifestoCandidate.avatar_url ? (
                  <img
                    src={getFullAvatarUrl(activeManifestoCandidate.avatar_url) || ''}
                    alt={activeManifestoCandidate.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-7 h-7" aria-hidden="true" />
                )}
              </div>
              <div>
                <h3 id="manifesto-modal-title" className="text-lg font-bold text-white">
                  {activeManifestoCandidate.name}
                </h3>
                {activeManifestoCandidate.running_mate && (
                  <p className="text-xs text-[#ffb606]">
                    Running Mate: {activeManifestoCandidate.running_mate}
                  </p>
                )}
              </div>
            </div>

            {activeManifestoCandidate.tagline && (
              <div className="p-3 rounded-lg bg-[#0e1e2e] border border-[#2a4856] text-xs sm:text-sm italic text-slate-200 mb-4">
                "{activeManifestoCandidate.tagline}"
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 text-sm text-slate-200 leading-relaxed space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#418ccd]">
                Official Candidate Manifesto
              </h4>
              {activeManifestoCandidate.manifesto ? (
                activeManifestoCandidate.manifesto.split('\n').filter(Boolean).map((paragraph, pIdx) => (
                  <p key={pIdx} className="text-slate-300">{paragraph}</p>
                ))
              ) : (
                <p className="text-slate-400 italic">No manifesto text has been submitted for this candidate.</p>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#2a4856] flex justify-end">
              <button
                type="button"
                onClick={() => setActiveManifestoCandidate(null)}
                className="py-2.5 px-5 rounded-xl bg-[#2a4856] hover:bg-[#365b6d] text-white text-xs sm:text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#418ccd]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINAL BALLOT REVIEW MODAL */}
      {showReviewModal && electionData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
        >
          <div className="glass-panel max-w-xl w-full rounded-2xl p-6 sm:p-8 border border-[#2a4856] shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#5ebb3e]/20 text-[#5ebb3e] flex items-center justify-center">
                <Vote className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 id="review-modal-title" className="text-lg font-bold text-white">
                  Confirm Ballot Selections
                </h3>
                <p className="text-xs text-slate-300">
                  Please verify your candidate selections before submitting.
                </p>
              </div>
            </div>

            {/* Warning Alert */}
            <div className="mb-4 p-3.5 rounded-xl bg-amber-950/50 border border-[#ffb606]/40 flex items-start space-x-2.5 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-[#ffb606] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong>Final Submission:</strong> Once submitted, your vote is recorded anonymously and your account is marked as voted. You cannot change your choices afterwards.
              </div>
            </div>

            {/* Selected Candidates Summary List with Position Numbers & Thumbnails */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 py-2">
              {electionData.positions.map((pos, pIdx) => {
                const selectedCandId = selections[pos.id];
                const candidate = pos.candidates.find((c) => c.id === selectedCandId);
                const avatarSrc = getFullAvatarUrl(candidate?.avatar_url || null);

                return (
                  <div
                    key={pos.id}
                    className="p-3.5 rounded-xl bg-[#0e1e2e] border border-[#2a4856] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 rounded-full bg-[#418ccd]/20 text-[#418ccd] text-[11px] font-bold flex items-center justify-center font-mono flex-shrink-0">
                        {pIdx + 1}
                      </span>
                      <div className="w-9 h-9 rounded-lg bg-[#16283b] overflow-hidden flex items-center justify-center border border-[#2a4856] flex-shrink-0">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt={candidate?.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {pos.title}
                        </div>
                        <div className="text-sm font-bold text-white">
                          {candidate?.name || 'No selection'}
                        </div>
                        {candidate?.running_mate && (
                          <div className="text-xs text-[#ffb606]">
                            Vice: {candidate.running_mate}
                          </div>
                        )}
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-[#5ebb3e] flex-shrink-0" aria-hidden="true" />
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 pt-4 border-t border-[#2a4856] flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#2a4856] hover:bg-[#365b6d] text-slate-200 font-semibold text-xs sm:text-sm transition-colors focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Go Back & Modify
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleFinalSubmission}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#5ebb3e] to-[#418ccd] hover:from-[#6ed349] hover:to-[#5ca3db] text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-[#5ebb3e]/25 transition-all focus-visible:ring-2 focus-visible:ring-[#ffb606] min-h-[44px]"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Submitting Vote...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" aria-hidden="true" />
                    <span>Confirm & Submit Ballot</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
