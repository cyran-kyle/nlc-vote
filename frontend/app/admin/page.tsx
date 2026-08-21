'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  ShieldAlert,
  Users,
  Vote,
  BarChart3,
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  Trash2,
  RotateCcw,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Lock,
  LogOut,
  Send,
  Sparkles,
  Info,
  UserCheck,
  UserX,
  Clock,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Camera,
  User,
  Megaphone,
  Trophy,
  Radio,
} from 'lucide-react';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface DashboardStats {
  metrics: {
    total_registered: number;
    total_voted: number;
    total_pending: number;
    total_pending_approval: number;
    total_approved: number;
    total_rejected: number;
    turnout_percentage: number;
    total_positions: number;
    total_candidates: number;
    total_votes_recorded: number;
    is_registration_open: boolean;
    is_polls_open: boolean;
  };
  levanter: {
    api_url: string;
    api_key_set: boolean;
    mock_mode: boolean;
  };
  recent_logs: Array<{
    id: number;
    event_type: string;
    description: string;
    ip_address: string;
    created_at: string;
  }>;
}

interface Voter {
  student_id: string;
  full_name: string;
  department: string;
  level: string;
  phone_number: string;
  has_voted: number | boolean;
  status: 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';
  created_at: string;
}

interface Candidate {
  id: string;
  position_id: string;
  full_name: string;
  running_mate: string | null;
  tagline: string | null;
  manifesto: string | null;
  avatar_url: string | null;
  display_order: number;
}

interface Position {
  id: string;
  election_id: string;
  title: string;
  description: string | null;
  display_order: number;
  candidates: Candidate[];
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'voters' | 'nominees' | 'gateway'>('overview');

  // Stats & Data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [pendingVoters, setPendingVoters] = useState<Voter[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [togglingReg, setTogglingReg] = useState(false);
  const [togglingPolls, setTogglingPolls] = useState(false);
  const [broadcastingType, setBroadcastingType] = useState<'open' | 'closed' | 'winners' | null>(null);
  const [showWinnersModal, setShowWinnersModal] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add Single Student Modal
  const [showAddVoterModal, setShowAddVoterModal] = useState(false);
  const [newVoter, setNewVoter] = useState({
    student_id: '',
    full_name: '',
    department: 'Computer Science',
    level: 'Level 100',
    phone_number: '',
  });

  // Add Position / Candidate Modals
  const [showAddPositionModal, setShowAddPositionModal] = useState(false);
  const [newPositionTitle, setNewPositionTitle] = useState('');
  const [newPositionDesc, setNewPositionDesc] = useState('');

  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [targetPositionId, setTargetPositionId] = useState('');
  const [newCandidate, setNewCandidate] = useState({
    full_name: '',
    running_mate: '',
    tagline: '',
    manifesto: '',
  });

