"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { DailyQuote } from "@/components/DailyQuote";
import {
  Users,
  Sparkles,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  Filter,
  Plus,
  AlertCircle,
  TrendingUp,
  LogOut,
  UserCheck,
  Briefcase,
  FileText,
  Layers,
  ChevronRight,
  X,
} from "lucide-react";

type Employee = {
  employeeCode: string;
  name: string;
  email: string;
  role: string;
  department: string;
  designation: string;
  mentorCapacity: number;
};

type Pair = {
  id: string;
  status: string;
  mentor: Employee;
  mentee: Employee;
  sessions: Array<{ status: string }>;
  surveys: Array<{ growthRating: number }>;
  isOffRecord: boolean;
};

type Data = {
  pairs: Pair[];
  allEmployees?: Employee[];
  allSurveys?: Array<{ growthRating: number }>;
  legacyNotes?: Array<{ id: string; employeeCode: string; content: string }>;
  actionItems?: Array<{ id: string; title: string; dueDate: string }>;
};

type AdminTab = "matching" | "relationships" | "roster" | "journals";

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("matching");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [rosterRoleFilter, setRosterRoleFilter] = useState<string>("ALL");
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "Dashboard unavailable.");
    setData(json);
  }, []);

  useEffect(() => {
    if (user) void load().catch((e) => setError(e.message));
  }, [user, load]);

  async function send(path: string, body: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed.");
      await load();
      setMessage(json.message || "Saved successfully.");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function candidate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (
      await send(
        "/api/admin/candidates",
        Object.fromEntries(new FormData(form)),
      )
    ) {
      form.reset();
      setShowAddEmployee(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-700">Checking sign-in...</span>
        </div>
      </div>
    );
  }

  const admin = user.role === "ADMIN";
  const roster = data?.allEmployees ?? [];
  const pairs = data?.pairs ?? [];
  const legacyNotes = data?.legacyNotes ?? [];

  // Filter pairs
  const filteredPairs = pairs.filter((p) => {
    const matchesSearch = (p.mentee.name + " " + p.mentor.name + " " + p.status)
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter roster
  const filteredRoster = roster.filter((e) => {
    const matchesSearch = (e.name + " " + e.email + " " + e.employeeCode + " " + e.department + " " + e.designation)
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesRole = rosterRoleFilter === "ALL" || e.role === rosterRoleFilter;
    return matchesSearch && matchesRole;
  });

  const surveys = data?.allSurveys ?? pairs.flatMap((p) => p.surveys);
  const rating = surveys.length
    ? (surveys.reduce((sum, s) => sum + s.growthRating, 0) / surveys.length).toFixed(1)
    : "—";

  const activePairsCount = pairs.filter((p) => p.status === "ACTIVE").length;
  const proposedPairsCount = pairs.filter((p) => ["PROPOSED", "PENDING_ACCEPTANCE"].includes(p.status)).length;
  const completedSessionsCount = pairs.reduce(
    (n, p) => n + p.sessions.filter((s) => s.status === "COMPLETED").length,
    0,
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold tracking-widest text-indigo-600 uppercase">
                  RDC Concrete
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-semibold text-slate-500">Grow Together</span>
              </div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Margdarshan</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-bold text-slate-800">{user.name}</span>
              <span className="text-xs text-slate-500 font-medium">
                {admin ? "System Administrator" : user.role}
              </span>
            </div>

            <nav className="flex items-center gap-2">
              <Link
                href="/onboarding"
                className="text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition"
              >
                My Profile
              </Link>
              <Link
                href="/resources"
                className="text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition"
              >
                Resource Hub
              </Link>
              <button
                onClick={() => void logout()}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner / Hero Card */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Sparkles className="w-3.5 h-3.5" />
                {admin ? "Administrator Control Center" : "Mentoring Journey"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Build your next chapter
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
                Learn from the people around you. Put new skills into practice. Keep a verified record of the progress you make together.
              </p>
              <p className="text-indigo-200 text-xs font-medium italic" lang="hi">
                साथ सीखें। आगे बढ़ें। अपनी प्रगति को सहेजें।
              </p>
            </div>

            <div className="lg:col-span-5 relative hidden sm:block">
              <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-white/10 shadow-lg group">
                <Image
                  src="/images/main-page.png"
                  alt="RDC Concrete mentor and mentee engineer with transit mixer truck"
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-2 left-3 right-3 text-[11px] text-slate-200 font-medium truncate">
                  RDC Concrete · Learning together at site
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Feedback Messages */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center justify-between text-sm shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-800 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-sm shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage("")} className="text-emerald-500 hover:text-emerald-800 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Key Metrics Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{activePairsCount}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Pairs</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{completedSessionsCount}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Calls</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{rating}{surveys.length ? " / 5" : ""}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Growth · {surveys.length} reviews
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{roster.length}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Roster</p>
            </div>
          </div>
        </div>

        {/* Daily Inspiration */}
        <DailyQuote />

        {/* ========================================================================= */}
        {/* ADMIN DASHBOARD WITH TOP-LEVEL TABS                                       */}
        {/* ========================================================================= */}
        {admin ? (
          <div className="space-y-6">
            {/* TOP NAVIGATION TABS */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
              <nav className="flex flex-wrap gap-2" aria-label="Admin Tabs">
                <button
                  onClick={() => setActiveTab("matching")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === "matching"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Matching &amp; Invitations</span>
                  {proposedPairsCount > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        activeTab === "matching"
                          ? "bg-white text-indigo-700"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {proposedPairsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("relationships")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === "relationships"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>All Coaching Relationships</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      activeTab === "relationships"
                        ? "bg-white text-indigo-700"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {pairs.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("roster")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === "roster"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Employee Roster</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      activeTab === "roster"
                        ? "bg-white text-indigo-700"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {roster.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("journals")}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeTab === "journals"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Earlier Journals</span>
                  {legacyNotes.length > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        activeTab === "journals"
                          ? "bg-white text-indigo-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {legacyNotes.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* TAB 1: MATCHING & INVITATIONS */}
            {activeTab === "matching" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* AI Matching & Fast Pair Box */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        AI Compatibility Matching &amp; Pair Creation
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Matches respect mentor capacity and preserve existing records. Both participants accept before sessions begin.
                      </p>
                    </div>

                    <button
                      disabled={busy}
                      onClick={() => void send("/api/admin/match", {})}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{busy ? "Calculating..." : "Suggest AI Matches"}</span>
                    </button>
                  </div>

                  {/* Manual Pair Creator */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void send("/api/admin/pair", {
                        ...Object.fromEntries(new FormData(e.currentTarget)),
                        action: "CREATE_PAIR",
                      });
                    }}
                    className="space-y-4"
                  >
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Create Manual Pairing Invitation
                    </h4>
                    <fieldset disabled={busy} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Mentee *
                          </label>
                          <select
                            name="menteeCode"
                            required
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          >
                            <option value="">Choose Mentee...</option>
                            {roster
                              .filter((e) => e.role === "MENTEE")
                              .map((e) => (
                                <option key={e.employeeCode} value={e.employeeCode}>
                                  {e.name} (#{e.employeeCode}) · {e.department}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Mentor *
                          </label>
                          <select
                            name="mentorCode"
                            required
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          >
                            <option value="">Choose Mentor...</option>
                            {roster
                              .filter((e) => e.role === "MENTOR")
                              .map((e) => (
                                <option key={e.employeeCode} value={e.employeeCode}>
                                  {e.name} (#{e.employeeCode}) · Cap: {e.mentorCapacity}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create Invitation</span>
                        </button>
                      </div>
                    </fieldset>
                  </form>
                </div>

                {/* Pending / Proposed Matches */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
                      Pending Invitations ({pairs.filter((p) => p.status !== "ACTIVE").length})
                    </h3>
                  </div>

                  {pairs.filter((p) => p.status !== "ACTIVE").length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                      No pending proposals. All pairings are currently active or confirmed.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pairs
                        .filter((p) => p.status !== "ACTIVE")
                        .map((p) => (
                          <div
                            key={p.id}
                            className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-md transition space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                                {p.status}
                              </span>
                              <Link
                                href={"/space/" + p.id}
                                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                              >
                                View Space <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Mentee</span>
                                <span className="font-bold text-slate-900">{p.mentee.name}</span>
                                <span className="block text-[11px] text-slate-500 font-mono">#{p.mentee.employeeCode}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Mentor</span>
                                <span className="font-bold text-slate-900">{p.mentor.name}</span>
                                <span className="block text-[11px] text-slate-500 font-mono">#{p.mentor.employeeCode}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ALL COACHING RELATIONSHIPS */}
            {activeTab === "relationships" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Search & Filter Bar */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      placeholder="Search mentor, mentee, or role..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    {["ALL", "ACTIVE", "PROPOSED", "COMPLETED", "TERMINATED"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                          statusFilter === st
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Relationship Cards Grid */}
                {filteredPairs.length === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                    <Users className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">No coaching relationships found</p>
                    <p className="text-xs text-slate-400">Try adjusting your search terms or filters above.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredPairs.map((p) => {
                      const completedCount = p.sessions.filter((s) => s.status === "COMPLETED").length;
                      const progressPct = Math.round((completedCount / 13) * 100);

                      return (
                        <div
                          key={p.id}
                          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-lg hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                  p.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : p.status === "PROPOSED"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                              >
                                ● {p.status}
                                {p.isOffRecord ? " · OFF RECORD" : ""}
                              </span>

                              <span className="text-[11px] font-bold text-slate-400">
                                Week {completedCount}/13
                              </span>
                            </div>

                            {/* Mentee & Mentor Box */}
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                                  {p.mentee.name.charAt(0)}
                                </div>
                                <div className="truncate">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Mentee</span>
                                  <p className="text-sm font-bold text-slate-900 truncate">{p.mentee.name}</p>
                                  <p className="text-[11px] text-slate-500 truncate">{p.mentee.department}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                                  {p.mentor.name.charAt(0)}
                                </div>
                                <div className="truncate">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Mentor</span>
                                  <p className="text-sm font-bold text-slate-900 truncate">{p.mentor.name}</p>
                                  <p className="text-[11px] text-slate-500 truncate">{p.mentor.department}</p>
                                </div>
                              </div>
                            </div>

                            {/* 13-Week Visual Progress Bar */}
                            <div className="space-y-1.5 pt-2">
                              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                <span>12-Week Roadmap</span>
                                <span>{progressPct}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${progressPct}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <Link
                              href={"/space/" + p.id}
                              className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                            >
                              <span>Open 12-Week Space</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>

                            {!["TERMINATED", "DECLINED"].includes(p.status) && (
                              <button
                                disabled={busy}
                                onClick={() => {
                                  const reason = window.prompt(
                                    "Reason for ending this relationship. All records will be retained.",
                                  );
                                  if (reason !== null)
                                    void send("/api/admin/pair", {
                                      action: "TERMINATE_PAIR",
                                      pairId: p.id,
                                      reason,
                                    });
                                }}
                                className="w-full py-1.5 text-slate-400 hover:text-rose-600 text-[11px] font-semibold transition cursor-pointer"
                              >
                                End Relationship
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: EMPLOYEE ROSTER */}
            {activeTab === "roster" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Roster Controls */}
                <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        placeholder="Search employee, email, code..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {["ALL", "MENTEE", "MENTOR"].map((r) => (
                        <button
                          key={r}
                          onClick={() => setRosterRoleFilter(r)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            rosterRoleFilter === r
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {r === "ALL" ? "All" : r === "MENTEE" ? "Mentees" : "Mentors"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAddEmployee(!showAddEmployee)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{showAddEmployee ? "Close Form" : "Add Employee"}</span>
                  </button>
                </div>

                {/* Add / Update Employee Drawer */}
                {showAddEmployee && (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-indigo-100 shadow-md space-y-4 animate-in fade-in">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-indigo-600" />
                      Register or Update Employee Profile
                    </h3>
                    <form onSubmit={candidate} className="space-y-4">
                      <fieldset disabled={busy} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Employee Code *</label>
                            <input
                              name="employeeCode"
                              required
                              maxLength={100}
                              placeholder="e.g. EMP401"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                            <input
                              name="name"
                              required
                              maxLength={200}
                              placeholder="e.g. Rajesh Kumar"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">RDC Email *</label>
                            <input
                              name="email"
                              type="email"
                              required
                              placeholder="name@rdc.in"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Role *</label>
                            <select
                              name="role"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            >
                              <option value="MENTEE">Mentee</option>
                              <option value="MENTOR">Mentor</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                            <input
                              name="department"
                              defaultValue="Engineering"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                            <input
                              name="designation"
                              defaultValue="Graduate Engineer Trainee"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Mentor Capacity</label>
                            <input
                              type="number"
                              name="mentorCapacity"
                              min="1"
                              max="50"
                              defaultValue="2"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddEmployee(false)}
                            className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Save Employee Record
                          </button>
                        </div>
                      </fieldset>
                    </form>
                  </div>
                )}

                {/* Modern Roster Table */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                          <th className="py-3.5 px-6">Employee</th>
                          <th className="py-3.5 px-6">Role</th>
                          <th className="py-3.5 px-6">Department &amp; Designation</th>
                          <th className="py-3.5 px-6">Capacity</th>
                          <th className="py-3.5 px-6">Employee Code</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {filteredRoster.map((e) => (
                          <tr key={e.employeeCode} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                                  {e.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{e.name}</p>
                                  <p className="text-[11px] text-slate-400">{e.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-6">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  e.role === "MENTOR"
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : e.role === "ADMIN"
                                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {e.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-6">
                              <p className="font-medium text-slate-800">{e.designation}</p>
                              <p className="text-[11px] text-slate-400">{e.department}</p>
                            </td>
                            <td className="py-3.5 px-6 font-semibold">
                              {e.role === "MENTOR" ? `${e.mentorCapacity} Mentees` : "—"}
                            </td>
                            <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500 font-semibold">
                              #{e.employeeCode}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: EARLIER JOURNALS */}
            {activeTab === "journals" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        Earlier Journals (Unlinked Historical Records)
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        These notes predate journals being linked to an active 12-week mentoring relationship.
                      </p>
                    </div>

                    <Link
                      href="/admin/records"
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <span>Full Record Library</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {legacyNotes.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                      No standalone unlinked journals found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {legacyNotes.map((n) => {
                        const author = roster.find((e) => e.employeeCode === n.employeeCode);

                        return (
                          <div
                            key={n.id}
                            className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-2 hover:bg-white hover:shadow-md transition"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                                {(author?.name || n.employeeCode).charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">{author?.name ?? n.employeeCode}</p>
                                <p className="text-[10px] text-slate-400 font-mono">#{n.employeeCode}</p>
                              </div>
                            </div>
                            <pre className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100 whitespace-pre-wrap font-sans leading-relaxed">
                              {n.content}
                            </pre>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* MENTEE / MENTOR DASHBOARD VIEW                                            */
          /* ========================================================================= */
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                My Coaching Relationships ({pairs.length})
              </h3>

              {pairs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <Users className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No active relationship assigned yet</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    The program administrator is currently reviewing cohort compatibility and pairing proposals. You will receive an invitation once matched.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {pairs.map((p) => {
                    const isMeMentee = p.mentee.employeeCode === user.employeeCode;
                    const partner = isMeMentee ? p.mentor : p.mentee;
                    const completedCount = p.sessions.filter((s) => s.status === "COMPLETED").length;
                    const progressPct = Math.round((completedCount / 13) * 100);

                    return (
                      <div
                        key={p.id}
                        className="bg-gradient-to-b from-white to-slate-50/60 rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ● {p.status}
                          </span>
                          <span className="text-xs font-bold text-slate-400">Week {completedCount}/13</span>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-black flex items-center justify-center text-sm shadow-sm">
                            {partner.name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">
                              {isMeMentee ? "Your Assigned Mentor" : "Your Assigned Mentee"}
                            </span>
                            <p className="text-base font-extrabold text-slate-900">{partner.name}</p>
                            <p className="text-xs text-slate-500 font-medium">
                              {partner.designation} · {partner.department}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1 pt-2">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500">
                            <span>Journey Completion</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Link
                            href={"/space/" + p.id}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                          >
                            <span>Enter 12-Week Coaching Space</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Open Action Items for Mentee/Mentor */}
            {!!data?.actionItems?.length && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  My Open Action Items ({data.actionItems.length})
                </h3>
                <div className="divide-y divide-slate-100">
                  {data.actionItems.map((a) => {
                    const isOverdue = new Date(a.dueDate) < new Date();

                    return (
                      <div key={a.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                        <span className="font-semibold text-slate-800">{a.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-slate-400">
                            Due{" "}
                            {new Date(a.dueDate).toLocaleDateString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                              OVERDUE
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

