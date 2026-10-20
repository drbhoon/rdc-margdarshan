"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { DailyQuote } from "@/components/DailyQuote";
import {
  AdminHero,
  StatTile,
  coverFor,
  initialsOf,
  toneAt,
} from "@/components/admin-ui";
import { ProgressRing } from "@/components/progress-ring";
import { CollapsibleCard } from "@/components/collapsible-card";
import {
  Users,
  Sparkles,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Plus,
  TrendingUp,
  UserCheck,
  Briefcase,
  LayoutDashboard,
  PlayCircle,
  FolderArchive,
  X,
  Mail,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

type Employee = {
  employeeCode: string;
  name: string;
  email: string;
  role: string;
  department: string;
  designation: string;
  highestQualification?: string | null;
  location?: string | null;
  discStyle?: string | null;
  careerGoals?: string | null;
  topics?: string[];
  challenges?: string[];
  availability?: string | null;
  commStyleNotes?: string | null;
  isConsentShared?: boolean;
  mentorCapacity: number;
};

type Pair = {
  id: string;
  status: string;
  mentor: Employee;
  mentee: Employee;
  sharedGoals?: string | null;
  sessions: Array<{
    id: string;
    weekNumber: number;
    status: string;
    scheduledTime?: string | null;
    actionItems?: Array<{
      id: string;
      title: string;
      dueDate: string;
      status: string;
      employeeCode: string;
    }>;
  }>;
  surveys: Array<{ growthRating: number }>;
  isOffRecord: boolean;
};

type Data = {
  pairs: Pair[];
  allEmployees?: Employee[];
  allSurveys?: Array<{ growthRating: number }>;
  legacyNotes?: Array<{ id: string; employeeCode: string; content: string }>;
  actionItems?: Array<{
    id: string;
    title: string;
    dueDate: string;
    status?: string;
  }>;
};

type MatchSuggestion = {
  mentee: Employee;
  mentor: Employee;
  matchScore: number;
  reasons: string[];
  harmonyAdvice?: {
    title: string;
    harmonyScore: string;
    advice: string;
    tips: string[];
  };
};

type AdminTab = "matching" | "relationships" | "roster" | "journals";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("matching");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [rosterRoleFilter, setRosterRoleFilter] = useState<string>("ALL");
  const [suggestions, setSuggestions] = useState<MatchSuggestion[] | null>(
    null,
  );
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastRoleFilter, setBroadcastRoleFilter] = useState<string>("ALL");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [sendingInviteCode, setSendingInviteCode] = useState<string | null>(
    null,
  );
  const [detailModal, setDetailModal] = useState<{
    type:
      | "incomplete"
      | "unpaired"
      | "proposed"
      | "unscheduled"
      | "overdue"
      | "reviews"
      | "active_pairs"
      | "completed_calls";
    title: string;
  } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "Dashboard unavailable.");
    setData(json);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) void load().catch((e) => setError(e.message));
  }, [user, load]);

  async function fetchMatchSuggestions() {
    setLoadingSuggestions(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/match");
      const json = await res.json();
      if (!res.ok)
        throw new Error(
          json.error || "Could not calculate compatibility recommendations.",
        );
      if (json.suggestions && json.suggestions.length > 0) {
        setSuggestions(json.suggestions);
        setMessage(
          `Prepared ${json.suggestions.length} compatibility recommendation(s) from shared interests, development needs, availability and communication preferences.`,
        );
      } else {
        setSuggestions([]);
        setMessage(
          json.totalMenteesAvailable === 0
            ? "All active mentees already have active or proposed mentoring relationships."
            : "No active mentors with available capacity found for remaining mentees.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to prepare recommendations.",
      );
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function applySuggestedMatches(
    pairings?: Array<{ mentorCode: string; menteeCode: string }>,
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairings }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create pairings.");
      setSuggestions(null);
      await load();
      setMessage(
        json.message || "Draft pairings created for administrator review.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create pairings.",
      );
    } finally {
      setBusy(false);
    }
  }

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
    }
  }

  function getCandidateLink(employeeCode: string) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/onboarding?emp=${encodeURIComponent(
        employeeCode,
      )}`;
    }
    return `/onboarding?emp=${encodeURIComponent(employeeCode)}`;
  }

  function copyToClipboard(text: string, codeId: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  }

  function copyAllLinks() {
    const candidatesList = (data?.allEmployees ?? []).filter(
      (e) => e.role === "MENTEE" || e.role === "MENTOR",
    );
    if (!candidatesList.length) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const text = candidatesList
      .map(
        (emp) =>
          `[${emp.role}] ${emp.name} (ID: ${emp.employeeCode}) - ${emp.email}\nYou have been added as a ${emp.role} on the RDC Margdarshan Mentoring Platform.\nLogin & Complete Profile Link: ${origin}/onboarding?emp=${encodeURIComponent(emp.employeeCode)}`,
      )
      .join("\n\n");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  }

  function openMailClientFallback(
    recipients: Array<{
      employeeCode: string;
      name: string;
      email: string;
      role: string;
    }>,
  ) {
    if (!recipients.length || typeof window === "undefined") return;
    const origin = window.location.origin;

    if (recipients.length === 1) {
      const rec = recipients[0];
      const roleLabel =
        rec.role === "MENTOR"
          ? "Leader / Manager (Mentor)"
          : "Young Engineer (Mentee)";
      const onboardingUrl = `${origin}/onboarding?emp=${encodeURIComponent(rec.employeeCode)}`;
      const loginUrl = `${origin}/login?emp=${encodeURIComponent(rec.employeeCode)}`;
      const subject = `[Margdarshan] You Have Been Added as ${rec.role === "MENTOR" ? "a Mentor" : "a Mentee"} — Login & Complete Your Profile`;
      const body = [
        `Dear ${rec.name},`,
        "",
        `You have been added to the Margdarshan 12-Week Mentoring Program as a ${roleLabel} (Employee ID: ${rec.employeeCode}).`,
        "",
        "Please click the link below to log in and complete your mentoring profile:",
        onboardingUrl,
        "",
        `Standard portal login page: ${loginUrl}`,
        "",
        "Regards,",
        "Margdarshan Mentoring Platform",
        "RDC Concrete (India) Limited",
      ].join("\r\n");

      window.location.href = `mailto:${encodeURIComponent(rec.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      return;
    }

    copyAllLinks();
    const bccList = recipients.map((r) => r.email).join(",");
    const loginUrl = `${origin}/login`;
    const subject =
      "[Margdarshan] You Have Been Added as a Mentor / Mentee — Login & Complete Your Profile";
    const body = [
      "Dear Colleague,",
      "",
      "You have been added to the RDC Margdarshan 12-Week Mentoring Program as a Mentor or Mentee.",
      "",
      "Please sign in using your verified corporate Google account (@rdc.in or @ultrafine.in) to complete your mentoring profile and DISC reflection:",
      loginUrl,
      "",
      "Regards,",
      "Margdarshan Mentoring Platform",
      "RDC Concrete (India) Limited",
    ].join("\r\n");

    window.location.href = `mailto:?bcc=${encodeURIComponent(bccList)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function broadcastInvites(employeeCodes?: string[]) {
    if (employeeCodes && employeeCodes.length === 1) {
      setSendingInviteCode(employeeCodes[0]);
    } else {
      setBusy(true);
    }
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BROADCAST_INVITES",
          ...(employeeCodes ? { employeeCodes } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to broadcast invitations.");

      const needsMailtoFallback =
        ((json.simulatedCount ?? 0) > 0 && (json.sentCount ?? 0) === 0) ||
        (Array.isArray(json.errors) &&
          json.errors.length > 0 &&
          (json.sentCount ?? 0) === 0);

      if (needsMailtoFallback && Array.isArray(json.recipients)) {
        openMailClientFallback(json.recipients);
      }

      setMessage(
        json.message ||
          "Broadcast complete: Invitations & login links dispatched.",
      );
      if (!employeeCodes) {
        setIsBroadcastModalOpen(false);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to broadcast invitations.",
      );
    } finally {
      setSendingInviteCode(null);
      setBusy(false);
    }
  }

  if (loading || !user) {
    return <main className="container">Checking sign-in…</main>;
  }

  const admin = user.role === "ADMIN";
  const roster = data?.allEmployees ?? [];
  const pairs = data?.pairs ?? [];
  const legacyNotes = data?.legacyNotes ?? [];

  const filteredPairs = pairs.filter((p) => {
    const matchesSearch = (
      p.mentee.name +
      " " +
      p.mentor.name +
      " " +
      p.status
    )
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredRoster = roster.filter((e) => {
    const matchesSearch = (
      e.name +
      " " +
      e.email +
      " " +
      e.employeeCode +
      " " +
      e.department +
      " " +
      e.designation
    )
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesRole =
      rosterRoleFilter === "ALL" || e.role === rosterRoleFilter;
    return matchesSearch && matchesRole;
  });

  const surveys = data?.allSurveys ?? pairs.flatMap((p) => p.surveys);
  const rating = surveys.length
    ? (
        surveys.reduce((sum, s) => sum + s.growthRating, 0) / surveys.length
      ).toFixed(1)
    : "—";

  const activePairsCount = pairs.filter((p) => p.status === "ACTIVE").length;
  const proposedPairsCount = pairs.filter((p) =>
    ["PROPOSED", "PENDING_ACCEPTANCE"].includes(p.status),
  ).length;
  const completedSessionsCount = pairs.reduce(
    (n, p) => n + p.sessions.filter((s) => s.status === "COMPLETED").length,
    0,
  );
  const openPairs = pairs.filter((p) =>
    ["PROPOSED", "PENDING_ACCEPTANCE", "ACTIVE"].includes(p.status),
  );
  const pairedMentees = new Set(openPairs.map((p) => p.mentee.employeeCode));
  const incompleteProfiles = roster.filter(
    (employee) =>
      employee.role !== "ADMIN" &&
      (!employee.careerGoals ||
        !employee.topics?.length ||
        !employee.availability ||
        !employee.discStyle),
  );
  const unpairedMentees = roster.filter(
    (employee) =>
      employee.role === "MENTEE" && !pairedMentees.has(employee.employeeCode),
  );
  const overdueActions = pairs
    .flatMap((pair) =>
      pair.sessions.flatMap((session) => session.actionItems ?? []),
    )
    .filter(
      (action) =>
        action.status !== "COMPLETED" && new Date(action.dueDate) < new Date(),
    );
  const unscheduledRelationships = pairs.filter(
    (pair) =>
      pair.status === "ACTIVE" &&
      !pair.sessions.some(
        (session) => session.status !== "COMPLETED" && session.scheduledTime,
      ),
  );
  const reviewsOutstanding = pairs.filter(
    (pair) => pair.status === "ACTIVE" && pair.surveys.length === 0,
  );
  const currentPair = !admin ? openPairs[0] ?? pairs[0] : undefined;
  const nextSession = currentPair?.sessions.find(
    (session) => session.status !== "COMPLETED",
  );
  const nextAction = data?.actionItems?.[0];
  const currentCompletedCount = currentPair
    ? currentPair.sessions.filter((s) => s.status === "COMPLETED").length
    : 0;
  const currentPercent = currentPair
    ? Math.round((currentCompletedCount / 12) * 100)
    : 0;

  return (
    <main className="container">
      <AdminHero
        icon={LayoutDashboard}
        title={admin ? "Administration" : `Hello, ${user.name.split(/\s+/)[0]}`}
        subtitle={
          admin
            ? "Manage mentoring relationships, broadcast employee onboarding invites & login links, compatibility matching, employee roster, and programme progress."
            : "Prepare, meet, agree practical site actions, and track your 12-week mentoring journey."
        }
      >
        <div className="hero-meta">
          {admin && (
            <button
              type="button"
              className="button hero-button"
              onClick={() => setIsBroadcastModalOpen(true)}
            >
              <Mail size={16} />
              <span>Broadcast Invites &amp; Links</span>
            </button>
          )}
          <Link
            className={`button ${admin ? "secondary" : "hero-button"}`}
            href="/onboarding"
          >
            My profile
          </Link>
          <Link className="button secondary" href="/resources">
            Resource hub
          </Link>
        </div>
      </AdminHero>

      {error && (
        <div
          className="message error-box"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p>{error}</p>
          <button
            type="button"
            className="secondary"
            style={{ padding: "0.3rem 0.6rem" }}
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      {message && (
        <div
          className="message"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p>{message}</p>
          <button
            type="button"
            className="secondary"
            style={{ padding: "0.3rem 0.6rem" }}
            onClick={() => setMessage("")}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Headline Coloured Stat Tiles (LMS style) */}
      <div className="stat-grid">
        <StatTile
          icon={Users}
          value={activePairsCount}
          label={admin ? "Active coaching pairs · View" : "Active coaching pairs"}
          tone={toneAt(0)}
          onClick={
            admin
              ? () =>
                  setDetailModal({
                    type: "active_pairs",
                    title: "Active Coaching Pairs",
                  })
              : undefined
          }
        />
        <StatTile
          icon={CheckCircle2}
          value={completedSessionsCount}
          label={admin ? "Completed sessions · View" : "Completed sessions"}
          tone={toneAt(1)}
          onClick={
            admin
              ? () =>
                  setDetailModal({
                    type: "completed_calls",
                    title: "Completed Mentoring Calls",
                  })
              : undefined
          }
        />
        <StatTile
          icon={TrendingUp}
          value={`${rating}${surveys.length ? " / 5" : ""}`}
          label={`Growth rating (${surveys.length} reviews)`}
          tone={toneAt(2)}
          onClick={
            admin
              ? () =>
                  setDetailModal({
                    type: "reviews",
                    title: "Growth Reviews & Ratings",
                  })
              : undefined
          }
        />
        <StatTile
          icon={Briefcase}
          value={admin ? roster.length : (data?.actionItems?.length ?? 0)}
          label={admin ? "Registered employee roster" : "Open action items"}
          tone={toneAt(3)}
          onClick={admin ? () => setActiveTab("roster") : undefined}
        />
      </div>

      {/* Attention Queue (Admin) or Resume Banner (Mentor/Mentee) */}
      {admin ? (
        <section className="card">
          <h2>Needs attention</h2>
          <p className="muted">
            Exceptions that may stop a mentoring relationship from moving
            forward. Click any tile to inspect details.
          </p>
          <div className="stat-chips">
            {[
              {
                label: "Incomplete profiles",
                value: incompleteProfiles.length,
                type: "incomplete" as const,
              },
              {
                label: "Unpaired mentees",
                value: unpairedMentees.length,
                type: "unpaired" as const,
              },
              {
                label: "Awaiting approval",
                value: proposedPairsCount,
                type: "proposed" as const,
              },
              {
                label: "No next meeting",
                value: unscheduledRelationships.length,
                type: "unscheduled" as const,
              },
              {
                label: "Overdue actions",
                value: overdueActions.length,
                type: "overdue" as const,
              },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() =>
                  setDetailModal({ type: item.type, title: item.label })
                }
                className={`stat-chip${
                  item.value > 0 ? " stat-chip-alert" : ""
                }`}
              >
                <strong>{item.value}</strong>
                <span>{item.label} →</span>
              </button>
            ))}
          </div>
          {reviewsOutstanding.length > 0 && (
            <button
              type="button"
              className="link-button"
              onClick={() =>
                setDetailModal({
                  type: "reviews",
                  title: "Outstanding Growth Reviews",
                })
              }
            >
              {reviewsOutstanding.length} active relationship(s) have no saved
              review yet →
            </button>
          )}
        </section>
      ) : (
        <Link
          className="resume-card"
          href={currentPair ? `/space/${currentPair.id}` : "/onboarding"}
        >
          <ProgressRing
            percent={currentPercent}
            size={76}
            stroke={8}
            label={`${currentCompletedCount} of 12 weeks completed`}
          />
          <div className="resume-text">
            <span className="resume-kicker">
              {!currentPair
                ? "Setup profile"
                : nextSession
                  ? "Continue mentoring"
                  : "Journey complete"}
            </span>
            <strong>
              {!currentPair
                ? "Complete your 5-minute mentoring profile"
                : nextSession
                  ? `Prepare for Week ${nextSession.weekNumber} with ${
                      user.role === "MENTOR"
                        ? currentPair.mentee.name
                        : currentPair.mentor.name
                    }`
                  : "Review your completed 12-week mentoring journey"}
            </strong>
            <span>
              {!currentPair
                ? "Share your career goals, availability, and DISC style so you can be matched."
                : nextAction
                  ? `Next action due: ${nextAction.title}`
                  : `${currentCompletedCount} of 12 weeks completed · ${
                      data?.actionItems?.length ?? 0
                    } open action(s)`}
            </span>
          </div>
          <span className="resume-go">
            <PlayCircle size={32} aria-hidden="true" />
            <span className="visually-hidden">Open mentoring space</span>
          </span>
        </Link>
      )}

      <DailyQuote />

      {/* ========================================================================= */}
      {/* ADMIN DASHBOARD SECTIONS                                                  */}
      {/* ========================================================================= */}
      {admin ? (
        <div>
          <div className="report-tabs" role="tablist" aria-label="Admin sections">
            <button
              type="button"
              className={`tab-button${
                activeTab === "matching" ? " active" : ""
              }`}
              onClick={() => setActiveTab("matching")}
            >
              <Sparkles size={16} />
              <span>Matching &amp; Invitations</span>
              {proposedPairsCount > 0 && (
                <span className="badge">{proposedPairsCount}</span>
              )}
            </button>
            <button
              type="button"
              className={`tab-button${
                activeTab === "relationships" ? " active" : ""
              }`}
              onClick={() => setActiveTab("relationships")}
            >
              <Users size={16} />
              <span>Coaching Relationships ({pairs.length})</span>
            </button>
            <button
              type="button"
              className={`tab-button${activeTab === "roster" ? " active" : ""}`}
              onClick={() => setActiveTab("roster")}
            >
              <UserCheck size={16} />
              <span>Employee Roster ({roster.length})</span>
            </button>
            <button
              type="button"
              className={`tab-button${
                activeTab === "journals" ? " active" : ""
              }`}
              onClick={() => setActiveTab("journals")}
            >
              <BookOpen size={16} />
              <span>Earlier Journals ({legacyNotes.length})</span>
            </button>
          </div>

          {/* TAB 1: MATCHING & INVITATIONS */}
          {activeTab === "matching" && (
            <div className="form">
              <section className="card">
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <h2>1. Broadcast Invites &amp; Personalized Login Links</h2>
                    <p className="muted" style={{ margin: 0 }}>
                      Notify employees that they have been added as a Mentor or
                      Mentee with a direct personalized link to log in and
                      complete their profile.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setIsBroadcastModalOpen(true)}
                    >
                      <Mail size={16} />
                      <span>Open Broadcast &amp; Login Links</span>
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => void broadcastInvites()}
                    >
                      <Mail size={16} />
                      <span>
                        {busy
                          ? "Sending Emails…"
                          : "Broadcast All Invites via Email"}
                      </span>
                    </button>
                  </div>
                </div>
              </section>

              <section className="card">
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <h2>2. Compatibility recommendations</h2>
                    <p className="muted" style={{ margin: 0 }}>
                      Compare shared interests, development needs, availability
                      and communication preferences.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={loadingSuggestions || busy}
                    onClick={() => void fetchMatchSuggestions()}
                  >
                    <Sparkles size={16} />
                    <span>
                      {loadingSuggestions
                        ? "Comparing profiles…"
                        : "Preview recommendations"}
                    </span>
                  </button>
                </div>

                {suggestions !== null && (
                  <div className="record" style={{ marginTop: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <h3 style={{ margin: 0 }}>
                        Suggested Pairings ({suggestions.length})
                      </h3>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setSuggestions(null)}
                        style={{ padding: "0.35rem 0.7rem" }}
                      >
                        Close
                      </button>
                    </div>

                    {suggestions.length === 0 ? (
                      <p className="muted">
                        No new unmatched candidates available or mentors have
                        reached maximum capacity.
                      </p>
                    ) : (
                      <>
                        <div className="tile-grid">
                          {suggestions.map((s, idx) => (
                            <div key={idx} className="card" style={{ margin: 0 }}>
                              <div className="badge-row">
                                <span className="status-pill status-completed">
                                  {(s.matchScore * 100).toFixed(0)}% Match
                                </span>
                                <span className="badge">
                                  DISC: {s.mentor.discStyle || "—"} ↔{" "}
                                  {s.mentee.discStyle || "—"}
                                </span>
                              </div>
                              <div className="form-row" style={{ margin: "0.6rem 0" }}>
                                <div>
                                  <small className="muted">Mentee</small>
                                  <div>
                                    <strong>{s.mentee.name}</strong>
                                  </div>
                                  <div className="muted">{s.mentee.department}</div>
                                </div>
                                <div>
                                  <small className="muted">Mentor</small>
                                  <div>
                                    <strong>{s.mentor.name}</strong>
                                  </div>
                                  <div className="muted">{s.mentor.department}</div>
                                </div>
                              </div>
                              <ul className="requirement-list">
                                {s.reasons.map((r, rIdx) => (
                                  <li key={rIdx}>{r}</li>
                                ))}
                              </ul>
                              <div style={{ marginTop: "0.85rem" }}>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void applySuggestedMatches([
                                      {
                                        mentorCode: s.mentor.employeeCode,
                                        menteeCode: s.mentee.employeeCode,
                                      },
                                    ])
                                  }
                                >
                                  Create draft →
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: "1rem" }}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void applySuggestedMatches()}
                          >
                            <CheckCircle2 size={16} />
                            <span>
                              Create all draft pairings ({suggestions.length})
                            </span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send("/api/admin/pair", {
                      ...Object.fromEntries(new FormData(e.currentTarget)),
                      action: "CREATE_PAIR",
                    });
                  }}
                  className="form"
                  style={{
                    marginTop: "1.25rem",
                    paddingTop: "1.25rem",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <h3>Create manual pairing invitation</h3>
                  <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
                    <div className="form-row">
                      <label>
                        Mentee
                        <select name="menteeCode" required defaultValue="">
                          <option value="" disabled>
                            Choose Mentee…
                          </option>
                          {roster
                            .filter((e) => e.role === "MENTEE")
                            .map((e) => (
                              <option key={e.employeeCode} value={e.employeeCode}>
                                {e.name} (#{e.employeeCode}) · {e.department}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Mentor
                        <select name="mentorCode" required defaultValue="">
                          <option value="" disabled>
                            Choose Mentor…
                          </option>
                          {roster
                            .filter((e) => e.role === "MENTOR")
                            .map((e) => (
                              <option key={e.employeeCode} value={e.employeeCode}>
                                {e.name} (#{e.employeeCode}) · Capacity:{" "}
                                {e.mentorCapacity}
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                    <div style={{ marginTop: "1rem" }}>
                      <button type="submit">
                        <Plus size={16} />
                        <span>Create Invitation</span>
                      </button>
                    </div>
                  </fieldset>
                </form>
              </section>

              <section className="card">
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <h2 style={{ margin: 0 }}>
                    Pending invitations (
                    {pairs.filter((p) => p.status !== "ACTIVE").length})
                  </h2>
                  {pairs.some((p) => p.status === "PROPOSED") && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void send("/api/admin/pair", {
                          action: "CONFIRM_ALL",
                        })
                      }
                    >
                      <Mail size={16} />
                      <span>Send All Pending Invitations</span>
                    </button>
                  )}
                </div>
                {pairs.filter((p) => p.status !== "ACTIVE").length === 0 ? (
                  <p className="muted">
                    No pending proposals. All pairings are currently active or
                    confirmed.
                  </p>
                ) : (
                  <div className="tile-grid">
                    {pairs
                      .filter((p) => p.status !== "ACTIVE")
                      .map((p) => (
                        <div key={p.id} className="record" style={{ margin: 0 }}>
                          <div className="badge-row">
                            <span className="status-pill status-proposed">
                              {p.status}
                            </span>
                          </div>
                          <p style={{ margin: "0.4rem 0" }}>
                            <strong>Mentee:</strong> {p.mentee.name} (#
                            {p.mentee.employeeCode})
                            <br />
                            <strong>Mentor:</strong> {p.mentor.name} (#
                            {p.mentor.employeeCode})
                          </p>
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              disabled={busy}
                              style={{
                                padding: "0.4rem 0.75rem",
                                fontSize: "0.8rem",
                              }}
                              onClick={() =>
                                void send("/api/admin/pair", {
                                  action: "CONFIRM_PAIR",
                                  pairId: p.id,
                                })
                              }
                            >
                              <Mail size={14} />
                              <span>Send Invite to Mentor &amp; Mentee</span>
                            </button>
                            <Link
                              href={"/space/" + p.id}
                              className="button secondary"
                              style={{
                                padding: "0.4rem 0.75rem",
                                fontSize: "0.8rem",
                              }}
                            >
                              View Space →
                            </Link>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: ALL COACHING RELATIONSHIPS */}
          {activeTab === "relationships" && (
            <section className="card">
              <h2>All coaching relationships</h2>
              <div className="employee-search">
                <input
                  type="search"
                  placeholder="Search mentor, mentee, or status…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setSearch("")}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="chips" role="group" aria-label="Filter by status">
                {["ALL", "ACTIVE", "PROPOSED", "COMPLETED", "TERMINATED"].map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      className={`chip${
                        statusFilter === st ? " chip-active" : ""
                      }`}
                      onClick={() => setStatusFilter(st)}
                    >
                      {st}
                    </button>
                  ),
                )}
              </div>

              {filteredPairs.length === 0 ? (
                <p className="muted">
                  No coaching relationships match the current filter.
                </p>
              ) : (
                <div className="tile-grid">
                  {filteredPairs.map((p) => {
                    const completedCount = p.sessions.filter(
                      (s) => s.status === "COMPLETED",
                    ).length;
                    const progressPct = Math.min(
                      100,
                      Math.round((completedCount / 12) * 100),
                    );

                    return (
                      <div key={p.id} className="course-tile">
                        <div
                          className="tile-cover"
                          style={{
                            background: coverFor(
                              `${p.mentee.name}-${p.mentor.name}`,
                            ),
                          }}
                        >
                          <span className="tile-category">
                            {p.status}
                            {p.isOffRecord ? " · OFF RECORD" : ""}
                          </span>
                          <span className="tile-initial" aria-hidden="true">
                            {p.mentee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="tile-body">
                          <h3>
                            {p.mentee.name} &amp; {p.mentor.name}
                          </h3>
                          <p className="muted">
                            Mentee: {p.mentee.department} · Mentor:{" "}
                            {p.mentor.department}
                          </p>
                          <p className="muted">
                            {completedCount} of 12 weeks completed
                          </p>
                          <div className="tile-foot">
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              <Link
                                className="button"
                                style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem" }}
                                href={"/space/" + p.id}
                              >
                                Open Space
                              </Link>
                              {!["TERMINATED", "DECLINED"].includes(
                                p.status,
                              ) && (
                                <button
                                  type="button"
                                  className="secondary"
                                  style={{ padding: "0.45rem 0.65rem", fontSize: "0.78rem" }}
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
                                >
                                  End
                                </button>
                              )}
                            </div>
                            <ProgressRing
                              percent={progressPct}
                              size={44}
                              stroke={5}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* TAB 3: EMPLOYEE ROSTER */}
          {activeTab === "roster" && (
            <div className="employees-layout">
              <section className="card">
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0 }}>
                      Employee roster ({filteredRoster.length})
                    </h2>
                    <p className="muted" style={{ margin: "0.2rem 0 0" }}>
                      Send personalized login &amp; onboarding invitations to
                      Mentors and Mentees.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setIsBroadcastModalOpen(true)}
                    >
                      <Mail size={16} />
                      <span>Broadcast Invites &amp; Login Links</span>
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={copyAllLinks}
                    >
                      <Copy size={16} />
                      <span>
                        {copiedAll ? "✓ All Links Copied!" : "Copy All Links"}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="employee-search">
                  <input
                    type="search"
                    placeholder="Search by name, employee code, e-mail, department or designation…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setSearch("")}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="chips" role="group" aria-label="Filter role">
                  {["ALL", "MENTEE", "MENTOR"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`chip${
                        rosterRoleFilter === r ? " chip-active" : ""
                      }`}
                      onClick={() => setRosterRoleFilter(r)}
                    >
                      {r === "ALL"
                        ? "All"
                        : r === "MENTEE"
                          ? "Mentees"
                          : "Mentors"}
                    </button>
                  ))}
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Role &amp; DISC</th>
                        <th>Department &amp; Designation</th>
                        <th>Qualification &amp; Location</th>
                        <th>Capacity</th>
                        <th>Invite &amp; Login Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRoster.map((e) => {
                        const candidateUrl = getCandidateLink(e.employeeCode);
                        const isCopied = copiedCode === e.employeeCode;
                        const isSending = sendingInviteCode === e.employeeCode;
                        return (
                          <tr key={e.employeeCode}>
                            <td>
                              <div className="person">
                                <span
                                  className="avatar"
                                  style={{ background: coverFor(e.name) }}
                                  aria-hidden="true"
                                >
                                  {initialsOf(e.name)}
                                </span>
                                <div>
                                  <strong>{e.name}</strong>
                                  <br />
                                  <span className="muted">
                                    {e.employeeCode} · {e.email}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span
                                className={`status-pill${
                                  e.role === "MENTOR"
                                    ? " status-completed"
                                    : " status-in_progress"
                                }`}
                              >
                                {e.role}
                              </span>
                              {e.discStyle && (
                                <>
                                  {" "}
                                  <span className="badge">
                                    DISC {e.discStyle}
                                  </span>
                                </>
                              )}
                            </td>
                            <td>
                              <strong>{e.designation}</strong>
                              <br />
                              <span className="muted">{e.department}</span>
                            </td>
                            <td>
                              {e.highestQualification || "—"}
                              {e.location && (
                                <>
                                  <br />
                                  <span className="muted">📍 {e.location}</span>
                                </>
                              )}
                            </td>
                            <td>
                              {e.role === "MENTOR"
                                ? `${e.mentorCapacity} mentees`
                                : "—"}
                            </td>
                            <td>
                              {e.role === "MENTOR" || e.role === "MENTEE" ? (
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "0.35rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="secondary"
                                    style={{
                                      padding: "0.35rem 0.6rem",
                                      fontSize: "0.75rem",
                                    }}
                                    onClick={() =>
                                      copyToClipboard(
                                        candidateUrl,
                                        e.employeeCode,
                                      )
                                    }
                                    title={candidateUrl}
                                  >
                                    {isCopied ? (
                                      <Check size={13} />
                                    ) : (
                                      <Copy size={13} />
                                    )}
                                    <span>
                                      {isCopied ? "Copied!" : "Copy Link"}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    style={{
                                      padding: "0.35rem 0.65rem",
                                      fontSize: "0.75rem",
                                    }}
                                    disabled={isSending || busy}
                                    onClick={() =>
                                      void broadcastInvites([e.employeeCode])
                                    }
                                    title={`Send email invitation with login link to ${e.email}`}
                                  >
                                    <Mail size={13} />
                                    <span>
                                      {isSending ? "Sending…" : "Send Invite"}
                                    </span>
                                  </button>
                                </div>
                              ) : (
                                <span className="muted">Admin</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {!filteredRoster.length && (
                        <tr>
                          <td colSpan={6}>
                            No employees match the current search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <CollapsibleCard
                title="Register or update employee"
                summary="single addition"
              >
                <p className="muted">
                  Add a new Mentor or Mentee or update an existing employee code
                  in the Margdarshan roster.
                </p>
                <form onSubmit={candidate} className="form">
                  <fieldset
                    disabled={busy}
                    style={{ border: 0, padding: 0, margin: 0 }}
                  >
                    <div className="form-row">
                      <label>
                        Employee code *
                        <input
                          name="employeeCode"
                          required
                          maxLength={100}
                          placeholder="e.g. EMP401"
                        />
                      </label>
                      <label>
                        Full name *
                        <input
                          name="name"
                          required
                          maxLength={200}
                          placeholder="e.g. Rajesh Kumar"
                        />
                      </label>
                    </div>
                    <div className="form-row" style={{ marginTop: "0.75rem" }}>
                      <label>
                        Corporate Email (@rdc.in / @ultrafine.in) *
                        <input
                          name="email"
                          type="email"
                          required
                          placeholder="name@rdc.in or name@ultrafine.in"
                        />
                      </label>
                      <label>
                        Role *
                        <select name="role" defaultValue="MENTEE">
                          <option value="MENTEE">Mentee</option>
                          <option value="MENTOR">Mentor</option>
                        </select>
                      </label>
                    </div>
                    <div className="form-row" style={{ marginTop: "0.75rem" }}>
                      <label>
                        Department
                        <input
                          name="department"
                          defaultValue="Engineering"
                        />
                      </label>
                      <label>
                        Designation
                        <input
                          name="designation"
                          defaultValue="Graduate Engineer Trainee"
                        />
                      </label>
                    </div>
                    <div className="form-row" style={{ marginTop: "0.75rem" }}>
                      <label>
                        Highest qualification
                        <input
                          name="highestQualification"
                          placeholder="e.g. B.Tech Civil, M.Tech"
                        />
                      </label>
                      <label>
                        Location / Plant site
                        <input
                          name="location"
                          placeholder="e.g. Turbhe Plant, Mumbai"
                        />
                      </label>
                      <label>
                        Mentor capacity
                        <input
                          type="number"
                          name="mentorCapacity"
                          min="1"
                          max="50"
                          defaultValue="2"
                        />
                      </label>
                    </div>
                    <div style={{ marginTop: "0.85rem" }}>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          name="sendInvite"
                          defaultChecked
                        />
                        <span>
                          Automatically send welcome broadcast email informing
                          the employee they have been added as Mentor/Mentee
                          with a direct link to log in
                        </span>
                      </label>
                    </div>
                    <div style={{ marginTop: "1rem" }}>
                      <button type="submit">
                        Save employee &amp; send invite
                      </button>
                    </div>
                  </fieldset>
                </form>
              </CollapsibleCard>
            </div>
          )}

          {/* TAB 4: EARLIER JOURNALS */}
          {activeTab === "journals" && (
            <section className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <h2>Earlier journals (unlinked historical records)</h2>
                  <p className="muted" style={{ margin: 0 }}>
                    Notes that predate journals being linked to an active
                    12-week mentoring relationship.
                  </p>
                </div>
                <Link className="button secondary" href="/admin/records">
                  <FolderArchive size={16} />
                  <span>Full Record Library</span>
                </Link>
              </div>

              {legacyNotes.length === 0 ? (
                <p className="muted">No standalone unlinked journals found.</p>
              ) : (
                <div className="grid">
                  {legacyNotes.map((n) => {
                    const author = roster.find(
                      (e) => e.employeeCode === n.employeeCode,
                    );
                    return (
                      <article key={n.id} className="record" style={{ margin: 0 }}>
                        <div className="person" style={{ marginBottom: "0.5rem" }}>
                          <span
                            className="avatar"
                            style={{
                              background: coverFor(
                                author?.name || n.employeeCode,
                              ),
                            }}
                          >
                            {initialsOf(author?.name || n.employeeCode)}
                          </span>
                          <div>
                            <strong>{author?.name ?? n.employeeCode}</strong>
                            <br />
                            <span className="muted">#{n.employeeCode}</span>
                          </div>
                        </div>
                        <pre>{n.content}</pre>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* MENTEE / MENTOR DASHBOARD VIEW                                            */
        /* ========================================================================= */
        <div>
          <section className="card">
            <h2>My coaching relationships ({pairs.length})</h2>
            {pairs.length === 0 ? (
              <p className="muted">
                No active relationship assigned yet. The programme administrator
                is reviewing cohort compatibility and pairing proposals.
              </p>
            ) : (
              <div className="tile-grid">
                {pairs.map((p) => {
                  const isMeMentee =
                    p.mentee.employeeCode === user.employeeCode;
                  const partner = isMeMentee ? p.mentor : p.mentee;
                  const completedCount = p.sessions.filter(
                    (s) => s.status === "COMPLETED",
                  ).length;
                  const progressPct = Math.min(
                    100,
                    Math.round((completedCount / 12) * 100),
                  );

                  return (
                    <Link
                      key={p.id}
                      href={"/space/" + p.id}
                      className="course-tile"
                    >
                      <div
                        className="tile-cover"
                        style={{ background: coverFor(partner.name) }}
                      >
                        <span className="tile-category">
                          {isMeMentee
                            ? "Your Assigned Mentor"
                            : "Your Assigned Mentee"}
                        </span>
                        <span className="tile-initial" aria-hidden="true">
                          {partner.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="tile-body">
                        <h3>{partner.name}</h3>
                        <p className="muted">
                          {partner.designation} · {partner.department}
                        </p>
                        <div className="badge-row" style={{ marginTop: "0.25rem" }}>
                          {partner.location && (
                            <span className="badge">📍 {partner.location}</span>
                          )}
                          {partner.discStyle && (
                            <span className="badge">
                              DISC {partner.discStyle}
                            </span>
                          )}
                        </div>
                        <div className="tile-foot">
                          <span
                            className={`status-pill status-${p.status.toLowerCase()}`}
                          >
                            {p.status} · {completedCount}/12 weeks
                          </span>
                          <ProgressRing
                            percent={progressPct}
                            size={44}
                            stroke={5}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {!!data?.actionItems?.length && (
            <section className="card">
              <h2>My open action items ({data.actionItems.length})</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Due date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.actionItems.map((a) => {
                      const isOverdue = new Date(a.dueDate) < new Date();
                      return (
                        <tr key={a.id}>
                          <td>
                            <strong>{a.title}</strong>
                          </td>
                          <td>
                            {new Date(a.dueDate).toLocaleDateString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td>
                            <span
                              className={`status-pill ${
                                isOverdue
                                  ? "status-proposed"
                                  : "status-in_progress"
                              }`}
                            >
                              {isOverdue ? "OVERDUE" : a.status || "OPEN"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BROADCAST INVITES & PERSONALIZED LOGIN LINKS MODAL                        */}
      {/* ========================================================================= */}
      {isBroadcastModalOpen && (
        <div
          className="sheet-backdrop"
          style={{
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setIsBroadcastModalOpen(false)}
        >
          <div
            className="card"
            style={{
              width: "min(760px, 100%)",
              maxHeight: "88vh",
              overflowY: "auto",
              margin: 0,
            }}
            role="dialog"
            aria-label="Broadcast Invites and Personalized Login Links"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--line)",
                paddingBottom: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  Broadcast Invites &amp; Personalized Login Links
                </h2>
                <p className="muted" style={{ margin: "0.2rem 0 0" }}>
                  Inform employees that they have been added as a Mentor or
                  Mentee with a direct link to log in and complete their profile.
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close"
                onClick={() => setIsBroadcastModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div
              className="record"
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div className="chips" role="group" aria-label="Filter role">
                {["ALL", "MENTEE", "MENTOR"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`chip${
                      broadcastRoleFilter === r ? " chip-active" : ""
                    }`}
                    onClick={() => setBroadcastRoleFilter(r)}
                  >
                    {r === "ALL"
                      ? "All Candidates"
                      : r === "MENTEE"
                        ? "Mentees Only"
                        : "Mentors Only"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="secondary"
                onClick={copyAllLinks}
                disabled={
                  !roster.some(
                    (e) => e.role === "MENTEE" || e.role === "MENTOR",
                  )
                }
              >
                <Copy size={15} />
                <span>
                  {copiedAll ? "✓ All Links Copied!" : "📋 Copy All Links"}
                </span>
              </button>
            </div>

            <div
              className="form"
              style={{ maxHeight: "48vh", overflowY: "auto" }}
            >
              {roster
                .filter(
                  (e) =>
                    (e.role === "MENTEE" || e.role === "MENTOR") &&
                    (broadcastRoleFilter === "ALL" ||
                      e.role === broadcastRoleFilter),
                )
                .map((emp) => {
                  const candidateUrl = getCandidateLink(emp.employeeCode);
                  const isCopied = copiedCode === emp.employeeCode;
                  const isSending = sendingInviteCode === emp.employeeCode;
                  return (
                    <div
                      key={emp.employeeCode}
                      className="record"
                      style={{
                        margin: 0,
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <strong>{emp.name}</strong>
                          <span
                            className={`status-pill ${
                              emp.role === "MENTOR"
                                ? "status-completed"
                                : "status-in_progress"
                            }`}
                          >
                            {emp.role}
                          </span>
                          <span className="muted">#{emp.employeeCode}</span>
                        </div>
                        <div className="muted" style={{ fontSize: "0.8rem" }}>
                          {emp.email} · {emp.designation}
                        </div>
                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--indigo)",
                            fontFamily: "monospace",
                            wordBreak: "break-all",
                            marginTop: "0.2rem",
                          }}
                        >
                          {candidateUrl}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.4rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          className="secondary"
                          style={{
                            padding: "0.4rem 0.7rem",
                            fontSize: "0.78rem",
                          }}
                          onClick={() =>
                            copyToClipboard(candidateUrl, emp.employeeCode)
                          }
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                          <span>{isCopied ? "Copied!" : "Copy Link"}</span>
                        </button>
                        <button
                          type="button"
                          style={{
                            padding: "0.4rem 0.7rem",
                            fontSize: "0.78rem",
                          }}
                          disabled={isSending || busy}
                          onClick={() =>
                            void broadcastInvites([emp.employeeCode])
                          }
                        >
                          <Mail size={14} />
                          <span>{isSending ? "Sending…" : "Send Email"}</span>
                        </button>
                        <a
                          href={candidateUrl}
                          className="button secondary"
                          style={{
                            padding: "0.4rem 0.7rem",
                            fontSize: "0.78rem",
                          }}
                        >
                          <span>Open</span>
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                borderTop: "1px solid var(--line)",
                paddingTop: "1rem",
                marginTop: "1rem",
              }}
            >
              <span className="muted">
                {
                  roster.filter(
                    (e) =>
                      (e.role === "MENTEE" || e.role === "MENTOR") &&
                      (broadcastRoleFilter === "ALL" ||
                        e.role === broadcastRoleFilter),
                  ).length
                }{" "}
                candidate link(s) ready
              </span>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setIsBroadcastModalOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const targetCodes =
                      broadcastRoleFilter === "ALL"
                        ? undefined
                        : roster
                            .filter((e) => e.role === broadcastRoleFilter)
                            .map((e) => e.employeeCode);
                    void broadcastInvites(targetCodes);
                  }}
                >
                  <Mail size={16} />
                  <span>
                    {busy
                      ? "Sending Emails…"
                      : broadcastRoleFilter === "ALL"
                        ? "Send All Invites via noreply@rdc.in"
                        : `Send to All ${broadcastRoleFilter}S via noreply@rdc.in`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAIL DRILLDOWN MODAL FOR ADMIN METRICS & TABS                           */}
      {/* ========================================================================= */}
      {detailModal && (
        <div
          className="sheet-backdrop"
          style={{ alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setDetailModal(null)}
        >
          <div
            className="card"
            style={{
              width: "min(760px, 100%)",
              maxHeight: "85vh",
              overflowY: "auto",
              margin: 0,
            }}
            role="dialog"
            aria-label={detailModal.title}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--line)",
                paddingBottom: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>{detailModal.title}</h2>
                <p className="muted" style={{ margin: 0 }}>
                  Administrator Detailed Drilldown
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close"
                onClick={() => setDetailModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            {detailModal.type === "incomplete" &&
              (incompleteProfiles.length === 0 ? (
                <p className="muted">
                  All active employees have completed career goals,
                  availability, topics, and DISC.
                </p>
              ) : (
                <div className="form">
                  {incompleteProfiles.map((emp) => {
                    const missing = [
                      !emp.careerGoals && "Career Goals",
                      (!emp.topics || emp.topics.length === 0) && "Topics",
                      !emp.availability && "Availability",
                      !emp.discStyle && "DISC Profile",
                    ].filter(Boolean);

                    return (
                      <div key={emp.employeeCode} className="record" style={{ margin: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "1rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <strong>{emp.name}</strong> ({emp.employeeCode}) ·{" "}
                            <span className="badge">{emp.role}</span>
                            <div className="muted">
                              {emp.designation} · {emp.department}
                            </div>
                            <div className="badge-row" style={{ marginTop: "0.35rem" }}>
                              {missing.map((m) => (
                                <span
                                  key={m as string}
                                  className="status-pill status-proposed"
                                >
                                  Missing {m}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => {
                              setActiveTab("roster");
                              setSearch(emp.employeeCode);
                              setDetailModal(null);
                            }}
                          >
                            Inspect in Roster →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

            {detailModal.type === "unpaired" &&
              (unpairedMentees.length === 0 ? (
                <p className="muted">All mentees are paired!</p>
              ) : (
                <div className="form">
                  {unpairedMentees.map((mentee) => (
                    <div key={mentee.employeeCode} className="record" style={{ margin: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "1rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <strong>{mentee.name}</strong> ({mentee.employeeCode})
                          <div className="muted">
                            {mentee.designation} · {mentee.department}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("matching");
                            setDetailModal(null);
                            void fetchMatchSuggestions();
                          }}
                        >
                          Find Mentor Match →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

            {detailModal.type === "proposed" &&
              (() => {
                const proposedList = pairs.filter((p) =>
                  ["PROPOSED", "PENDING_ACCEPTANCE"].includes(p.status),
                );
                return proposedList.length === 0 ? (
                  <p className="muted">No relationships awaiting approval.</p>
                ) : (
                  <div className="form">
                    {proposedList.map((p) => (
                      <div key={p.id} className="record" style={{ margin: 0 }}>
                        <strong>{p.mentee.name}</strong> with{" "}
                        <strong>{p.mentor.name}</strong> ·{" "}
                        <span className="status-pill status-proposed">
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}

            {detailModal.type === "unscheduled" &&
              (unscheduledRelationships.length === 0 ? (
                <p className="muted">
                  All active relationships have meetings planned!
                </p>
              ) : (
                <div className="form">
                  {unscheduledRelationships.map((p) => (
                    <div key={p.id} className="record" style={{ margin: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "1rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <strong>
                            {p.mentee.name} &amp; {p.mentor.name}
                          </strong>
                          <div className="muted">
                            No upcoming meeting time saved
                          </div>
                        </div>
                        <Link className="button" href={"/space/" + p.id}>
                          Open Space →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

            {detailModal.type === "overdue" &&
              (overdueActions.length === 0 ? (
                <p className="muted">No overdue action items!</p>
              ) : (
                <div className="form">
                  {overdueActions.map((act) => {
                    const owner = roster.find(
                      (e) => e.employeeCode === act.employeeCode,
                    );
                    return (
                      <div key={act.id} className="record" style={{ margin: 0 }}>
                        <strong>{act.title}</strong>
                        <div className="muted">
                          Assigned to: {owner?.name || act.employeeCode} · Due:{" "}
                          {new Date(act.dueDate).toLocaleDateString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

            {detailModal.type === "reviews" &&
              (() => {
                const allRev =
                  data?.allSurveys ?? pairs.flatMap((p) => p.surveys);
                return allRev.length === 0 ? (
                  <p className="muted">No reviews submitted yet.</p>
                ) : (
                  <div className="form">
                    {allRev.map((rev, idx) => {
                      const surveyItem = rev as {
                        employeeCode?: string;
                        weekNumber?: number;
                        growthRating: number;
                        feedbackText?: string;
                      };
                      const author = roster.find(
                        (e) => e.employeeCode === surveyItem.employeeCode,
                      );
                      return (
                        <div key={idx} className="record" style={{ margin: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <strong>
                              {author?.name ||
                                surveyItem.employeeCode ||
                                "Participant"}
                            </strong>
                            <span className="badge">
                              ★ {surveyItem.growthRating} / 5
                            </span>
                          </div>
                          {surveyItem.feedbackText && (
                            <p style={{ margin: "0.4rem 0 0" }}>
                              {surveyItem.feedbackText}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            {detailModal.type === "active_pairs" &&
              (() => {
                const activeList = pairs.filter((p) => p.status === "ACTIVE");
                return activeList.length === 0 ? (
                  <p className="muted">No active coaching pairs currently.</p>
                ) : (
                  <div className="form">
                    {activeList.map((p) => {
                      const completedCount = p.sessions.filter(
                        (s) => s.status === "COMPLETED",
                      ).length;
                      return (
                        <div key={p.id} className="record" style={{ margin: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <strong>
                                {p.mentee.name} &amp; {p.mentor.name}
                              </strong>
                              <div className="muted">
                                {completedCount} of 12 weeks completed
                              </div>
                            </div>
                            <Link className="button" href={"/space/" + p.id}>
                              Open Space →
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            {detailModal.type === "completed_calls" &&
              (() => {
                const completedSessions = pairs.flatMap((p) =>
                  p.sessions
                    .filter((s) => s.status === "COMPLETED")
                    .map((s) => ({ session: s, pair: p })),
                );
                return completedSessions.length === 0 ? (
                  <p className="muted">No completed sessions logged yet.</p>
                ) : (
                  <div className="form">
                    {completedSessions.map(({ session: s, pair: p }) => (
                      <div key={s.id} className="record" style={{ margin: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <strong>Week {s.weekNumber} Session</strong> ·{" "}
                            <span className="status-pill status-completed">
                              ✓ Completed
                            </span>
                            <div className="muted">
                              {p.mentee.name} with {p.mentor.name}
                            </div>
                          </div>
                          <Link
                            className="button secondary"
                            href={"/space/" + p.id}
                          >
                            Inspect Record →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
          </div>
        </div>
      )}
    </main>
  );
}
