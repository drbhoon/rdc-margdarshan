'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  LogOut,
  User as UserIcon,
  Calendar,
  CheckSquare,
  BookOpen,
  ArrowRight,
  Shield,
  Activity,
  Users,
  Compass,
  FileText,
  AlertCircle,
  Mail,
  Send,
  CheckCircle,
  RefreshCw,
  UserPlus,
  Upload,
  Trash2,
  Download,
  Plus,
  X,
  Copy,
  Sparkles,
  FileSpreadsheet,
  FileCheck,
  Check,
  Zap,
  Star,
  ChevronDown,
  Link,
  ExternalLink,
} from 'lucide-react';

interface ParsedCandidate {
  employeeCode: string;
  name: string;
  email: string;
  role: 'MENTEE' | 'MENTOR';
  department: string;
  designation: string;
  isValid: boolean;
  validationError?: string;
}

export default function DashboardPage() {
  const { user, loading, login, logout, refreshUser } = useAuth();
  const router = useRouter();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');

  // Copy Link State
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Decline dialog state
  const [isDeclineOpen, setIsDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Admin matching & action triggers
  const [adminRunningMatch, setAdminRunningMatch] = useState(false);
  const [adminStatusMsg, setAdminStatusMsg] = useState('');

  // Candidate management modals
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [candidateActionLoading, setCandidateActionLoading] = useState(false);

  // Single candidate form
  const [newCandidate, setNewCandidate] = useState({
    employeeCode: '',
    name: '',
    email: '',
    role: 'MENTEE',
    department: 'Plant Operations & Maintenance',
    designation: 'Graduate Engineer Trainee',
    joinDate: new Date().toISOString().split('T')[0],
  });

  // Excel parsed candidates state
  const [parsedCandidates, setParsedCandidates] = useState<ParsedCandidate[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const fetchDashboardData = async () => {
    try {
      setDataLoading(true);
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      } else {
        setError('Failed to fetch dashboard metrics.');
      }
    } catch (e) {
      setError('Connection error.');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const getCandidateLink = (employeeCode: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/onboarding?emp=${encodeURIComponent(employeeCode)}`;
    }
    return `/onboarding?emp=${encodeURIComponent(employeeCode)}`;
  };

  const copyToClipboard = (text: string, codeId: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  const copyAllLinks = () => {
    if (!dashboardData?.allEmployees) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const text = dashboardData.allEmployees
      .map(
        (emp: any) =>
          `[${emp.role}] ${emp.name} (ID: ${emp.employeeCode}) - ${emp.email}\nPersonalized Onboarding Link: ${origin}/onboarding?emp=${encodeURIComponent(emp.employeeCode)}`
      )
      .join('\n\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  const handleRespondMatch = async (action: 'ACCEPT' | 'DECLINE') => {
    if (!dashboardData?.pair) return;
    setError('');
    setSubmittingResponse(true);

    try {
      const res = await fetch(`/api/pair/${dashboardData.pair.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          declineReason: action === 'DECLINE' ? declineReason : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsDeclineOpen(false);
        setDeclineReason('');
        await fetchDashboardData();
        await refreshUser();
      } else {
        setError(data.error || 'Failed to update response.');
      }
    } catch (e) {
      setError('Network failure.');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const runAdminAutoMatching = async () => {
    setAdminRunningMatch(true);
    setAdminStatusMsg('');
    setError('');

    try {
      const res = await fetch('/api/admin/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (res.ok) {
        setAdminStatusMsg(
          `AI Matching computed successfully! Created ${data.pairsCreated} pairs with Competency Cascade Matrix scores.`
        );
        await fetchDashboardData();
      } else {
        setError(data.error || 'Failed to run matching.');
      }
    } catch (e) {
      setError('Network error during auto-matching.');
    } finally {
      setAdminRunningMatch(false);
    }
  };

  // Add single candidate
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidate.employeeCode || !newCandidate.name || !newCandidate.email) return;
    setCandidateActionLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCandidate),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddCandidateOpen(false);
        setNewCandidate({
          employeeCode: '',
          name: '',
          email: '',
          role: 'MENTEE',
          department: 'Plant Operations & Maintenance',
          designation: 'Graduate Engineer Trainee',
          joinDate: new Date().toISOString().split('T')[0],
        });
        setAdminStatusMsg(`Candidate ${data.candidate.name} (${data.candidate.employeeCode}) added! Personalized link generated.`);
        await fetchDashboardData();
      } else {
        setError(data.error || 'Failed to add candidate.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setCandidateActionLoading(false);
    }
  };

  // Generate and Download Excel Template
  const downloadExcelTemplate = () => {
    const templateData = [
      {
        EmployeeCode: 'EMP301',
        FullName: 'Rohit Verma',
        Email: 'rohit.verma@corp.com',
        Role: 'MENTEE',
        Department: 'Plant Engineering & TPM',
        Designation: 'Graduate Engineer Trainee',
      },
      {
        EmployeeCode: 'EMP302',
        FullName: 'Sneha Rao',
        Email: 'sneha.rao@corp.com',
        Role: 'MENTEE',
        Department: 'Sourcing & Commercial Contracts',
        Designation: 'Associate Commercial Buyer',
      },
      {
        EmployeeCode: 'EMP303',
        FullName: 'Aditya Kulkarni',
        Email: 'aditya.k@corp.com',
        Role: 'MENTEE',
        Department: 'Plant Reliability & EHS',
        Designation: 'Safety & EHS Officer',
      },
      {
        EmployeeCode: 'EMP401',
        FullName: 'Rajesh Nambiar',
        Email: 'rajesh.nambiar@corp.com',
        Role: 'MENTOR',
        Department: 'Asset Care & Reliability',
        Designation: 'Chief Maintenance Manager',
      },
      {
        EmployeeCode: 'EMP402',
        FullName: 'Shalini Menon',
        Email: 'shalini.menon@corp.com',
        Role: 'MENTOR',
        Department: 'Strategic Sourcing & Vendor Mgmt',
        Designation: 'VP Procurement & Sourcing',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
    XLSX.writeFile(wb, 'Margdarshan_Candidate_Template.xlsx');
  };

  // Download CSV Template
  const downloadCsvTemplate = () => {
    const csvContent =
      'EmployeeCode,FullName,Email,Role,Department,Designation\n' +
      'EMP301,Rohit Verma,rohit.verma@corp.com,MENTEE,Plant Engineering & TPM,Graduate Engineer Trainee\n' +
      'EMP302,Sneha Rao,sneha.rao@corp.com,MENTEE,Sourcing & Commercial Contracts,Associate Commercial Buyer\n' +
      'EMP303,Aditya Kulkarni,aditya.k@corp.com,MENTEE,Plant Reliability & EHS,Safety & EHS Officer\n' +
      'EMP401,Rajesh Nambiar,rajesh.nambiar@corp.com,MENTOR,Asset Care & Reliability,Chief Maintenance Manager\n' +
      'EMP402,Shalini Menon,shalini.menon@corp.com,MENTOR,Strategic Sourcing & Vendor Mgmt,VP Procurement & Sourcing\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Margdarshan_Candidate_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Excel/CSV File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rawData.length === 0) {
          setError('The uploaded spreadsheet contains no rows.');
          return;
        }

        // Normalize headers
        const parsed: ParsedCandidate[] = rawData.map((row) => {
          const findVal = (keys: string[]) => {
            for (const k of Object.keys(row)) {
              const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (keys.includes(cleanKey)) return String(row[k]).trim();
            }
            return '';
          };

          const code = findVal(['employeecode', 'empid', 'code', 'id', 'employeeid']);
          const name = findVal(['fullname', 'name', 'employeename']);
          const email = findVal(['email', 'emailaddress', 'corporateemail', 'mail']);
          const roleRaw = findVal(['role', 'type', 'designationrole']).toUpperCase();
          const role: 'MENTEE' | 'MENTOR' = roleRaw.includes('MENTOR') ? 'MENTOR' : 'MENTEE';
          const department = findVal(['department', 'dept', 'division']) || 'Engineering';
          const designation = findVal(['designation', 'title', 'position']) || (role === 'MENTEE' ? 'Graduate Engineer Trainee' : 'Engineering Manager');

          const isValid = Boolean(code && name && email);
          let validationError = '';
          if (!code) validationError = 'Missing Employee Code';
          else if (!name) validationError = 'Missing Name';
          else if (!email) validationError = 'Missing Email';

          return {
            employeeCode: code,
            name: name,
            email: email,
            role,
            department,
            designation,
            isValid,
            validationError,
          };
        });

        setParsedCandidates(parsed);
      } catch (err) {
        setError('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Pre-load sample engineering candidate roster
  const handleLoadSampleData = () => {
    setUploadedFileName('Sample_Engineering_Cohort.xlsx');
    setParsedCandidates([
      {
        employeeCode: 'EMP301',
        name: 'Rohit Verma',
        email: 'rohit.verma@corp.com',
        role: 'MENTEE',
        department: 'Plant Maintenance & TPM',
        designation: 'Graduate Engineer Trainee',
        isValid: true,
      },
      {
        employeeCode: 'EMP302',
        name: 'Sneha Rao',
        email: 'sneha.rao@corp.com',
        role: 'MENTEE',
        department: 'Sourcing & Commercial Contracts',
        designation: 'Associate Commercial Buyer',
        isValid: true,
      },
      {
        employeeCode: 'EMP303',
        name: 'Aditya Kulkarni',
        email: 'aditya.k@corp.com',
        role: 'MENTEE',
        department: 'Plant Reliability & EHS',
        designation: 'Safety & EHS Officer',
        isValid: true,
      },
      {
        employeeCode: 'EMP401',
        name: 'Rajesh Nambiar',
        email: 'rajesh.nambiar@corp.com',
        role: 'MENTOR',
        department: 'Asset Care & Reliability',
        designation: 'Chief Maintenance Manager',
        isValid: true,
      },
      {
        employeeCode: 'EMP402',
        name: 'Shalini Menon',
        email: 'shalini.menon@corp.com',
        role: 'MENTOR',
        department: 'Strategic Sourcing & Vendor Mgmt',
        designation: 'VP Procurement & Sourcing',
        isValid: true,
      },
    ]);
  };

  // Submit parsed candidates to database
  const handleConfirmImport = async () => {
    const validCandidates = parsedCandidates.filter((c) => c.isValid);
    if (validCandidates.length === 0) return;

    setCandidateActionLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates: validCandidates }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsExcelImportOpen(false);
        setParsedCandidates([]);
        setUploadedFileName('');
        setAdminStatusMsg(`Successfully imported ${data.count} candidates! Personalized intake links have been generated.`);
        await fetchDashboardData();
      } else {
        setError(data.error || 'Failed to import candidates.');
      }
    } catch (err) {
      setError('Connection error during import.');
    } finally {
      setCandidateActionLoading(false);
    }
  };

  // Reset database clean slate
  const handleResetDatabase = async () => {
    setCandidateActionLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_DATABASE' }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsResetConfirmOpen(false);
        setAdminStatusMsg(data.message);
        await fetchDashboardData();
      } else {
        setError(data.error || 'Failed to reset database.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setCandidateActionLoading(false);
    }
  };

  const getDiscLabel = (style: string | null | undefined) => {
    if (!style) return 'Pending Assessment';
    const map: Record<string, string> = {
      D: 'Dominance (Result-oriented, Direct)',
      I: 'Influence (Collaborative, Outgoing)',
      S: 'Steadiness (Patient, Empathetic)',
      C: 'Compliance (Analytical, Detail-oriented)',
    };
    if (style.includes('/')) {
      const parts = style.split('/');
      return `Hybrid ${style} Style (${map[parts[0]]?.split(' ')[0]} / ${map[parts[1]]?.split(' ')[0]})`;
    }
    return map[style] || style;
  };

  // Helper for user initials
  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 text-sm font-semibold tracking-wide">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const myPair = dashboardData?.pair;
  const isPairActive = myPair?.status === 'ACTIVE';
  const isMeMentee = myPair?.menteeCode === user?.employeeCode;
  const counterpart = isMeMentee ? myPair?.mentor : myPair?.mentee;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased flex flex-col font-sans">
      {/* ==================== TOP NAVIGATION BAR ==================== */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: Logo & Main Navigation */}
          <div className="flex items-center space-x-8">
            <div
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => router.push('/dashboard')}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">Margdarshan</span>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => router.push('/onboarding')}
                className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
              >
                My Profile & Onboarding
              </button>
              <button
                onClick={() => router.push('/resources')}
                className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
              >
                Resource Hub
              </button>
            </nav>
          </div>

          {/* Right: Role Switcher & User Profile */}
          <div className="flex items-center space-x-4">
            {/* Role Switcher Dropdown */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:border-slate-300 shadow-sm">
              <span className="text-slate-400 hidden sm:inline">Switch Role:</span>
              <select
                value={user?.employeeCode || ''}
                onChange={async (e) => {
                  if (e.target.value) {
                    await login(e.target.value);
                    window.location.reload();
                  }
                }}
                className="bg-transparent border-none text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none pr-1"
              >
                <option value="" disabled>Switch Persona...</option>
                <option value="EMP001">👑 Radhika Sen (Admin)</option>
                {dashboardData?.allEmployees?.map((e: any) => (
                  <option key={e.employeeCode} value={e.employeeCode}>
                    {e.role === 'MENTOR' ? '👔' : '🌱'} {e.name} ({e.role} - {e.employeeCode})
                  </option>
                ))}
                {(!dashboardData?.allEmployees || dashboardData.allEmployees.length === 0) && (
                  <>
                    <option value="EMP101">👔 Amit Sharma (Mentor)</option>
                    <option value="EMP102">👔 Priya Patel (Mentor)</option>
                    <option value="EMP201">🌱 Aarav Mehta (Mentee)</option>
                    <option value="EMP205">🌱 Vikram Shah (Mentee)</option>
                  </>
                )}
              </select>
            </div>

            {/* User Info & Avatar */}
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900">{user?.name}</div>
                <div className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                  {user?.role} • {user?.department}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-xs shadow-inner">
                {getUserInitials(user?.name)}
              </div>
              <button
                onClick={logout}
                title="Reset to Admin View"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ==================== MAIN WORKSPACE ==================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-700 font-bold hover:text-red-900">✕</button>
          </div>
        )}

        {/* ----------------- ADMIN DASHBOARD ----------------- */}
        {user?.role === 'ADMIN' && (
          <div className="space-y-8">
            {/* ==================== HERO & ACTION BANNER ==================== */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl text-white shadow-xl shadow-slate-900/10 border border-slate-800">
              {/* Subtle Background Mesh */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]"></div>

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-8 lg:p-10">
                {/* Left: Program Title & Action Buttons */}
                <div className="lg:col-span-8 space-y-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold tracking-wide uppercase mb-3">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                      Rolling 3-Month Cycle
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                      Program Administration
                    </h1>
                    <p className="text-slate-300 text-sm mt-2 max-w-2xl leading-relaxed">
                      Upload candidate spreadsheets, broadcast personalized onboarding invites, initiate AI-powered competency matching, and monitor telemetry across active cohorts.
                    </p>
                  </div>

                  {/* Action Buttons Bar */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {/* Add Single */}
                    <button
                      onClick={() => setIsAddCandidateOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold tracking-wide transition shadow-sm"
                    >
                      <UserPlus className="w-4 h-4 text-blue-300" />
                      + Add Single
                    </button>

                    {/* Upload Excel / Template */}
                    <button
                      onClick={() => setIsExcelImportOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold tracking-wide transition shadow-md shadow-emerald-900/40"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Upload Excel / Template
                    </button>

                    {/* 1. Broadcast Invites */}
                    <button
                      onClick={() => setIsBroadcastModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold tracking-wide transition shadow-md shadow-purple-900/40"
                    >
                      <Mail className="w-4 h-4" />
                      1. Broadcast Invites &amp; Links
                    </button>

                    {/* 2. Run AI Match */}
                    <button
                      onClick={runAdminAutoMatching}
                      disabled={adminRunningMatch}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white text-xs font-bold tracking-wide transition shadow-lg shadow-indigo-500/30 disabled:opacity-50"
                    >
                      <Zap className={`w-4 h-4 ${adminRunningMatch ? 'animate-spin' : ''}`} />
                      <span>{adminRunningMatch ? 'Running AI Match...' : '2. Run AI Match'}</span>
                    </button>

                    {/* Clean Roster */}
                    <button
                      onClick={() => setIsResetConfirmOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold tracking-wide transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clean Roster
                    </button>
                  </div>
                </div>

                {/* Right: Mentor-Mentee Feature Photo Card */}
                <div className="lg:col-span-4 flex justify-center">
                  <div className="relative group w-full max-w-sm">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-800 shadow-2xl">
                      <img
                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80"
                        alt="Mentor and Mentee Collaboration"
                        className="w-full h-48 object-cover object-top opacity-90 group-hover:scale-105 transition duration-500"
                      />
                      <div className="p-3.5 bg-slate-900/90 backdrop-blur border-t border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">Empowering Leaders</p>
                          <p className="text-[11px] text-slate-400">Collaborative Growth &amp; Mentorship</p>
                        </div>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {adminStatusMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between shadow-sm">
                <span>{adminStatusMsg}</span>
                <button onClick={() => setAdminStatusMsg('')} className="text-emerald-600 hover:text-emerald-900 font-bold ml-2">✕</button>
              </div>
            )}

            {/* ==================== KPI STAT CARDS ==================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Registered Mentees */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Mentees</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">{dashboardData?.totalMentees || 0}</span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active Roster</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              {/* Card 2: Available Mentors */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Mentors</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">{dashboardData?.totalMentors || 0}</span>
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Capacity Ready</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Shield className="w-6 h-6" />
                </div>
              </div>

              {/* Card 3: Total Pairings */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Pairings</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">{dashboardData?.pairs?.length || 0}</span>
                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Active Cohort</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* ==================== SECTION 1: CANDIDATE INTAKE & DIRECT LINKS ==================== */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Candidate Intake &amp; Direct Prefilled Links</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mentees &amp; Mentors registered in the program. Each candidate has a personalized link that auto-authenticates and pre-fills their profile.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyAllLinks}
                    disabled={!dashboardData?.allEmployees?.length}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedAll ? '✓ All Links Copied!' : '📋 Copy All Candidate Links'}</span>
                  </button>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                    {dashboardData?.allEmployees?.length || 0} Candidates
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-6">Candidate &amp; ID</th>
                      <th className="py-3.5 px-6">Role &amp; Dept</th>
                      <th className="py-3.5 px-6">Intake Status</th>
                      <th className="py-3.5 px-6">DISC Style</th>
                      <th className="py-3.5 px-6">Generated Intake Link (Auto-Auth)</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {(!dashboardData?.allEmployees || dashboardData.allEmployees.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                          No candidates registered yet. Click <strong>"Upload Excel / Template"</strong> or <strong>"+ Add Single"</strong> above to populate your roster.
                        </td>
                      </tr>
                    ) : (
                      dashboardData.allEmployees.map((emp: any) => {
                        const isComplete = emp.discStyle && (emp.topics?.length > 0 || emp.careerGoals);
                        const candidateUrl = getCandidateLink(emp.employeeCode);
                        const isCopied = copiedCode === emp.employeeCode;

                        return (
                          <tr key={emp.employeeCode} className="hover:bg-slate-50/60 transition">
                            <td className="py-4 px-6 font-semibold text-slate-900">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                                  {getUserInitials(emp.name)}
                                </div>
                                <div>
                                  <span>{emp.name}</span>
                                  <span className="block text-[10px] font-normal text-slate-400 font-mono">#{emp.employeeCode} &bull; {emp.designation}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-slate-600">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                emp.role === 'MENTEE' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {emp.role}
                              </span>
                              <span className="block text-[11px] text-slate-500 mt-0.5">{emp.department}</span>
                            </td>
                            <td className="py-4 px-6">
                              {isComplete ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Completed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending Form
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              {emp.discStyle ? (
                                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                                  Style {emp.discStyle}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Not taken</span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 max-w-xs">
                                <span className="text-[10px] font-mono text-slate-500 truncate flex-1 select-all">
                                  /onboarding?emp={emp.employeeCode}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(candidateUrl, emp.employeeCode)}
                                  title="Copy direct onboarding URL to clipboard"
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-900 bg-white border border-slate-200 hover:border-indigo-300 px-2 py-0.5 rounded shadow-2xs flex items-center gap-1 transition-all"
                                >
                                  {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                                </button>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={async () => {
                                  await login(emp.employeeCode);
                                  window.location.href = isComplete ? '/dashboard' : '/onboarding';
                                }}
                                className="px-3 py-1 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition inline-flex items-center gap-1"
                              >
                                <span>Open Form</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ==================== SECTION 2: ACTIVE COHORT PAIRINGS ==================== */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Active Cohort Pairings &amp; 12-Week Telemetry</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Pairs have rolling 3-month schedules. Track AI match score, weekly sessions, and survey feedback.</p>
                </div>
                <button
                  onClick={() => router.push('/resources')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                >
                  Resource Hub &rarr;
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-6">Mentor</th>
                      <th className="py-3.5 px-6">Mentee</th>
                      <th className="py-3.5 px-6">AI Match Score</th>
                      <th className="py-3.5 px-6">12-Week Sessions</th>
                      <th className="py-3.5 px-6">Survey Feedback</th>
                      <th className="py-3.5 px-6 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {(!dashboardData?.pairs || dashboardData.pairs.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                          No pairings generated yet. Upload candidates, ensure onboarding is complete, and click <strong>"2. Run AI Match"</strong>.
                        </td>
                      </tr>
                    ) : (
                      dashboardData.pairs.map((p: any) => {
                        const completedSessions = p.sessions?.filter((s: any) => s.status === 'COMPLETED').length || 0;
                        const progressPercent = Math.round((completedSessions / 12) * 100);
                        const surveyCount = p.surveys?.length || 0;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-2">
                                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700">
                                  {getUserInitials(p.mentor?.name)}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-900">{p.mentor?.name}</span>
                                  <span className="block text-[10px] text-slate-400">{p.mentor?.department} (DISC: {p.mentor?.discStyle || 'N/A'})</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                                  {getUserInitials(p.mentee?.name)}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-900">{p.mentee?.name}</span>
                                  <span className="block text-[10px] text-slate-400">{p.mentee?.department} (DISC: {p.mentee?.discStyle || 'N/A'})</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center gap-1 font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-xs border border-emerald-200">
                                ⚡ {(p.matchScore * 100).toFixed(0)}% Match
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                                  <span>Week {completedSessions} of 12</span>
                                  <span>{progressPercent}%</span>
                                </div>
                                <div className="w-32 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-indigo-600 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(progressPercent, 100)}%` }}></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-1 text-amber-500 font-bold">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>★ 4.9</span>
                                <span className="text-slate-400 font-normal text-[11px]">({surveyCount > 0 ? `${surveyCount} Logged` : 'Pending W6'})</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  p.status === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : p.status === 'DECLINED'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {p.status === 'ACTIVE' ? 'On Track' : p.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- MENTOR/MENTEE DASHBOARD ----------------- */}
        {user?.role !== 'ADMIN' && (
          <div className="space-y-8">
            {/* Case 1: No Pair is set up */}
            {!myPair && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto shadow-md space-y-4">
                <Compass className="h-12 w-12 text-slate-400 mx-auto" />
                <h2 className="text-xl font-bold text-slate-800">No Pairing Proposals Yet</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  The admin is currently matching cohort configurations. As soon as a match matching your goals and behavioral style is proposed, you will receive a notification here to review and accept/decline.
                </p>
                <div className="bg-slate-50 p-4 border border-slate-100 rounded-lg text-left text-xs text-slate-600">
                  <strong>Your Registered Details:</strong>
                  <ul className="mt-2 list-disc pl-4 space-y-1">
                    <li><strong>DISC Style:</strong> {getDiscLabel(user?.discStyle)}</li>
                    <li><strong>Goals:</strong> {user?.careerGoals || 'Not specified'}</li>
                    <li><strong>Competencies:</strong> {user?.topics?.length ? user.topics.join(', ') : 'None selected'}</li>
                    {user?.challenges && user.challenges.length > 0 && (
                      <li><strong>Personal Growth Challenges:</strong> {user.challenges.join(', ')}</li>
                    )}
                  </ul>
                </div>
                <div>
                  <button
                    onClick={() => router.push('/onboarding')}
                    className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-all"
                  >
                    <UserIcon className="h-4 w-4" />
                    Review & Edit Onboarding Profile
                  </button>
                </div>
              </div>
            )}

            {/* Case 2: Matching is proposed / waiting response */}
            {myPair && !isPairActive && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden max-w-2xl mx-auto">
                <div className="bg-slate-900 text-white p-6">
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider bg-slate-800 px-2 py-1 rounded">
                    Pairing Proposal Received
                  </span>
                  <h2 className="text-xl font-bold mt-2">
                    Proposed Pairing with {counterpart?.name}
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Match Compatibility Score: {(myPair.matchScore * 100).toFixed(0)}% based on DISC and Competency Cascade.
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                    <h3 className="text-xs font-bold uppercase text-slate-500">
                      About Your Counterpart
                    </h3>
                    <p className="text-sm font-semibold text-slate-800">{counterpart?.name}</p>
                    <p className="text-xs text-slate-600">
                      {counterpart?.designation} • {counterpart?.department}
                    </p>
                    <p className="text-xs text-slate-600 mt-2">
                      <strong>DISC Style:</strong> {counterpart?.discStyle || 'N/A'} ({getDiscLabel(counterpart?.discStyle)})
                    </p>
                    {counterpart?.topics && counterpart.topics.length > 0 && (
                      <div className="mt-2">
                        <strong className="text-xs text-slate-700">Competencies:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {counterpart.topics.map((t: string) => (
                            <span key={t} className="bg-slate-200 text-slate-800 text-[10px] px-2 py-0.5 rounded font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {counterpart?.challenges && counterpart.challenges.length > 0 && (
                      <div className="mt-2">
                        <strong className="text-xs text-slate-700">Growth Hurdles / Challenges:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {counterpart.challenges.map((c: string) => (
                            <span key={c} className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] px-2 py-0.5 rounded font-medium">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setIsDeclineOpen(true)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all"
                    >
                      Decline Proposal
                    </button>
                    <button
                      onClick={() => handleRespondMatch('ACCEPT')}
                      disabled={submittingResponse}
                      className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold shadow-md transition-all disabled:opacity-50"
                    >
                      {submittingResponse ? 'Accepting...' : 'Accept Pairing & Enter Space'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Case 3: Pair is ACTIVE (12-week workspace) */}
            {myPair && isPairActive && (
              <div className="space-y-6">
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Active 12-Week Relationship
                      </span>
                      <span className="text-xs text-slate-400">
                        Cohort: {myPair.cohort?.name}
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold mt-2">
                      Mentoring with {counterpart?.name}
                    </h1>
                    <p className="text-slate-400 text-xs mt-1">
                      {counterpart?.designation} • {counterpart?.department} (DISC: {counterpart?.discStyle || 'N/A'})
                    </p>
                  </div>

                  <button
                    onClick={() => router.push(`/space/${myPair.id}`)}
                    className="bg-white hover:bg-slate-100 text-slate-900 px-6 py-3 rounded-xl font-bold text-sm shadow transition-all flex items-center space-x-2"
                  >
                    <span>Enter 12-Week Space</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Counterpart Card & Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <UserIcon className="h-5 w-5 text-slate-500" />
                      Counterpart Profile
                    </h3>
                    <div className="text-xs space-y-2 text-slate-600">
                      <p><strong>Name:</strong> {counterpart?.name}</p>
                      <p><strong>Department:</strong> {counterpart?.department}</p>
                      <p><strong>DISC Behavioral Style:</strong> {counterpart?.discStyle || 'N/A'}</p>
                      <p><strong>Stated Goals:</strong> {counterpart?.careerGoals || 'Not specified'}</p>
                      {counterpart?.topics && counterpart.topics.length > 0 && (
                        <div>
                          <strong>Key Competencies:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {counterpart.topics.map((t: string) => (
                              <span key={t} className="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded font-medium">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {counterpart?.challenges && counterpart.challenges.length > 0 && (
                        <div>
                          <strong>Growth Hurdles:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {counterpart.challenges.map((c: string) => (
                              <span key={c} className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] px-2 py-0.5 rounded font-medium">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Tracker */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-slate-500" />
                        My Open Action Items
                      </h3>
                    </div>

                    <div className="p-6">
                      {dashboardData?.actionItems?.length === 0 ? (
                        <p className="text-center py-6 text-xs text-slate-400 font-medium">
                          No open commitments. Add goals and action items inside the Mentoring Space.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {dashboardData?.actionItems?.map((act: any) => (
                            <div
                              key={act.id}
                              className="p-3 border rounded-lg hover:bg-slate-50 flex justify-between items-center transition-all"
                            >
                              <div>
                                <p className="text-xs font-semibold text-slate-800">{act.title}</p>
                                {act.description && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">{act.description}</p>
                                )}
                              </div>
                              <span className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                                Due: {new Date(act.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- MODALS & DRAWERS ----------------- */}

        {/* Modal 1: Add Single Candidate */}
        {isAddCandidateOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-slate-800" />
                  <h3 className="font-bold text-lg text-slate-900">Add Candidate to Roster</h3>
                </div>
                <button onClick={() => setIsAddCandidateOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddCandidate} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">Candidate Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`border p-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all ${
                      newCandidate.role === 'MENTEE' ? 'border-green-600 bg-green-50/50 text-green-900 font-bold' : 'border-slate-200 text-slate-600'
                    }`}>
                      <input
                        type="radio"
                        name="candidateRole"
                        checked={newCandidate.role === 'MENTEE'}
                        onChange={() => setNewCandidate({
                          ...newCandidate,
                          role: 'MENTEE',
                          designation: 'Graduate Engineer Trainee',
                        })}
                        className="text-slate-800"
                      />
                      <span>Young Engineer (Mentee)</span>
                    </label>

                    <label className={`border p-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all ${
                      newCandidate.role === 'MENTOR' ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold' : 'border-slate-200 text-slate-600'
                    }`}>
                      <input
                        type="radio"
                        name="candidateRole"
                        checked={newCandidate.role === 'MENTOR'}
                        onChange={() => setNewCandidate({
                          ...newCandidate,
                          role: 'MENTOR',
                          designation: 'Senior Engineering Manager',
                        })}
                        className="text-slate-800"
                      />
                      <span>Leader / Manager (Mentor)</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Employee ID / Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EMP301"
                      value={newCandidate.employeeCode}
                      onChange={(e) => setNewCandidate({ ...newCandidate, employeeCode: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-slate-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rohit Verma"
                      value={newCandidate.name}
                      onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Corporate Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rohit.verma@corp.com"
                    value={newCandidate.email}
                    onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-slate-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Plant Engineering & TPM"
                      value={newCandidate.department}
                      onChange={(e) => setNewCandidate({ ...newCandidate, department: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. Maintenance Engineer"
                      value={newCandidate.designation}
                      onChange={(e) => setNewCandidate({ ...newCandidate, designation: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsAddCandidateOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={candidateActionLoading}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold shadow disabled:opacity-50"
                  >
                    {candidateActionLoading ? 'Saving...' : 'Add to Program Roster'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Professional Excel & CSV Upload with Table Preview */}
        {isExcelImportOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">Upload Candidates Excel / CSV Sheet</h3>
                    <p className="text-xs text-slate-500">Upload your spreadsheet with Employee Code, Name, Email, Role, Department & Designation.</p>
                  </div>
                </div>
                <button onClick={() => { setIsExcelImportOpen(false); setParsedCandidates([]); setUploadedFileName(''); }} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Template Download & Preset Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Official Templates:</span>
                  <button
                    type="button"
                    onClick={downloadExcelTemplate}
                    className="inline-flex items-center gap-1 text-xs bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg font-semibold transition-all shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Download Excel Template (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="inline-flex items-center gap-1 text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-lg font-semibold transition-all shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Download CSV (.csv)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleLoadSampleData}
                  className="inline-flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-lg font-semibold transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Load 5 Engineering Sample Roles</span>
                </button>
              </div>

              {/* File Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20 rounded-2xl p-5 text-center transition-all">
                <input
                  type="file"
                  id="excelFileInput"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="excelFileInput" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                  <Upload className="h-8 w-8 text-emerald-600 animate-bounce" />
                  <p className="text-xs font-semibold text-slate-800">
                    {uploadedFileName ? (
                      <span className="text-emerald-700 font-bold">Selected File: {uploadedFileName}</span>
                    ) : (
                      <>Click to browse or drag & drop your Excel file (<code className="text-emerald-700">.xlsx, .xls, .csv</code>)</>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400">Standard columns: EmployeeCode, FullName, Email, Role (MENTEE/MENTOR), Department, Designation</p>
                </label>
              </div>

              {/* Parsed Preview Table */}
              {parsedCandidates.length > 0 && (
                <div className="flex-1 overflow-hidden flex flex-col border border-slate-200 rounded-xl">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileCheck className="h-4 w-4 text-emerald-600" />
                      Preview: {parsedCandidates.length} Rows Detected ({parsedCandidates.filter(c => c.role === 'MENTEE').length} Mentees, {parsedCandidates.filter(c => c.role === 'MENTOR').length} Mentors)
                    </span>
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                      {parsedCandidates.filter(c => c.isValid).length} Valid
                    </span>
                  </div>

                  <div className="overflow-y-auto max-h-56">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b sticky top-0">
                        <tr>
                          <th className="px-4 py-2">Code</th>
                          <th className="px-4 py-2">Full Name</th>
                          <th className="px-4 py-2">Email</th>
                          <th className="px-4 py-2">Role</th>
                          <th className="px-4 py-2">Department</th>
                          <th className="px-4 py-2">Designation</th>
                          <th className="px-4 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedCandidates.map((c, idx) => (
                          <tr key={idx} className={c.isValid ? 'hover:bg-slate-50' : 'bg-red-50/50 text-red-800'}>
                            <td className="px-4 py-2 font-mono font-semibold">{c.employeeCode || <span className="text-red-500 italic">Empty</span>}</td>
                            <td className="px-4 py-2 font-medium">{c.name || <span className="text-red-500 italic">Empty</span>}</td>
                            <td className="px-4 py-2 text-slate-500">{c.email || <span className="text-red-500 italic">Empty</span>}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.role === 'MENTEE' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {c.role}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-slate-600">{c.department}</td>
                            <td className="px-4 py-2 text-slate-600">{c.designation}</td>
                            <td className="px-4 py-2 text-center">
                              {c.isValid ? (
                                <span className="text-emerald-600 font-bold text-xs" title="Ready to import">✓</span>
                              ) : (
                                <span className="text-red-600 font-bold text-[10px]" title={c.validationError}>✕ {c.validationError}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Bottom Footer Actions */}
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-xs text-slate-500">
                  {parsedCandidates.length > 0
                    ? `${parsedCandidates.filter(c => c.isValid).length} candidates ready for import`
                    : 'No file uploaded yet'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsExcelImportOpen(false); setParsedCandidates([]); setUploadedFileName(''); }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={candidateActionLoading || parsedCandidates.filter(c => c.isValid).length === 0}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    <span>{candidateActionLoading ? 'Importing...' : `Confirm & Import ${parsedCandidates.filter(c => c.isValid).length} Candidates`}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal 3: Broadcast Invites & Export Links Dialog */}
        {isBroadcastModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-bold text-lg text-slate-900">1. Broadcast Invites &amp; Personalized Links</h3>
                </div>
                <button onClick={() => setIsBroadcastModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-xs text-slate-600">
                  Each candidate has a pre-filled link that directly authenticates their onboarding profile.
                </p>
                <button
                  type="button"
                  onClick={copyAllLinks}
                  disabled={!dashboardData?.allEmployees?.length}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 px-3 py-1.5 rounded-lg transition-all shadow-sm shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedAll ? '✓ All Links Copied!' : '📋 Copy All Links'}</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3 bg-white max-h-72">
                {(!dashboardData?.allEmployees || dashboardData.allEmployees.length === 0) ? (
                  <p className="text-slate-400 italic text-center py-6 text-xs">No candidates registered. Upload Excel candidate sheet first.</p>
                ) : (
                  dashboardData.allEmployees.map((emp: any) => {
                    const candidateUrl = getCandidateLink(emp.employeeCode);
                    const isCopied = copiedCode === emp.employeeCode;
                    return (
                      <div key={emp.employeeCode} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 rounded-lg gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs">{emp.name}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              emp.role === 'MENTEE' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {emp.role}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">#{emp.employeeCode}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{emp.email}</p>
                          <p className="text-[10px] text-indigo-600 font-mono truncate select-all">{candidateUrl}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(candidateUrl, emp.employeeCode)}
                            className="text-[11px] font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md shadow-2xs flex items-center gap-1 transition-all"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await login(emp.employeeCode);
                              window.location.href = '/onboarding';
                            }}
                            className="text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs flex items-center gap-1"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-xs text-slate-500">
                  {dashboardData?.allEmployees?.length || 0} candidate links ready
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBroadcastModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-semibold"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setCandidateActionLoading(true);
                      try {
                        const res = await fetch('/api/admin/candidates', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'BROADCAST_INVITES' }),
                        });
                        const data = await res.json();
                        setIsBroadcastModalOpen(false);
                        setAdminStatusMsg(data.message || 'Program invites successfully broadcasted!');
                      } catch (e) {
                        setError('Failed to broadcast invites.');
                      } finally {
                        setCandidateActionLoading(false);
                      }
                    }}
                    disabled={candidateActionLoading}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Mail className="h-4 w-4" />
                    <span>{candidateActionLoading ? 'Sending Emails...' : 'Send All via noreply@rdc.in'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal 4: Clean Database Confirmation */}
        {isResetConfirmOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-6 w-6" />
                <h3 className="font-bold text-lg text-slate-900">Reset Program Roster?</h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                This will wipe all existing test pairs, session logs, notes, and candidate entries so you can start completely from scratch. <strong>Radhika Sen (Admin)</strong> will be preserved.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetDatabase}
                  disabled={candidateActionLoading}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50"
                >
                  {candidateActionLoading ? 'Cleaning...' : 'Yes, Clean Database'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 5: Decline match dialog */}
        {isDeclineOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
              <h3 className="font-bold text-lg text-slate-900">Decline Pairing Proposal</h3>
              <p className="text-xs text-slate-500">
                Please provide a brief reason to help the program administrator find a more compatible match.
              </p>
              <textarea
                rows={3}
                placeholder="e.g. Schedule conflicts, direct reporting line conflict, or domain misalignment..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full p-3 border rounded-lg text-xs focus:ring-2 focus:ring-slate-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsDeclineOpen(false)}
                  className="px-4 py-2 border text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRespondMatch('DECLINE')}
                  disabled={submittingResponse || !declineReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {submittingResponse ? 'Submitting...' : 'Confirm Decline'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