  // WhatsApp Test State
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);

  // Candidate Photo Upload State
  const [uploadingCandidateId, setUploadingCandidateId] = useState<string | null>(null);
  const [newCandidatePhoto, setNewCandidatePhoto] = useState<File | null>(null);

  // File Upload Ref
  const voterFileInputRef = useRef<HTMLInputElement>(null);
  const nomineeFileInputRef = useRef<HTMLInputElement>(null);

  // Check saved token on mount
  useEffect(() => {
    const savedToken = sessionStorage.getItem('nlc_admin_jwt');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Authenticated fetch helper
  const authFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token || ''}`,
      };
      return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    },
    [token]
  );

  // Load Dashboard Stats
  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authFetch('/admin/stats');
      const data = await res.json();
      if (res.ok) {
        setStats(data.data);
      } else if (res.status === 401) {
        setToken(null);
        sessionStorage.removeItem('nlc_admin_jwt');
      }
    } catch (err) {
      console.error('Failed to load admin stats', err);
    }
  }, [authFetch, token]);

  // Load Voters
  const loadVoters = useCallback(async () => {
    if (!token) return;
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('search', searchQuery);
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);

      const res = await authFetch(`/admin/voters?${queryParams.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setVoters(data.data);
      }
    } catch (err) {
      console.error('Failed to load voters', err);
    }
  }, [authFetch, token, searchQuery, statusFilter]);

  // Load Pending Self-Registrations
  const loadPendingApprovals = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authFetch('/admin/registrations/pending');
      const data = await res.json();
      if (res.ok) {
        setPendingVoters(data.data);
      }
    } catch (err) {
      console.error('Failed to load pending registrations', err);
    }
  }, [authFetch, token]);

  // Load Positions & Candidates
  const loadPositions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authFetch('/admin/nominees');
      const data = await res.json();
      if (res.ok) {
        setPositions(data.data);
      }
    } catch (err) {
      console.error('Failed to load positions', err);
    }
  }, [authFetch, token]);

  // Initial and reactive data fetching
  useEffect(() => {
    if (token) {
      loadStats();
      loadVoters();
      loadPendingApprovals();
      loadPositions();
    }
  }, [token, loadStats, loadVoters, loadPendingApprovals, loadPositions]);

  // Admin Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      setToken(data.data.token);
      sessionStorage.setItem('nlc_admin_jwt', data.data.token);
      showAlert('success', 'Authenticated as Election Administrator.');
    } catch (err: any) {
      setAuthError(err.message || 'Invalid administrator password.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    sessionStorage.removeItem('nlc_admin_jwt');
    showAlert('success', 'Logged out successfully.');
  };

  // Toggle Election Voting Polls Open/Closed
  const handleTogglePolls = async () => {
    const currentStatus = Boolean(stats?.metrics?.is_polls_open);
    const nextStatus = !currentStatus;
    setTogglingPolls(true);

    try {
      const res = await authFetch('/admin/election/toggle-polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_open: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showAlert('success', data.message);
      loadStats();
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      setTogglingPolls(false);
    }
  };

  // Broadcast Polls Open Notice to All Voters
  const handleBroadcastPollsOpen = async () => {
    if (!confirm('Broadcast "Polls Open" notification with voting portal link to ALL registered voters on WhatsApp?')) {
      return;
    }
    setBroadcastingType('open');
    try {
      const res = await authFetch('/admin/broadcast/polls-open', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showAlert('success', data.message);
      loadStats();
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      setBroadcastingType(null);
    }
  };

  // Broadcast Polls Closed Notice to All Voters
  const handleBroadcastPollsClosed = async () => {
    if (!confirm('Broadcast "Polls Closed" notification with live results link to ALL registered voters on WhatsApp?')) {
      return;
    }
    setBroadcastingType('closed');
    try {
      const res = await authFetch('/admin/broadcast/polls-closed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showAlert('success', data.message);
      loadStats();
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      setBroadcastingType(null);
    }
  };

  // Broadcast Official Election Winners to All Voters
  const handleBroadcastWinners = async () => {
    setBroadcastingType('winners');
    try {
      const res = await authFetch('/admin/broadcast/winners', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showAlert('success', data.message);
      setShowWinnersModal(false);
      loadStats();
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      setBroadcastingType(null);
    }
  };

  // Toggle Self-Registration Portal Open/Closed
  const handleToggleRegistration = async () => {
    const currentStatus = Boolean(stats?.metrics?.is_registration_open);
    const nextStatus = !currentStatus;
    setTogglingReg(true);

    try {
      const res = await authFetch('/admin/registration/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_open: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showAlert('success', data.message);
      loadStats();
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      setTogglingReg(false);
    }
  };

  // Approve Single Registration
  const handleApproveRegistration = async (studentId: string) => {
    setApprovingId(studentId);
    try {
      const res = await authFetch(`/admin/registrations/${encodeURIComponent(studentId)}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showAlert('success', data.message);
      loadPendingApprovals();
      loadStats();
      loadVoters();
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      setApprovingId(null);
    }
  };

  // Reject Single Registration
  const handleRejectRegistration = async (studentId: string) => {
    if (!confirm(`Are you sure you want to reject registration for ${studentId}?`)) return;
    setApprovingId(studentId);
    try {
      const res = await authFetch(`/admin/registrations/${encodeURIComponent(studentId)}/reject`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showAlert('success', data.message);
      loadPendingApprovals();
      loadStats();
      loadVoters();
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      setApprovingId(null);
    }
  };

  // Bulk Approve All Pending
  const handleBulkApprove = async () => {
    if (!confirm(`Approve all ${pendingVoters.length} pending student registrations? Each student will receive a WhatsApp confirmation.`)) return;
    setLoading(true);
    try {
      const res = await authFetch('/admin/registrations/bulk-approve', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showAlert('success', data.message);
      loadPendingApprovals();
      loadStats();
      loadVoters();
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset Single Voter
  const handleResetVoter = async (studentId: string) => {
    if (!confirm(`Reset voting status for student ${studentId}?`)) return;
    try {
      const res = await authFetch(`/admin/voters/${encodeURIComponent(studentId)}/reset`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showAlert('success', data.message);
      loadVoters();
      loadStats();
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  // Delete Single Voter
  const handleDeleteVoter = async (studentId: string) => {
    if (!confirm(`Permanently remove student ${studentId} from voter register?`)) return;
    try {
      const res = await authFetch(`/admin/voters/${encodeURIComponent(studentId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showAlert('success', data.message);
      loadVoters();
      loadStats();
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  // Add Single Voter Form Submit
  const handleAddVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/admin/voters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVoter),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showAlert('success', data.message);
      setShowAddVoterModal(false);
      setNewVoter({
        student_id: '',
        full_name: '',
        department: 'Computer Science',
        level: 'Level 100',
        phone_number: '',
      });
      loadVoters();
      loadStats();
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  // Bulk Import Voters from File
  const handleVoterFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    showAlert('success', 'Uploading and importing voter register...');
    try {
      const res = await authFetch('/admin/voters/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showAlert('success', data.message);
      loadVoters();
      loadStats();
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      if (voterFileInputRef.current) voterFileInputRef.current.value = '';
    }
  };

  // Generate and Download Voter Template XLSX
  const downloadVoterTemplate = () => {
    const templateData = [
      {
        'Student ID': 'NLC/2026/001',
        'Full Name': 'Samuel Kwaku Boakye',
        Department: 'Computer Science',
        Level: 'Level 300',
        'WhatsApp Number': '233540001122',
      },
      {
        'Student ID': 'NLC/2026/002',
        'Full Name': 'Akua Afriyie Osei',
        Department: 'Business Administration',
        Level: 'Level 200',
        'WhatsApp Number': '233550002233',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Voter Register');
    XLSX.writeFile(wb, 'NLC_Voter_Import_Template.xlsx');
  };

  // Export Voter Ledger to XLSX
  const handleExportVoters = async () => {
    try {
      const res = await authFetch('/admin/voters/export');
      if (!res.ok) throw new Error('Failed to export voter ledger');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NLC_Voter_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  // Export Results to XLSX
  const handleExportResults = async () => {
    try {
      const res = await authFetch('/admin/results/export');
      if (!res.ok) throw new Error('Failed to export election results');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NLC_Election_Results_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  // Delete Candidate
  const handleDeleteCandidate = async (candidateId: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    try {
      const res = await authFetch(`/admin/candidates/${candidateId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showAlert('success', data.message);
      loadPositions();
      loadStats();
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  // Delete Position
  const handleDeletePosition = async (positionId: string) => {
    if (!confirm('Delete this position and all its candidates?')) return;
    try {
      const res = await authFetch(`/admin/positions/${positionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showAlert('success', data.message);
      loadPositions();
      loadStats();
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  // Create Position
  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/admin/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPositionTitle,
          description: newPositionDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showAlert('success', data.message);
      setShowAddPositionModal(false);
      setNewPositionTitle('');
      setNewPositionDesc('');
      loadPositions();
      loadStats();
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  // Create Candidate
  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position_id: targetPositionId,
          ...newCandidate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // If a candidate photo was selected, upload it immediately
      if (newCandidatePhoto && data.data?.id) {
        const photoFormData = new FormData();
        photoFormData.append('photo', newCandidatePhoto);
        await authFetch(`/admin/candidates/${data.data.id}/photo`, {
          method: 'POST',
          body: photoFormData,
        });
      }

      showAlert('success', data.message);
      setShowAddCandidateModal(false);
      setNewCandidate({
        full_name: '',
        running_mate: '',
        tagline: '',
        manifesto: '',
      });
      setNewCandidatePhoto(null);
      loadPositions();
      loadStats();
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  // Upload Candidate Photo Directly
  const handleCandidatePhotoUpload = async (candidateId: string, file: File) => {
    if (!file) return;
    setUploadingCandidateId(candidateId);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await authFetch(`/admin/candidates/${candidateId}/photo`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to upload photo');
      showAlert('success', 'Candidate photo updated successfully.');
      loadPositions();
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to upload candidate photo.');
    } finally {
      setUploadingCandidateId(null);
    }
  };

  // Bulk Import Nominees File
  const handleNomineeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    showAlert('success', 'Importing portfolios and nominees...');
    try {
      const res = await authFetch('/admin/nominees/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showAlert('success', data.message);
      loadPositions();
      loadStats();
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      if (nomineeFileInputRef.current) nomineeFileInputRef.current.value = '';
    }
  };

  const downloadNomineeTemplate = () => {
    const templateData = [
      {
        Position: 'SRC President & Vice President',
        'Candidate Name': 'Emmanuel Kwesi Mensah',
        'Running Mate': 'Abena Serwaa Boateng',
        Tagline: 'Leadership of Integrity and Vision',
        Manifesto: 'Expansion of campus Wi-Fi infrastructure and hostel shuttle services.',
      },
      {
        Position: 'General Secretary',
        'Candidate Name': 'Grace Akosua Antwi',
        'Running Mate': '',
        Tagline: 'Accountability and Prompt Communication',
        Manifesto: 'Digitization of student grievance resolutions within 24 hours.',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nominees');
    XLSX.writeFile(wb, 'NLC_Nominees_Import_Template.xlsx');
  };

  // Test WhatsApp Gateway
  const handleTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      showAlert('error', 'Please enter a recipient WhatsApp number.');
      return;
    }

    setTestingWhatsApp(true);
    try {
      const res = await authFetch('/admin/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: testPhone, test_message: testMessage || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showAlert('success', data.message);
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      setTestingWhatsApp(false);
    }
  };

  // Render Login Modal if not authenticated
  if (!token) {
    return (
      <div className="max-w-md mx-auto py-8 sm:py-12 px-4">
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white">Electoral Commission Admin</h1>
            <p className="text-xs text-slate-400">
              Enter the master administrative key to access the control panel.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1.5">
                Admin Secret Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm font-mono tracking-wider"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Authorize Access</span>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isRegOpen = Boolean(stats?.metrics?.is_registration_open);
  const isPollsOpen = Boolean(stats?.metrics?.is_polls_open);
  const pendingCount = stats?.metrics?.total_pending_approval ?? pendingVoters.length;

  return (
    <div className="max-w-7xl mx-auto py-2 sm:py-4 space-y-4 sm:space-y-6">
      {/* Top Banner Alert */}
      {alert && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between text-xs animate-fadeIn ${
            alert.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {alert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
            <span>{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-slate-400 hover:text-white ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">Electoral Admin Dashboard</h1>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold border border-cyan-500/30">
              COMMISSION CONSOLE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time management for New Life College 2026/2027 General Elections
          </p>
        </div>

        {/* Global Controls & Registration/Polls Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Polls Status Toggle Button */}
          <button
            onClick={handleTogglePolls}
            disabled={togglingPolls}
            className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center space-x-2 transition-all shadow-sm ${
              isPollsOpen
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
            }`}
            title="Toggle Live Voting Polls for Students"
          >
            {isPollsOpen ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-400" />
                <span>Polls: OPEN</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-red-400" />
                <span>Polls: CLOSED</span>
              </>
            )}
          </button>

          {/* Registration Portal Toggle Button */}
          <button
            onClick={handleToggleRegistration}
            disabled={togglingReg}
            className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center space-x-2 transition-all shadow-sm ${
              isRegOpen
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20'
            }`}
            title="Toggle Student Self-Registration Portal"
          >
            {isRegOpen ? (
              <>
                <ToggleRight className="w-4 h-4 text-cyan-400" />
                <span>Registration: OPEN</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-amber-400" />
                <span>Registration: CLOSED</span>
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-colors text-xs font-semibold flex items-center space-x-1.5"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Mobile Horizontally Scrollable) */}
      <div className="flex overflow-x-auto space-x-1 sm:space-x-2 p-1 bg-slate-900/80 rounded-xl border border-slate-800 scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-shrink-0 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
            activeTab === 'overview'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('approvals');
            loadPendingApprovals();
          }}
          className={`flex-shrink-0 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
            activeTab === 'approvals'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Approvals</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('voters')}
          className={`flex-shrink-0 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
            activeTab === 'voters'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Voter Ledger ({stats?.metrics?.total_registered ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('nominees')}
          className={`flex-shrink-0 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
            activeTab === 'nominees'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Vote className="w-3.5 h-3.5" />
          <span>Nominees & Positions</span>
        </button>

        <button
          onClick={() => setActiveTab('gateway')}
          className={`flex-shrink-0 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
            activeTab === 'gateway'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>WhatsApp Diagnostics</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6 animate-fadeIn">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Voters</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                {stats.metrics.total_registered}
              </div>
              <div className="text-[11px] text-cyan-400">
                {stats.metrics.total_approved} Approved • {stats.metrics.total_pending_approval} Pending Review
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ballots Cast</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                {stats.metrics.total_voted}
              </div>
              <div className="text-[11px] text-slate-400">
                Turnout: <strong className="text-white">{stats.metrics.turnout_percentage}%</strong>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Portfolios</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-400 font-mono">
                {stats.metrics.total_positions}
              </div>
              <div className="text-[11px] text-slate-400">
                {stats.metrics.total_candidates} Vetted Candidates
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Election State</span>
              <div className="flex items-center space-x-2">
                <span className={`text-lg sm:text-xl font-extrabold font-mono ${isPollsOpen ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPollsOpen ? 'POLLS OPEN' : 'POLLS CLOSED'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 pt-0.5">
                Registration: <span className={isRegOpen ? 'text-cyan-400 font-semibold' : 'text-amber-400 font-semibold'}>{isRegOpen ? 'OPEN' : 'CLOSED'}</span>
              </div>
            </div>
          </div>

          {/* Voter WhatsApp Broadcast Center */}
          <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Megaphone className="w-4 h-4 text-cyan-400" />
                  <span>Voter WhatsApp Broadcast Center</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Send mass updates and certified winners announcements directly to all approved voters' WhatsApp.
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 font-semibold self-start sm:self-auto flex items-center space-x-1">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>{stats.metrics.total_approved} Approved Voters Target</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Broadcast Polls Open */}
              <button
                onClick={handleBroadcastPollsOpen}
                disabled={broadcastingType !== null}
                className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-700/80 hover:border-emerald-500/50 text-left transition-all group flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Vote className="w-4 h-4" />
                  </div>
                  {broadcastingType === 'open' && <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-300">Broadcast Polls Open</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Dispatches the official voting link and step-by-step voting instructions to all voters.
                  </p>
                </div>
              </button>

              {/* Broadcast Polls Closed */}
              <button
                onClick={handleBroadcastPollsClosed}
                disabled={broadcastingType !== null}
                className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-700/80 hover:border-amber-500/50 text-left transition-all group flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  {broadcastingType === 'closed' && <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-300">Broadcast Polls Closed</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Informs voters that voting has concluded and shares the link to monitor live collation.
                  </p>
                </div>
              </button>

              {/* Broadcast Election Winners */}
              <button
                onClick={() => setShowWinnersModal(true)}
                disabled={broadcastingType !== null}
                className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-600/10 hover:from-amber-500/30 hover:to-yellow-600/20 border border-amber-500/40 text-left transition-all group flex flex-col justify-between space-y-3 shadow-lg shadow-amber-500/5"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                  {broadcastingType === 'winners' && <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-300 flex items-center space-x-1">
                    <span>Broadcast Official Winners</span>
                    <Sparkles className="w-3 h-3 text-yellow-400" />
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    Calculates leading candidates and announces newly elected SRC leaders to all voters.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Actions & Audit Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                <span>Executive Export Suite</span>
              </h3>
              <p className="text-xs text-slate-400">
                Download verified election artifacts formatted as Microsoft Excel spreadsheets.
              </p>

              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleExportVoters}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>Export Voter Ledger (.xlsx)</span>
                  </span>
                  <Download className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={handleExportResults}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    <span>Export Final Results (.xlsx)</span>
                  </span>
                  <Download className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Audit Logs */}
            <div className="lg:col-span-2 glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Recent System Audit Trail</span>
              </h3>
              <div className="divide-y divide-slate-800 max-h-64 overflow-y-auto pr-2 text-xs">
                {stats.recent_logs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-200">{log.event_type}</div>
                      <div className="text-slate-400 text-[11px]">{log.description}</div>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REGISTRATION APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <span>Self-Registered Students Awaiting Approval</span>
              </h2>
              <p className="text-xs text-slate-400">
                Review self-onboarded students and verify before enabling them to request WhatsApp OTP and cast ballots.
              </p>
            </div>

            {pendingVoters.length > 0 && (
              <button
                onClick={handleBulkApprove}
                disabled={loading}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow transition-all self-start sm:self-auto"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve All ({pendingVoters.length})</span>
              </button>
            )}
          </div>

          {pendingVoters.length === 0 ? (
            <div className="glass-panel rounded-2xl p-10 text-center border border-slate-800 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">All Caught Up!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                There are currently no self-registered student applications waiting for review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingVoters.map((voter) => (
                <div
                  key={voter.student_id}
                  className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{voter.full_name}</h4>
                      <div className="flex items-center space-x-2 text-xs text-cyan-400 font-mono mt-0.5">
                        <span>{voter.student_id}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-300 font-sans">{voter.department}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/40 flex-shrink-0">
                      PENDING REVIEW
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Academic Level:</span>
                      <span className="text-slate-200 font-medium">{voter.level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">WhatsApp Line:</span>
                      <span className="font-mono text-emerald-400 font-bold">+{voter.phone_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Submitted At:</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {new Date(voter.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => handleApproveRegistration(voter.student_id)}
                      disabled={approvingId === voter.student_id}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
                    >
                      {approvingId === voter.student_id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Approve & Notify</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleRejectRegistration(voter.student_id)}
                      disabled={approvingId === voter.student_id}
                      className="py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center justify-center space-x-1 transition-colors disabled:opacity-50"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VOTER LEDGER */}
      {activeTab === 'voters' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Actions & Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID, Name, Department, or Phone..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All Voters</option>
                <option value="approved">Approved Voters</option>
                <option value="pending_approval">Pending Review</option>
                <option value="rejected">Rejected</option>
                <option value="voted">Voted Only</option>
                <option value="pending">Pending Vote</option>
              </select>
            </div>

            {/* Excel & Add Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={downloadVoterTemplate}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                title="Download Excel Template"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Voter Template</span>
              </button>

              <label className="p-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Import Excel</span>
                <input
                  ref={voterFileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleVoterFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => setShowAddVoterModal(true)}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Student</span>
              </button>
            </div>
          </div>

          {/* Responsive Voters Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Department & Level</th>
                    <th className="py-3 px-4">WhatsApp Phone</th>
                    <th className="py-3 px-4">Accreditation</th>
                    <th className="py-3 px-4">Voting Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {voters.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No voter records found matching your query.
                      </td>
                    </tr>
                  ) : (
                    voters.map((voter) => (
                      <tr key={voter.student_id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-cyan-400">{voter.student_id}</td>
                        <td className="py-3 px-4 font-semibold text-white">{voter.full_name}</td>
                        <td className="py-3 px-4 text-slate-300">
                          {voter.department} <span className="text-slate-500">({voter.level})</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400">+{voter.phone_number}</td>
                        <td className="py-3 px-4">
                          {voter.status === 'APPROVED' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40">
                              APPROVED
                            </span>
                          )}
                          {voter.status === 'PENDING_APPROVAL' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/40">
                              PENDING
                            </span>
                          )}
                          {voter.status === 'REJECTED' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/40">
                              REJECTED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {Boolean(voter.has_voted) ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40">
                              VOTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700">
                              NOT VOTED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {voter.status === 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => handleApproveRegistration(voter.student_id)}
                              title="Approve Voter"
                              className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {Boolean(voter.has_voted) && (
                            <button
                              onClick={() => handleResetVoter(voter.student_id)}
                              title="Reset Voting Status (Allow voting again for testing)"
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteVoter(voter.student_id)}
                            title="Delete Student"
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NOMINEES & POSITIONS */}
      {activeTab === 'nominees' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">Election Portfolios & Nominees</h2>
              <p className="text-xs text-slate-400">
                Manage positions, candidates, running mates, and manifestos.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={downloadNomineeTemplate}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Nominee Template</span>
              </button>

              <label className="p-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Import Nominees</span>
                <input
                  ref={nomineeFileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleNomineeFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => setShowWinnersModal(true)}
                className="p-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center space-x-1.5 shadow transition-all"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Broadcast Winners</span>
              </button>

              <button
                onClick={() => setShowAddPositionModal(true)}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Position</span>
              </button>
            </div>
          </div>

          {/* Positions List */}
          <div className="space-y-6">
            {positions.map((pos) => (
              <div key={pos.id} className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">{pos.title}</h3>
                    {pos.description && <p className="text-xs text-slate-400">{pos.description}</p>}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setTargetPositionId(pos.id);
                        setShowAddCandidateModal(true);
                      }}
                      className="py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-1 border border-emerald-500/30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Candidate</span>
                    </button>

                    <button
                      onClick={() => handleDeletePosition(pos.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Delete Position"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Candidate Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pos.candidates.map((cand) => {
                    const avatarUrl = cand.avatar_url
                      ? cand.avatar_url.startsWith('http')
                        ? cand.avatar_url
                        : `${API_BASE_URL.replace('/api', '')}${cand.avatar_url}`
                      : null;

                    return (
                      <div
                        key={cand.id}
                        className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start space-x-3.5 min-w-0">
                          {/* Candidate Photo / Upload Avatar Section */}
                          <div className="relative group w-14 h-14 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={cand.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-6 h-6 text-slate-500" />
                            )}

                            {/* Hover / Click Photo Upload Overlay */}
                            <label
                              className={`absolute inset-0 bg-black/70 flex flex-col items-center justify-center cursor-pointer transition-opacity text-[10px] text-cyan-300 font-semibold p-1 ${
                                uploadingCandidateId === cand.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                              title="Upload / Change Photo"
                            >
                              {uploadingCandidateId === cand.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                              ) : (
                                <>
                                  <Camera className="w-3.5 h-3.5 mb-0.5" />
                                  <span>{cand.avatar_url ? 'Change' : 'Upload'}</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploadingCandidateId === cand.id}
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleCandidatePhotoUpload(cand.id, f);
                                }}
                              />
                            </label>
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{cand.full_name}</h4>
                            {cand.running_mate && (
                              <div className="text-xs text-cyan-400 truncate">Vice: {cand.running_mate}</div>
                            )}
                            {cand.tagline && (
                              <div className="text-xs italic text-slate-400 mt-1 line-clamp-1">"{cand.tagline}"</div>
                            )}
                            <div className="mt-1.5 flex items-center space-x-2">
                              <label className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer font-medium flex items-center space-x-1 underline">
                                <Camera className="w-3 h-3" />
                                <span>{cand.avatar_url ? 'Update Photo' : 'Add Photo'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={uploadingCandidateId === cand.id}
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleCandidatePhotoUpload(cand.id, f);
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteCandidate(cand.id)}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                          title="Delete Candidate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: WHATSAPP GATEWAY DIAGNOSTICS */}
      {activeTab === 'gateway' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
          <div className="glass-panel rounded-2xl p-5 sm:p-8 border border-slate-800 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Live WhatsApp Gateway Diagnostics</h2>
                <p className="text-xs text-slate-400">
                  Direct connectivity test and endpoint prober for Levanter Bot on Pterodactyl VPS.
                </p>
              </div>
            </div>

            {/* Gateway Specs */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Pterodactyl VPS Target:</span>
                <span className="font-mono text-cyan-400 font-bold">http://82.208.23.107:2030</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Endpoint:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  POST /api/send (lyfe00011/levanter)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">API Key:</span>
                <span className="font-mono text-slate-400">52d192da6e86b2e9121f15079b879c57</span>
              </div>
            </div>

            {/* Live Message Dispatch Form */}
            <form onSubmit={handleTestWhatsApp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Test Recipient Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="e.g. 233540001122"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Must start with 233 followed by 9 digits without '+'.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Custom Test Message (Optional)
                </label>
                <textarea
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Leave blank to send official diagnostic message..."
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={testingWhatsApp}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                {testingWhatsApp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching via Pterodactyl VPS...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Live WhatsApp Test Message</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SINGLE VOTER */}
      {showAddVoterModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Add Student to Voter Ledger</h3>
              <button onClick={() => setShowAddVoterModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVoter} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Student ID</label>
                <input
                  type="text"
                  required
                  value={newVoter.student_id}
                  onChange={(e) => setNewVoter({ ...newVoter, student_id: e.target.value.toUpperCase() })}
                  placeholder="e.g. NLC/2026/099"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newVoter.full_name}
                  onChange={(e) => setNewVoter({ ...newVoter, full_name: e.target.value })}
                  placeholder="e.g. Kofi Mensah"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={newVoter.department}
                    onChange={(e) => setNewVoter({ ...newVoter, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Level</label>
                  <select
                    value={newVoter.level}
                    onChange={(e) => setNewVoter({ ...newVoter, level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="Level 100">Level 100</option>
                    <option value="Level 200">Level 200</option>
                    <option value="Level 300">Level 300</option>
                    <option value="Level 400">Level 400</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">WhatsApp Number (Ghana 233...)</label>
                <input
                  type="text"
                  required
                  value={newVoter.phone_number}
                  onChange={(e) => setNewVoter({ ...newVoter, phone_number: e.target.value })}
                  placeholder="e.g. 233540001122"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVoterModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-bold"
                >
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD POSITION */}
      {showAddPositionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Create Electoral Position</h3>
              <button onClick={() => setShowAddPositionModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePosition} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Position Title</label>
                <input
                  type="text"
                  required
                  value={newPositionTitle}
                  onChange={(e) => setNewPositionTitle(e.target.value)}
                  placeholder="e.g. SRC President & Vice President"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={newPositionDesc}
                  onChange={(e) => setNewPositionDesc(e.target.value)}
                  placeholder="e.g. Highest executive office of the Student Council"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPositionModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white font-bold"
                >
                  Create Position
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CANDIDATE */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Add Nominated Candidate</h3>
              <button onClick={() => setShowAddCandidateModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCandidate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Candidate Full Name</label>
                <input
                  type="text"
                  required
                  value={newCandidate.full_name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, full_name: e.target.value })}
                  placeholder="e.g. Emmanuel Kwesi Mensah"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Running Mate (Optional)</label>
                <input
                  type="text"
                  value={newCandidate.running_mate}
                  onChange={(e) => setNewCandidate({ ...newCandidate, running_mate: e.target.value })}
                  placeholder="e.g. Abena Serwaa Boateng"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Campaign Tagline</label>
                <input
                  type="text"
                  value={newCandidate.tagline}
                  onChange={(e) => setNewCandidate({ ...newCandidate, tagline: e.target.value })}
                  placeholder="e.g. Service with Integrity and Vision"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Manifesto Summary</label>
                <textarea
                  rows={2}
                  value={newCandidate.manifesto}
                  onChange={(e) => setNewCandidate({ ...newCandidate, manifesto: e.target.value })}
                  placeholder="Key campaign promises..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              {/* Optional Photo Attachment */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Candidate Photo (Optional)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewCandidatePhoto(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30"
                  />
                  {newCandidatePhoto && (
                    <button
                      type="button"
                      onClick={() => setNewCandidatePhoto(null)}
                      className="p-1 text-slate-400 hover:text-red-400 text-xs"
                      title="Remove selected photo"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  You can also upload or change the photo anytime after adding the nominee.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCandidateModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold"
                >
                  Add Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: BROADCAST WINNERS CONFIRMATION */}
      {showWinnersModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full rounded-2xl p-6 sm:p-7 border border-amber-500/40 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Broadcast Official Election Winners</h3>
                <p className="text-xs text-slate-400">
                  Notify all approved voters on WhatsApp with the certified winners.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Recipients:</span>
                <span className="font-bold text-emerald-400">{stats?.metrics?.total_approved || 0} Approved Voters</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Ballots Cast:</span>
                <span className="font-bold text-white font-mono">{stats?.metrics?.total_voted || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Turnout:</span>
                <span className="font-bold text-[#ffb606] font-mono">{stats?.metrics?.turnout_percentage || 0}%</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 leading-relaxed flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Official Action:</strong> The system will automatically compute the winning candidate for every contested portfolio and dispatch a formatted WhatsApp message to all registered voters announcing their new SRC representatives.
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={broadcastingType === 'winners'}
                onClick={() => setShowWinnersModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={broadcastingType === 'winners'}
                onClick={handleBroadcastWinners}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/20"
              >
                {broadcastingType === 'winners' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching Broadcast...</span>
                  </>
                ) : (
                  <>
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>Confirm & Broadcast to All Voters</span>
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
