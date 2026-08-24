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
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchDashboardData();
    }
  }, [user, loading, router]);

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
        setAdminStatusMsg(`Candidate ${data.candidate.name} (${data.candidate.employeeCode}) added to program roster!`);
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
        setAdminStatusMsg(`Successfully imported ${data.count} candidates from Excel to the program roster!`);
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

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
          <p className="text-slate-500 text-sm font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const myPair = dashboardData?.pair;
  const isPairActive = myPair?.status === 'ACTIVE';
  const isMeMentee = myPair?.menteeCode === user?.employeeCode;
  const counterpart = isMeMentee ? myPair?.mentor : myPair?.mentee;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/dashboard')}>
              <Compass className="h-8 w-8 text-slate-800" />
              <span className="text-xl font-bold text-slate-900 tracking-tight">Margdarshan</span>
            </div>
            <button
              onClick={() => router.push('/onboarding')}
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-all"
            >
              My Profile & Onboarding
            </button>
            <button
              onClick={() => router.push('/resources')}
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-all"
            >
              Resource Hub
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-1.5 bg-slate-100/80 px-2 py-1 rounded-lg border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 hidden lg:inline">Switch Role:</span>
              <select
                value={user?.employeeCode || ''}
                onChange={async (e) => {
                  if (e.target.value) {
                    await login(e.target.value);
                    window.location.reload();
                  }
                }}
                className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-500"
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
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-400 font-medium uppercase">
                {user?.role} • {user?.department}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-700 font-bold">✕</button>
          </div>
        )}

        {/* ----------------- ADMIN DASHBOARD ----------------- */}
        {user?.role === 'ADMIN' && (
          <div className="space-y-8">
            {/* Header with Candidate Actions, Invites, and Auto-Match */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900">Program Administration</h1>
                  <span className="text-xs bg-slate-800 text-white font-bold px-2.5 py-0.5 rounded-full">
                    Rolling 3-Month Cycle
                  </span>
                </div>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  Upload Excel candidate sheets, broadcast onboarding invites, run AI competency matching, and track progress.
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsAddCandidateOpen(true)}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <UserPlus className="h-4 w-4 text-blue-600" />
                  <span>+ Add Single</span>
                </button>

                <button
                  onClick={() => setIsExcelImportOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Upload Excel / Template</span>
                </button>

                <button
                  onClick={() => setIsBroadcastModalOpen(true)}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Mail className="h-4 w-4 text-indigo-600" />
                  <span>1. Broadcast Invites</span>
                </button>

                <button
                  onClick={runAdminAutoMatching}
                  disabled={adminRunningMatch}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-4 w-4 ${adminRunningMatch ? 'animate-spin' : ''}`} />
                  <span>{adminRunningMatch ? 'Matching...' : '2. Run AI Match'}</span>
                </button>

                <button
                  onClick={() => setIsResetConfirmOpen(true)}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                  title="Clean database and start testing from scratch"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clean Roster</span>
                </button>
              </div>
            </div>

            {adminStatusMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center justify-between">
                <span>{adminStatusMsg}</span>
                <button onClick={() => setAdminStatusMsg('')} className="text-emerald-600 hover:text-emerald-900 ml-2 font-bold">✕</button>
              </div>
            )}

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center space-x-4 shadow-sm">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Registered Mentees</p>
                  <p className="text-2xl font-bold text-slate-800">{dashboardData?.totalMentees || 0}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center space-x-4 shadow-sm">
                <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Available Mentors</p>
                  <p className="text-2xl font-bold text-slate-800">{dashboardData?.totalMentors || 0}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center space-x-4 shadow-sm">
                <div className="p-3 bg-slate-50 text-slate-600 rounded-lg">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Total Pairings</p>
                  <p className="text-2xl font-bold text-slate-800">{dashboardData?.pairs?.length || 0}</p>
                </div>
              </div>
            </div>

            {/* Candidate Intake Submissions Table (Step 3) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-bold text-slate-800">Candidate Intake & Form Submissions</h3>
                  <p className="text-xs text-slate-500">Mentees & Mentors registered in the program. Each candidate completes onboarding before matching.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2.5 py-1 rounded">
                    {dashboardData?.allEmployees?.length || 0} Total Candidates
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-semibold border-b">
                    <tr>
                      <th className="px-6 py-3">Employee Name & ID</th>
                      <th className="px-6 py-3">Role & Dept</th>
                      <th className="px-6 py-3">Profile Intake Status</th>
                      <th className="px-6 py-3">DISC Style</th>
                      <th className="px-6 py-3">Competency & Challenges Focus</th>
                      <th className="px-6 py-3 text-right">Quick Test</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!dashboardData?.allEmployees || dashboardData.allEmployees.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                          No candidates registered yet. Click <strong>"Upload Excel / Template"</strong> above to import your candidates from spreadsheet.
                        </td>
                      </tr>
                    ) : (
                      dashboardData.allEmployees.map((emp: any) => {
                        const isComplete = emp.discStyle && (emp.topics?.length > 0 || emp.careerGoals);
                        return (
                          <tr key={emp.employeeCode} className="hover:bg-slate-50">
                            <td className="px-6 py-3">
                              <p className="font-semibold text-slate-800">{emp.name}</p>
                              <p className="text-[10px] text-slate-400">{emp.employeeCode} • {emp.designation}</p>
                            </td>
                            <td className="px-6 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                emp.role === 'MENTEE' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                              }`}>
                                {emp.role}
                              </span>
                              <p className="text-[10px] text-slate-500 mt-0.5">{emp.department}</p>
                            </td>
                            <td className="px-6 py-3">
                              {isComplete ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  <CheckCircle className="h-3 w-3" />
                                  Submitted & Ready
                                </span>
                              ) : (
                                <span className="text-amber-700 font-semibold text-[11px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                  Pending Onboarding Form
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              {emp.discStyle ? (
                                <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                  Style {emp.discStyle}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Not taken</span>
                              )}
                            </td>
                            <td className="px-6 py-3 max-w-xs">
                              <div className="flex flex-wrap gap-1">
                                {emp.topics?.slice(0, 2).map((t: string) => (
                                  <span key={t} className="bg-slate-100 text-slate-700 text-[9px] px-1.5 py-0.5 rounded font-medium truncate max-w-[140px]">
                                    {t}
                                  </span>
                                ))}
                                {emp.challenges?.slice(0, 1).map((c: string) => (
                                  <span key={c} className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] px-1.5 py-0.5 rounded font-medium truncate max-w-[140px]">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <button
                                onClick={async () => {
                                  await login(emp.employeeCode);
                                  window.location.href = isComplete ? '/dashboard' : '/onboarding';
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded transition-all"
                              >
                                <span>Login as {emp.name.split(' ')[0]}</span>
                                <ArrowRight className="h-3 w-3" />
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

            {/* Table 2: Pairing Matrix & Telemetry (Steps 4, 5, 10, 11) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800">Active Cohort Pairings & 12-Week Telemetry</h3>
                  <p className="text-xs text-slate-500">Pairs have rolling 3-month schedules. Track AI match score, weekly sessions, and survey feedback.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-semibold border-b">
                    <tr>
                      <th className="px-6 py-3">Mentor</th>
                      <th className="px-6 py-3">Mentee</th>
                      <th className="px-6 py-3">AI Match Score</th>
                      <th className="px-6 py-3">12-Week Sessions</th>
                      <th className="px-6 py-3">Survey Feedback</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!dashboardData?.pairs || dashboardData.pairs.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                          No pairings generated yet. Upload candidates, ensure onboarding is complete, and click <strong>"2. Run AI Match"</strong>.
                        </td>
                      </tr>
                    ) : (
                      dashboardData.pairs.map((p: any) => {
                        const completedSessions = p.sessions?.filter((s: any) => s.status === 'COMPLETED').length || 0;
                        const surveyCount = p.surveys?.length || 0;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-6 py-3">
                              <p className="font-semibold text-slate-800">{p.mentor.name}</p>
                              <p className="text-[10px] text-slate-400">{p.mentor.department} (DISC: {p.mentor.discStyle || 'N/A'})</p>
                            </td>
                            <td className="px-6 py-3">
                              <p className="font-semibold text-slate-800">{p.mentee.name}</p>
                              <p className="text-[10px] text-slate-400">{p.mentee.department} (DISC: {p.mentee.discStyle || 'N/A'})</p>
                            </td>
                            <td className="px-6 py-3">
                              <span className="font-bold text-slate-800 text-xs">
                                {(p.matchScore * 100).toFixed(0)}%
                              </span>
                              <span className="text-[10px] text-slate-400 block">Competency + DISC</span>
                            </td>
                            <td className="px-6 py-3">
                              <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden mb-1">
                                <div
                                  className="bg-slate-800 h-2 rounded-full transition-all"
                                  style={{ width: `${(completedSessions / 13) * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold">{completedSessions} of 13 Sessions Completed</span>
                            </td>
                            <td className="px-6 py-3">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                surveyCount > 0 ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {surveyCount > 0 ? `${surveyCount} Survey Logged` : 'Pending W6 Survey'}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  p.status === 'ACTIVE'
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : p.status === 'DECLINED'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                }`}
                              >
                                {p.status}
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
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-xl mx-auto shadow-md space-y-4">
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
              <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden max-w-2xl mx-auto">
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
                <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                    className="bg-white hover:bg-slate-100 text-slate-900 px-6 py-3 rounded-lg font-bold text-sm shadow transition-all flex items-center space-x-2"
                  >
                    <span>Enter 12-Week Space</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Counterpart Card & Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
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
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
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
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">Upload Candidates Excel / CSV Sheet</h3>
                    <p className="text-xs text-slate-500">Upload your structured spreadsheet with Employee Code, Name, Email, Role, Department & Designation.</p>
                  </div>
                </div>
                <button onClick={() => { setIsExcelImportOpen(false); setParsedCandidates([]); setUploadedFileName(''); }} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Template Download & Preset Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Official Templates:</span>
                  <button
                    type="button"
                    onClick={downloadExcelTemplate}
                    className="inline-flex items-center gap-1 text-xs bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded font-semibold transition-all shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Download Excel Template (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="inline-flex items-center gap-1 text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded font-semibold transition-all shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>Download CSV (.csv)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleLoadSampleData}
                  className="inline-flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1 rounded font-semibold transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Load 5 Engineering Sample Roles</span>
                </button>
              </div>

              {/* File Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20 rounded-xl p-5 text-center transition-all">
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
                <div className="flex-1 overflow-hidden flex flex-col border border-slate-200 rounded-lg">
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

        {/* Modal 3: Broadcast Invites Dialog */}
        {isBroadcastModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-bold text-lg text-slate-900">1. Broadcast Program Invites</h3>
                </div>
                <button onClick={() => setIsBroadcastModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Invitations simulate sending corporate email notifications containing direct 3-month mentoring onboarding links to all registered Mentees and Mentors in your roster.
              </p>

              <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg max-h-56 overflow-y-auto space-y-2 text-xs">
                <span className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider">Candidate Direct Intake Links:</span>
                {(!dashboardData?.allEmployees || dashboardData.allEmployees.length === 0) ? (
                  <p className="text-slate-400 italic">No candidates registered. Upload Excel candidate sheet first.</p>
                ) : (
                  dashboardData.allEmployees.map((emp: any) => (
                    <div key={emp.employeeCode} className="flex justify-between items-center bg-white p-2 border rounded">
                      <div>
                        <p className="font-semibold text-slate-800">{emp.name} ({emp.role})</p>
                        <p className="text-[10px] text-slate-400 font-mono">{emp.email} • ID: {emp.employeeCode}</p>
                      </div>
                      <button
                        onClick={async () => {
                          await login(emp.employeeCode);
                          window.location.href = '/onboarding';
                        }}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded"
                      >
                        Launch Form →
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50"
                >
                  {candidateActionLoading ? 'Sending Emails...' : 'Confirm & Broadcast Emails'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 4: Clean Database Confirmation */}
        {isResetConfirmOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
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
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
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
