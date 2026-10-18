"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getDiscDetails, getHarmonyAdvice } from "@/lib/disc-guide";
import { ProgressRing } from "@/components/progress-ring";
import { CollapsibleCard } from "@/components/collapsible-card";

type Person = {
  employeeCode: string;
  name: string;
  designation: string;
  department?: string | null;
  discStyle?: string | null;
  highestQualification?: string | null;
  location?: string | null;
  email?: string;
  topics?: string[];
  challenges?: string[];
  availability?: string | null;
};

type SessionRecord = {
  id: string;
  weekNumber: number;
  version: number;
  status: string;
  scheduledTime: string | null;
  googleMeetLink: string | null;
  agenda: string | null;
  preSessionNotes: string | null;
  discussionPoints: string | null;
  insights: string | null;
  commitments: string | null;
  supportNeeded: string | null;
  mentorComments?: string | null;
  meetingNotes?: string | null;
  transcriptionNotes?: string | null;
  recordingUrl?: string | null;
  postSessionReflectionMentee: string | null;
  postSessionReflectionMentor: string | null;
};

type Action = {
  id: string;
  sessionId: string;
  employeeCode: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string;
  updatedAt: string;
  evidence: string | null;
};

type Note = {
  id: string;
  content: string;
  employeeCode?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

type Survey = {
  id: string;
  employeeCode: string;
  weekNumber: number;
  growthRating: number;
  feedbackText: string;
};

type Chat = {
  id: string;
  employeeCode: string;
  weekNumber: number;
  question: string;
  answer: string;
  mode: string;
  createdAt: string;
};

type Pair = {
  id: string;
  version: number;
  status: string;
  mentor: Person;
  mentee: Person;
  mentorCode: string;
  menteeCode: string;
  isOffRecord: boolean;
  resumeMentor: boolean;
  resumeMentee: boolean;
  sharedGoals: string | null;
  sessions: SessionRecord[];
  notebooks: Note[];
  learningNotes: Note[];
  surveys: Survey[];
  coachingMessages: Chat[];
};

type Space = { pair: Pair; actionItems: Action[] };

const themes: Record<number, string> = {
  1: "Agreement & expectations",
  2: "Communication & assertiveness",
  3: "Skills & strengths",
  4: "Career direction & planning",
  5: "Focus & resource responsibility",
  6: "Midpoint review & feedback",
  7: "Stakeholder relationships & trust",
  8: "Problem solving & asset care",
  9: "Difficult conversations",
  10: "Teamwork & delegation",
  11: "Sustaining progress & safety",
  12: "Growth review & next steps",
};

const fields = [
  ["agenda", "Agenda / चर्चा की योजना"],
  ["preSessionNotes", "Preparation / तैयारी"],
  ["discussionPoints", "What we discussed / चर्चा के मुख्य बिंदु"],
  ["insights", "Learning & insights / सीख"],
  ["commitments", "Commitments / संकल्प"],
  ["supportNeeded", "Support needed / सहयोग"],
] as const;

const displayTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }) + " IST";

const istInput = (value: string | null) =>
  value
    ? new Date(new Date(value).getTime() + 19800000).toISOString().slice(0, 16)
    : "";

type Send = (path: string, method: string, body: unknown) => Promise<boolean>;

function SessionEditor({
  record,
  pair,
  userCode,
  userRole,
  blocked,
  send,
  dirtyChanged,
}: {
  record: SessionRecord;
  pair: Pair;
  userCode: string;
  userRole: string;
  blocked: boolean;
  send: Send;
  dirtyChanged: (id: string, dirty: boolean) => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [base, setBase] = useState(record);
  const [dirty, setDirty] = useState(false);
  const [showEmbeddedMeeting, setShowEmbeddedMeeting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionDraft, setTranscriptionDraft] = useState(record.transcriptionNotes || "");
  const recognitionRef = useRef<any>(null);

  const isMentor = userCode === pair.mentorCode || userRole === "ADMIN";
  const isMentee = userCode === pair.menteeCode;

  if (!dirty && base.version !== record.version) {
    setBase(record);
    setTranscriptionDraft(record.transcriptionNotes || "");
  }

  useEffect(() => {
    if (!dirty) {
      form.current?.reset();
      setTranscriptionDraft(record.transcriptionNotes || "");
    }
  }, [base, dirty, record.transcriptionNotes]);

  // Handle Speech-to-Text Auto-Transcription
  const toggleSpeechRecognition = () => {
    if (isTranscribing) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsTranscribing(false);
      return;
    }

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRec) {
      alert("Live auto-transcription uses Web Speech API. Please use Google Chrome or Microsoft Edge for live voice recognition.");
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-IN";

      rec.onresult = (event: any) => {
        let finalChunk = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript + " ";
          }
        }
        if (finalChunk) {
          setTranscriptionDraft((prev) => {
            const updated = prev ? `${prev.trim()}\n${finalChunk.trim()}` : finalChunk.trim();
            setDirty(true);
            dirtyChanged(record.id, true);
            return updated;
          });
        }
      };

      rec.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error);
        setIsTranscribing(false);
      };

      rec.onend = () => {
        setIsTranscribing(false);
      };

      rec.start();
      recognitionRef.current = rec;
      setIsTranscribing(true);
    } catch (err) {
      console.error("Speech recognition startup error:", err);
      setIsTranscribing(false);
    }
  };

  // 1-Click Toggle Session Status
  const toggleSessionCompletion = async () => {
    const nextStatus = record.status === "COMPLETED" ? "SCHEDULED" : "COMPLETED";
    const payload = {
      version: record.version,
      status: nextStatus,
    };
    if (await send("/session/" + record.id, "PUT", payload)) {
      setDirty(false);
      dirtyChanged(record.id, false);
    }
  };

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = { version: base.version };

    // Standard session preparation / shared fields
    for (const [key] of fields) {
      const val = data.get(key);
      if (val !== null) payload[key] = String(val);
    }

    // Role-specific reflections
    if (data.get("postSessionReflectionMentee") !== null) {
      payload.postSessionReflectionMentee = String(data.get("postSessionReflectionMentee") ?? "");
    }
    if (isMentor && data.get("postSessionReflectionMentor") !== null) {
      payload.postSessionReflectionMentor = String(data.get("postSessionReflectionMentor") ?? "");
    }

    // Mentor comments
    if (isMentor && data.get("mentorComments") !== null) {
      payload.mentorComments = String(data.get("mentorComments") ?? "");
    }

    // Meeting notes and transcription
    if (data.get("meetingNotes") !== null) {
      payload.meetingNotes = String(data.get("meetingNotes") ?? "");
    }
    if (data.get("recordingUrl") !== null) {
      payload.recordingUrl = String(data.get("recordingUrl") ?? "");
    }
    payload.transcriptionNotes = transcriptionDraft;

    // Status & logistics
    payload.status = String(data.get("status") || base.status);
    const date = String(data.get("scheduledTime") ?? "");
    payload.scheduledTime = date ? date + ":00+05:30" : null;
    payload.googleMeetLink = String(data.get("googleMeetLink") ?? "");

    if (await send("/session/" + record.id, "PUT", payload)) {
      setDirty(false);
      dirtyChanged(record.id, false);
    }
  }

  // Pre-configured embedded meeting room identifier
  const embeddedRoomUrl = `https://meet.jit.si/Margdarshan-Pair-${pair.id}-Week${record.weekNumber}#config.prejoinPageEnabled=false&userInfo.displayName=${encodeURIComponent(
    isMentor ? pair.mentor.name : pair.mentee.name,
  )}`;

  return (
    <form
      ref={form}
      onSubmit={save}
      onChange={() => {
        setDirty(true);
        dirtyChanged(record.id, true);
      }}
      className="space-y-6"
    >
      {dirty && record.version !== base.version && (
        <p className="notice warning">
          A newer version is available. Your draft is still here. Copy any text
          you need, then reload the saved version.
        </p>
      )}

      {/* Top Session Status & 1-Click Completion Header */}
      <div
        className="record"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          backgroundColor: record.status === "COMPLETED" ? "#f0fdf4" : "#f8fafc",
          borderColor: record.status === "COMPLETED" ? "#86efac" : "#e2e8f0",
        }}
      >
        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: record.status === "COMPLETED" ? "#15803d" : "#64748b",
            }}
          >
            Session Status
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span
              className="pill"
              style={{
                backgroundColor: record.status === "COMPLETED" ? "#22c55e" : "#6366f1",
                color: "#ffffff",
                fontWeight: 700,
              }}
            >
              {record.status === "COMPLETED" ? "✓ COMPLETED" : record.status}
            </span>
            <span style={{ fontSize: 13, color: "#475569" }}>
              Week {record.weekNumber} of 12 · {themes[record.weekNumber]}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            disabled={blocked}
            onClick={toggleSessionCompletion}
            style={{
              backgroundColor: record.status === "COMPLETED" ? "#e2e8f0" : "#16a34a",
              color: record.status === "COMPLETED" ? "#334155" : "#ffffff",
              fontWeight: 700,
              padding: "8px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: 13,
              border: "none",
            }}
          >
            {record.status === "COMPLETED"
              ? "Re-open Week / पुनः खोलें"
              : "✓ Mark Week as Completed / सत्र पूर्ण हुआ"}
          </button>
        </div>
      </div>

      <fieldset disabled={blocked} className="space-y-6">
        {/* ========================================================================= */}
        {/* MEETING LOGISTICS & EMBEDDED VIDEO SUITE                                  */}
        {/* ========================================================================= */}
        <section className="record" style={{ backgroundColor: "#f8fafc" }}>
          <h3 style={{ marginTop: 0 }}>
            Meeting Logistics & Video Call / बैठक और वीडियो कॉल
          </h3>

          <div className="grid">
            <label>
              Meeting time (IST) / बैठक का समय
              <input
                type="datetime-local"
                name="scheduledTime"
                defaultValue={istInput(base.scheduledTime)}
              />
            </label>
            <label>
              Google Meet or Video Call Link / बैठक का लिंक
              <input
                type="url"
                name="googleMeetLink"
                placeholder="https://meet.google.com/... or paste video URL"
                defaultValue={base.googleMeetLink ?? ""}
              />
            </label>
          </div>

          {/* Quick Meeting Action Buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            {base.googleMeetLink && (
              <a
                href={base.googleMeetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  padding: "6px 14px",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                }}
              >
                📹 Launch Google Meet (New Window)
              </a>
            )}

            <button
              type="button"
              className="secondary"
              onClick={() => setShowEmbeddedMeeting((v) => !v)}
              style={{
                fontSize: 12,
                padding: "6px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              🖥️ {showEmbeddedMeeting ? "Hide Embedded Video Room" : "Open In-Portal Embedded Meeting"}
            </button>

            {!base.googleMeetLink && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  const input = form.current?.querySelector<HTMLInputElement>(
                    'input[name="googleMeetLink"]',
                  );
                  if (input) {
                    input.value = `https://meet.jit.si/Margdarshan-Pair-${pair.id}-Week${record.weekNumber}`;
                    setDirty(true);
                    dirtyChanged(record.id, true);
                  }
                }}
                style={{ fontSize: 12, padding: "6px 14px" }}
              >
                🔗 Auto-Generate Meeting Link
              </button>
            )}
          </div>

          {/* Embedded Video Call Frame */}
          {showEmbeddedMeeting && (
            <div
              style={{
                marginTop: 16,
                border: "2px solid #cbd5e1",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#0f172a",
                  color: "#f8fafc",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <span>
                  🟢 Embedded Margdarshan Video Room (Week {record.weekNumber})
                </span>
                <button
                  type="button"
                  onClick={() => setShowEmbeddedMeeting(false)}
                  style={{
                    color: "#94a3b8",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  ✕ Close Room
                </button>
              </div>
              <iframe
                src={embeddedRoomUrl}
                allow="camera; microphone; display-capture; autoplay; clipboard-write"
                style={{ width: "100%", height: "460px", border: "none" }}
                title="Margdarshan Embedded Video Conference"
              />
            </div>
          )}

          {/* Meeting Recording & Notes Row */}
          <div className="grid" style={{ marginTop: 14 }}>
            <label>
              Session Recording URL / रिकॉर्डिंग लिंक (Google Drive / Meet URL)
              <input
                type="url"
                name="recordingUrl"
                placeholder="https://drive.google.com/... or recording link"
                defaultValue={base.recordingUrl ?? ""}
              />
            </label>
            <label>
              Session Status
              <select name="status" defaultValue={base.status}>
                {["SCHEDULED", "RESCHEDULED", "COMPLETED", "MISSED"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          {base.recordingUrl && (
            <div style={{ marginTop: 8 }}>
              <a
                href={base.recordingUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "#4338ca",
                  fontWeight: 600,
                }}
              >
                ▶️ Watch Saved Session Recording
              </a>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* MENTEE PREPARATION & WEEKLY Q&A RESPONSES                                 */}
        {/* ========================================================================= */}
        <section className="record" style={{ backgroundColor: "#ffffff" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              borderBottom: "1px solid #e2e8f0",
              paddingBottom: 8,
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: "#1e293b" }}>
                Mentee Q&A Preparation & Learning / मेंटी के उत्तर
              </h3>
              <p className="muted" style={{ fontSize: 12, margin: "2px 0 0 0" }}>
                Mentee: <strong>{pair.mentee.name}</strong> ({pair.mentee.designation})
              </p>
            </div>
            <span
              className="pill"
              style={{
                backgroundColor: isMentee ? "#e0e7ff" : "#f1f5f9",
                color: isMentee ? "#3730a3" : "#475569",
              }}
            >
              {isMentee ? "You (Mentee Author)" : `${pair.mentee.name}'s Submission`}
            </span>
          </div>

          <div className="space-y-4">
            <label>
              1. Agenda / चर्चा की योजना
              <textarea
                name="agenda"
                defaultValue={base.agenda ?? ""}
                placeholder="Key topics to cover in this session..."
                maxLength={20000}
              />
            </label>

            <label>
              2. Preparation / तैयारी
              <textarea
                name="preSessionNotes"
                defaultValue={base.preSessionNotes ?? ""}
                placeholder="What have you studied, observed, or prepared before this discussion?"
                maxLength={20000}
              />
            </label>

            <label>
              3. What we discussed / चर्चा के मुख्य बिंदु
              <textarea
                name="discussionPoints"
                defaultValue={base.discussionPoints ?? ""}
                placeholder="Key points and insights explored during the conversation..."
                maxLength={20000}
              />
            </label>

            <label>
              4. Learning & insights / सीख
              <textarea
                name="insights"
                defaultValue={base.insights ?? ""}
                placeholder="What was your biggest takeaway from this session?"
                maxLength={20000}
              />
            </label>

            <label>
              5. Commitments & Experiments / संकल्प
              <textarea
                name="commitments"
                defaultValue={base.commitments ?? ""}
                placeholder="Specific actions you will take on the plant/site before the next week..."
                maxLength={20000}
              />
            </label>

            <label>
              6. Support needed / सहयोग
              <textarea
                name="supportNeeded"
                defaultValue={base.supportNeeded ?? ""}
                placeholder="Support, telemetry access, or coaching needed from mentor/leadership..."
                maxLength={20000}
              />
            </label>

            <label>
              Mentee Reflection / मेंटी का आत्मचिंतन
              <textarea
                name="postSessionReflectionMentee"
                defaultValue={base.postSessionReflectionMentee ?? ""}
                placeholder="Personal reflection on your progress and growth this week..."
                maxLength={20000}
              />
            </label>

            <button
              type="submit"
              style={{
                backgroundColor: "#4f46e5",
                color: "#fff",
                fontWeight: 700,
                padding: "8px 18px",
                borderRadius: 8,
              }}
            >
              💾 Save Preparation & Answers / उत्तर सहेजें
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* MENTOR GUIDANCE & COMMENTS (DIRECTLY BELOW MENTEE ANSWERS)               */}
        {/* ========================================================================= */}
        <section
          className="record"
          style={{
            backgroundColor: "#f0fdf4",
            borderColor: "#bbf7d0",
            borderWidth: 2,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: "#166534" }}>
                Mentor Guidance, Feedback & Comments / मेंटर की टिप्पणियां और मार्गदर्शन
              </h3>
              <p style={{ fontSize: 12, color: "#15803d", margin: "2px 0 0 0" }}>
                Mentor: <strong>{pair.mentor.name}</strong> ({pair.mentor.designation})
              </p>
            </div>
            <span
              className="pill"
              style={{
                backgroundColor: "#dcfce7",
                color: "#166534",
                fontWeight: 700,
              }}
            >
              Mentor Review
            </span>
          </div>

          {/* If Mentor: Rich Editor for Mentor Comments */}
          {isMentor ? (
            <div className="space-y-4">
              <label>
                Mentor Guidance & Actionable Feedback for {pair.mentee.name}
                <textarea
                  name="mentorComments"
                  defaultValue={base.mentorComments ?? ""}
                  placeholder="Share feedback on mentee's answers, praise for initiative, guidance on RDC plant operations, and agreed next steps..."
                  rows={4}
                  maxLength={20000}
                  style={{
                    borderColor: "#86efac",
                    backgroundColor: "#ffffff",
                    fontSize: 13,
                  }}
                />
              </label>

              <label>
                My Reflection (Mentor) / मेरा आत्मचिंतन (मेंटर)
                <textarea
                  name="postSessionReflectionMentor"
                  defaultValue={base.postSessionReflectionMentor ?? ""}
                  placeholder="Reflect on your coaching style, listening balance, and progress observed..."
                  rows={2}
                  maxLength={20000}
                />
              </label>

              <button
                type="submit"
                style={{
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  fontWeight: 700,
                  padding: "8px 18px",
                  borderRadius: 8,
                }}
              >
                💾 Save Mentor Feedback & Comments / मार्गदर्शन सहेजें
              </button>
            </div>
          ) : (
            /* If Mentee: High-Visibility View of Mentor's Feedback */
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: 14,
                borderRadius: 8,
                border: "1px solid #bbf7d0",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    backgroundColor: "#dcfce7",
                    color: "#166534",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {pair.mentor.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: "0 0 6px 0",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#166534",
                    }}
                  >
                    Feedback from {pair.mentor.name}:
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "#1e293b",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.5,
                    }}
                  >
                    {base.mentorComments ||
                      "Your mentor has not added guidance comments for this week yet. They will appear here once saved."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* IN-PORTAL MEETING NOTES & AUTO-TRANSCRIBE                                 */}
        {/* ========================================================================= */}
        <section className="record" style={{ backgroundColor: "#f8fafc" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>
                In-Portal Meeting Minutes & Live Transcription
              </h3>
              <p className="muted" style={{ fontSize: 12, margin: "2px 0 0 0" }}>
                Saved securely in the Margdarshan portal for both participants and admins.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: isTranscribing ? "#ef4444" : "#4f46e5",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
              }}
            >
              {isTranscribing ? "⏹️ Stop Voice Transcribe" : "🎙️ Start Auto-Transcribe"}
            </button>
          </div>

          {isTranscribing && (
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                borderRadius: 6,
                fontSize: 12,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#ef4444",
                  display: "inline-block",
                }}
              />
              Listening to speech via microphone... Transcribed text will appear below.
            </div>
          )}

          <div className="grid">
            <label>
              Live Meeting Minutes & Decisions / बैठक के मुख्य बिंदु
              <textarea
                name="meetingNotes"
                defaultValue={base.meetingNotes ?? ""}
                placeholder="Log real-time decisions, technical action points, or customer site takeaways..."
                rows={3}
                maxLength={20000}
              />
            </label>

            <label>
              Speech Transcription / स्वचालित ट्रांसक्रिप्शन
              <textarea
                value={transcriptionDraft}
                onChange={(e) => {
                  setTranscriptionDraft(e.target.value);
                  setDirty(true);
                  dirtyChanged(record.id, true);
                }}
                placeholder="Auto-transcribed speech will be captured here. You can also edit or copy notes."
                rows={3}
                maxLength={20000}
              />
            </label>
          </div>

          <div style={{ marginTop: 10 }}>
            <button
              type="submit"
              className="secondary"
              style={{ fontSize: 12, padding: "6px 14px" }}
            >
              💾 Save Meeting Notes & Transcription
            </button>
          </div>
        </section>
      </fieldset>

      {/* Dirty Draft Controls */}
      {dirty && (
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (
                window.confirm(
                  "Discard unsaved changes and reload the saved record?",
                )
              ) {
                setDirty(false);
                dirtyChanged(record.id, false);
                setBase(record);
                setTranscriptionDraft(record.transcriptionNotes || "");
                form.current?.reset();
              }
            }}
          >
            Reload saved version
          </button>
        </div>
      )}

      {/* Historical Reflections Accordion */}
      <details className="record" style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>
          View saved reflections from both participants
        </summary>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <div style={{ padding: 10, backgroundColor: "#f8fafc", borderRadius: 6 }}>
            <strong style={{ fontSize: 12, color: "#64748b" }}>
              {pair.mentee.name} (Mentee):
            </strong>
            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#1e293b" }}>
              {record.postSessionReflectionMentee || "No reflection saved yet."}
            </p>
          </div>

          <div style={{ padding: 10, backgroundColor: "#f8fafc", borderRadius: 6 }}>
            <strong style={{ fontSize: 12, color: "#64748b" }}>
              {pair.mentor.name} (Mentor):
            </strong>
            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#1e293b" }}>
              {record.postSessionReflectionMentor || "No reflection saved yet."}
            </p>
          </div>
        </div>
      </details>
    </form>
  );
}

export default function MentoringSpace() {
  const { pairId } = useParams<{ pairId: string }>();
  const { user, loading } = useAuth();
  const [data, setData] = useState<Space | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [week, setWeek] = useState(1);
  const [tab, setTab] = useState("Session");
  const [history, setHistory] = useState<
    Array<{
      id: string;
      action: string;
      performedByCode: string;
      timestamp: string;
      details: string;
    }>
  >([]);
  const dirty = useRef(new Set<string>());

  const reload = useCallback(async () => {
    const res = await fetch("/api/pair/" + pairId, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Unable to load records.");
    setData(json);
  }, [pairId]);

  useEffect(() => {
    if (!user) return;
    void reload().catch((e) => setError(e.message));
    const timer = setInterval(
      () =>
        void reload().catch(() =>
          setError("Connection interrupted. Saving may be unavailable."),
        ),
      10000,
    );
    return () => clearInterval(timer);
  }, [user, reload]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current.size) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const send: Send = async (path, method, body) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/pair/" + pairId + path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Save failed.");
      await reload();
      setNotice("Saved / सहेजा गया");
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Connection failed. Your draft has not been cleared.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) return <main className="coach">Checking sign-in…</main>;
  if (!data)
    return (
      <main className="coach">
        <Link href="/dashboard">Dashboard</Link>
        <p role="alert">{error || "Loading mentoring records…"}</p>
      </main>
    );

  const pair = data.pair;
  const session = pair.sessions.find((s) => s.weekNumber === week);
  const participant = [pair.mentorCode, pair.menteeCode].includes(
    user.employeeCode,
  );
  const isMentor = user.employeeCode === pair.mentorCode || user.role === "ADMIN";
  const ended = ["TERMINATED", "DECLINED"].includes(pair.status);
  const blocked = busy || pair.isOffRecord || ended;

  const name = (code?: string) =>
    code === pair.mentorCode
      ? pair.mentor.name
      : code === pair.menteeCode
        ? pair.mentee.name
        : code ?? "Unknown author";

  const dirtyChanged = (id: string, value: boolean) => {
    if (value) dirty.current.add(id);
    else dirty.current.delete(id);
  };

  async function simpleSubmit(
    e: FormEvent<HTMLFormElement>,
    path: string,
    method: string,
    extra: Record<string, unknown> = {},
  ) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = { ...Object.fromEntries(new FormData(form)), ...extra };
    if (await send(path, method, body)) {
      form.reset();
      dirty.current.delete(path);
    }
  }

  const completedSessionsCount = pair.sessions.filter(
    (s) => s.status === "COMPLETED",
  ).length;
  const progressPct = Math.round((completedSessionsCount / 12) * 100);

  return (
    <main className="coach">
      <section className="resume-card">
        <ProgressRing
          percent={progressPct}
          size={72}
          stroke={8}
          label={`${completedSessionsCount} of 12 weeks completed`}
        />
        <div className="resume-text">
          <span className="resume-kicker">
            {pair.status} · 12-Week Mentoring Space
          </span>
          <strong>
            {pair.mentee.name} &amp; {pair.mentor.name}
          </strong>
          <span>
            {pair.mentee.designation} ({pair.mentee.department}) ·{" "}
            {completedSessionsCount} of 12 weeks completed
          </span>
        </div>
        {participant && !ended && (
          <button
            type="button"
            className={pair.isOffRecord ? "secondary" : "danger"}
            disabled={busy}
            onClick={() => {
              if (
                !pair.isOffRecord &&
                dirty.current.size &&
                !window.confirm(
                  "You have unsaved drafts. Going off record pauses saving; drafts stay in this tab. Continue?",
                )
              )
                return;
              void send("/mode", "PUT", {
                action: pair.isOffRecord ? "RESUME" : "PAUSE",
                version: pair.version,
              });
            }}
          >
            {pair.isOffRecord
              ? "Resume recording / सहमति दें"
              : "Go off record / रिकॉर्ड रोकें"}
          </button>
        )}
      </section>

      {pair.isOffRecord && (
        <div className="notice warning">
          <strong>Off record / ऑफ द रिकॉर्ड</strong>
          <p>
            Saving and new AI requests are paused. Continue your conversation
            outside the app. Both participants must agree to resume.
          </p>
          <p className="muted">
            Resume agreement: Mentor {pair.resumeMentor ? "✓" : "pending"} ·
            Mentee {pair.resumeMentee ? "✓" : "pending"}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}

      {/* Shared Goals Section */}
      <CollapsibleCard
        title="Shared growth goals / साझा विकास लक्ष्य"
        summary={pair.sharedGoals ? "Goals recorded" : "Add outcomes & review date"}
        defaultOpen={!pair.sharedGoals}
      >
        <pre>
          {pair.sharedGoals ||
            "Agree on specific outcomes, evidence of progress and a review date."}
        </pre>
        <form
          className="form"
          onChange={() => dirty.current.add("/goals")}
          onSubmit={(e) =>
            void simpleSubmit(e, "/goals", "PUT", { version: pair.version })
          }
        >
          <fieldset
            disabled={blocked}
            style={{ border: 0, padding: 0, margin: 0 }}
          >
            <label>
              Add or revise the goals
              <textarea
                name="sharedGoals"
                required
                placeholder="Outcome · Evidence · Target date · Support"
                maxLength={20000}
              />
            </label>
            <div style={{ marginTop: "0.75rem" }}>
              <button>Save goals</button>
            </div>
          </fieldset>
        </form>
      </CollapsibleCard>

      {/* Main Navigation Tabs */}
      <div className="report-tabs" role="tablist" aria-label="Space views">
        {["Session", "Actions", "Journey"].map((t) => (
          <button
            key={t}
            type="button"
            className={`tab-button${tab === t ? " active" : ""}`}
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              if (t === "Journey")
                void fetch("/api/pair/" + pairId + "/history")
                  .then(async (r) => {
                    const j = await r.json();
                    if (!r.ok) throw new Error(j.error);
                    setHistory(j.history);
                  })
                  .catch((e) => setError(e.message));
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 12-Week Roadmap Bar */}
      <div className="module-tab-list" role="tablist" aria-label="Programme weeks">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
          const isDone =
            pair.sessions.find((s) => s.weekNumber === w)?.status ===
            "COMPLETED";
          return (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={week === w}
              className={`module-tab${
                week === w ? " module-tab-active" : ""
              }`}
              onClick={() => setWeek(w)}
            >
              Week {w}
              {isDone && (
                <span className="module-tab-status" aria-label="completed">
                  {" "}
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="muted" style={{ marginBottom: "0.75rem" }}>
        Week {week} · {themes[week] || `Week ${week}`} ·{" "}
        {completedSessionsCount}/12 completed
      </p>

      {/* ========================================================================= */}
      {/* SESSION TAB                                                               */}
      {/* ========================================================================= */}
      <section className="card" hidden={tab !== "Session"}>
        <h2>Session record / बैठक का रिकॉर्ड</h2>
        <div
          className="record"
          style={{ backgroundColor: "#eef2ff", borderColor: "#c7d2fe" }}
        >
          <h3 style={{ marginTop: 0 }}>Conversation card · Week {week}</h3>
          <p className="muted">Use these prompts to keep the meeting practical:</p>
          <ol style={{ marginBottom: 0 }}>
            <li>What would useful progress on “{themes[week]}” look like?</li>
            <li>Which recent workplace example should we examine?</li>
            <li>What options or small experiment could help?</li>
            <li>What will each person do before the next session?</li>
          </ol>
        </div>

        {!session && (
          <p>
            Sessions become available after both participants accept the
            invitation.
          </p>
        )}

        {pair.sessions.map((s) => (
          <div key={s.id} hidden={s.weekNumber !== week}>
            <SessionEditor
              record={s}
              pair={pair}
              userCode={user.employeeCode}
              userRole={user.role}
              blocked={blocked}
              send={send}
              dirtyChanged={dirtyChanged}
            />
          </div>
        ))}
      </section>

      {/* ========================================================================= */}
      {/* ASK COACH AI ASSISTANCE — RESTRICTED TO MENTORS ONLY                       */}
      {/* ========================================================================= */}
      {isMentor && (
        <section className="card" hidden={tab !== "Session"}>
          <h2>Session coach / बातचीत सहायक (Mentors Only)</h2>
          <p className="muted">
            Ask practical questions regarding RDC Concrete plant operations, mentoring GETs, or GROW conversation approaches. Questions and answers are visible to administrators and mentors.
          </p>
          {pair.coachingMessages
            .filter((c) => c.weekNumber === week)
            .map((c) => (
              <article key={c.id} className="record">
                <p className="muted">
                  {name(c.employeeCode)} · {displayTime(c.createdAt)} ·{" "}
                  {c.mode === "AI"
                    ? "AI response"
                    : c.mode === "PENDING"
                      ? "Response pending or interrupted"
                      : "Guided GROW prompt"}
                </p>
                <h3 style={{ margin: "4px 0 8px 0" }}>{c.question}</h3>
                <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {c.answer}
                </pre>
              </article>
            ))}
          <form
            onChange={() => dirty.current.add("/ai")}
            onSubmit={(e) =>
              void simpleSubmit(e, "/ai", "POST", { weekNumber: week })
            }
          >
            <fieldset disabled={blocked}>
              <label>
                Ask coach in English (or Hindi)
                <textarea
                  name="message"
                  maxLength={8000}
                  required
                  placeholder="e.g. How do I help my mentee improve transit mixer turnaround time and assertive radio communication?"
                />
              </label>
              <button>Ask coach</button>
            </fieldset>
          </form>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ACTIONS TAB                                                               */}
      {/* ========================================================================= */}
      <section className="card" hidden={tab !== "Actions"}>
        <h2>Actions & evidence / कार्य और प्रमाण</h2>
        {data.actionItems
          .filter((a) => a.sessionId === session?.id)
          .map((a) => (
            <article className="record" key={a.id}>
              <h3>{a.title}</h3>
              <p>
                {name(a.employeeCode)} · Due {displayTime(a.dueDate)} ·{" "}
                {a.status !== "COMPLETED" && new Date(a.dueDate) < new Date()
                  ? "OVERDUE"
                  : a.status}
              </p>
              <pre>{a.description}</pre>
              <pre>{a.evidence}</pre>
              <form
                onSubmit={(e) =>
                  void simpleSubmit(e, "/action", "PUT", {
                    actionItemId: a.id,
                    updatedAt: a.updatedAt,
                  })
                }
              >
                <fieldset disabled={blocked}>
                  <label>
                    Status
                    <select
                      name="status"
                      defaultValue={
                        a.status === "OVERDUE" ? "PENDING" : a.status
                      }
                    >
                      {["PENDING", "IN_PROGRESS", "COMPLETED"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Evidence of completion
                    <textarea name="evidence" defaultValue={a.evidence ?? ""} />
                  </label>
                  <button>Update action</button>
                </fieldset>
              </form>
            </article>
          ))}
        <form
          onChange={() => dirty.current.add("/action")}
          onSubmit={(e) =>
            void simpleSubmit(e, "/action", "POST", { sessionId: session?.id })
          }
        >
          <fieldset disabled={blocked || !session}>
            <label>
              Next action
              <input name="title" required maxLength={500} />
            </label>
            <label>
              What will demonstrate success?
              <textarea name="description" />
            </label>
            <div className="grid">
              <label>
                Owner
                <select name="employeeCode">
                  <option value={pair.menteeCode}>{pair.mentee.name}</option>
                  <option value={pair.mentorCode}>{pair.mentor.name}</option>
                </select>
              </label>
              <label>
                Due date (IST)
                <input type="date" name="dueDate" required />
              </label>
            </div>
            <button>Add action</button>
          </fieldset>
        </form>
      </section>

      {/* ========================================================================= */}
      {/* JOURNEY TAB                                                               */}
      {/* ========================================================================= */}
      <section className="card" hidden={tab !== "Journey"}>
        <h2>Communication styles / संवाद शैली</h2>
        <p className="muted">
          DISC is a conversation starter for adapting communication. It is not a diagnosis or performance assessment.
        </p>

        {(() => {
          const mentorDisc = getDiscDetails(pair.mentor.discStyle);
          const menteeDisc = getDiscDetails(pair.mentee.discStyle);
          const harmony = getHarmonyAdvice(pair.mentor.discStyle, pair.mentee.discStyle);

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 16 }}>
              {/* Synergy Header */}
              <div className="record" style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}>
                <h3 style={{ color: "#166534", margin: "0 0 6px 0" }}>{harmony.title}</h3>
                <p style={{ fontWeight: "bold", fontSize: 13, color: "#15803d", margin: "0 0 8px 0" }}>
                  Rating: {harmony.harmonyScore}
                </p>
                <p style={{ fontSize: 13, color: "#1e293b", margin: "0 0 10px 0" }}>{harmony.advice}</p>
                <div style={{ fontSize: 12, color: "#334155" }}>
                  <strong>Collaboration Rules of Thumb:</strong>
                  <ul style={{ margin: "6px 0 0 0", paddingLeft: 20 }}>
                    {harmony.tips.map((tip, idx) => (
                      <li key={idx} style={{ marginBottom: 4 }}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Side-by-side Profiles */}
              <div className="grid">
                {/* Mentor Card */}
                <article className="record" style={{ backgroundColor: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>
                      Mentor Profile
                    </span>
                    <span style={{ fontSize: 11, fontWeight: "bold", padding: "2px 8px", borderRadius: 4, backgroundColor: "#e2e8f0" }}>
                      Style: {pair.mentor.discStyle || "Not recorded"}
                    </span>
                  </div>
                  <h3 style={{ margin: "8px 0 2px 0" }}>{pair.mentor.name}</h3>
                  <p className="muted" style={{ fontSize: 12, margin: "0 0 8px 0" }}>
                    {mentorDisc.name} · <span lang="hi">{mentorDisc.hindiName}</span>
                  </p>
                  <p style={{ fontSize: 13, margin: "0 0 8px 0" }}>{mentorDisc.overview}</p>
                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    <strong>Communication Preference:</strong>
                    <p style={{ margin: "2px 0 8px 0", color: "#475569" }}>{mentorDisc.communicationStyle}</p>
                    <strong>Mentoring Role:</strong>
                    <p style={{ margin: "2px 0 0 0", color: "#475569" }}>{mentorDisc.mentoringAdvice.asMentor}</p>
                  </div>
                </article>

                {/* Mentee Card */}
                <article className="record" style={{ backgroundColor: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>
                      Mentee Profile
                    </span>
                    <span style={{ fontSize: 11, fontWeight: "bold", padding: "2px 8px", borderRadius: 4, backgroundColor: "#e2e8f0" }}>
                      Style: {pair.mentee.discStyle || "Not recorded"}
                    </span>
                  </div>
                  <h3 style={{ margin: "8px 0 2px 0" }}>{pair.mentee.name}</h3>
                  <p className="muted" style={{ fontSize: 12, margin: "0 0 8px 0" }}>
                    {menteeDisc.name} · <span lang="hi">{menteeDisc.hindiName}</span>
                  </p>
                  <p style={{ fontSize: 13, margin: "0 0 8px 0" }}>{menteeDisc.overview}</p>
                  <div style={{ fontSize: 12, marginTop: 8 }}>
                    <strong>Communication Preference:</strong>
                    <p style={{ margin: "2px 0 8px 0", color: "#475569" }}>{menteeDisc.communicationStyle}</p>
                    <strong>Developmental Focus:</strong>
                    <p style={{ margin: "2px 0 0 0", color: "#475569" }}>{menteeDisc.mentoringAdvice.asMentee}</p>
                  </div>
                </article>
              </div>
            </div>
          );
        })()}
      </section>

      {(["Learning journal", "Notebook"] as const).map((t) => (
        <section className="card" hidden={tab !== "Journey"} key={t}>
          <h2>{t}</h2>
          <p className="muted">
            Shared with this pair and the administrators. Saved entries remain
            available below.
          </p>
          <form
            onChange={() =>
              dirty.current.add(t === "Notebook" ? "/notebook" : "/privatenote")
            }
            onSubmit={(e) =>
              void simpleSubmit(
                e,
                t === "Notebook" ? "/notebook" : "/privatenote",
                t === "Notebook" ? "PUT" : "POST",
              )
            }
          >
            <fieldset disabled={blocked}>
              <label>
                New entry / नई प्रविष्टि
                <textarea name="content" required maxLength={20000} />
              </label>
              <button>Save entry</button>
            </fieldset>
          </form>
          {(t === "Notebook" ? pair.notebooks : pair.learningNotes).map((n) => (
            <article className="record" key={n.id}>
              <p className="muted">
                {name(n.employeeCode ?? n.updatedBy)} ·{" "}
                {displayTime((n.createdAt ?? n.updatedAt)!)}
              </p>
              <pre>{n.content}</pre>
            </article>
          ))}
        </section>
      ))}

      {/* Midpoint & Closing Reviews (Week 6 and Week 12) */}
      <section className="card" hidden={tab !== "Journey"}>
        <h2>Midpoint & closing reviews (Week 6 & Week 12)</h2>
        {pair.surveys.map((s) => (
          <article key={s.id} className="record">
            <h3>
              Week {s.weekNumber} · {name(s.employeeCode)} · {s.growthRating}/5
            </h3>
            <pre>{s.feedbackText}</pre>
          </article>
        ))}
        {participant && [6, 12].includes(week) && (
          <form
            onChange={() => dirty.current.add("/survey")}
            onSubmit={(e) => {
              const rating = Number(
                new FormData(e.currentTarget).get("growthRating"),
              );
              void simpleSubmit(e, "/survey", "POST", {
                weekNumber: week,
                growthRating: rating,
              });
            }}
          >
            <fieldset disabled={blocked}>
              <label>
                Growth rating
                <select name="growthRating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                Evidence of growth, remaining gaps and next steps
                <textarea name="feedbackText" required />
              </label>
              <button>Save my review</button>
            </fieldset>
          </form>
        )}
        {![6, 12].includes(week) && (
          <p className="muted">Select Week 6 (Midpoint) or Week 12 (Closing) to submit a formal review.</p>
        )}
      </section>

      {/* Record History */}
      <section className="card" hidden={tab !== "Journey"}>
        <h2>Record history</h2>
        {history.map((h) => (
          <details className="record" key={h.id}>
            <summary>
              {h.action} · {name(h.performedByCode)} ·{" "}
              {displayTime(h.timestamp)}
            </summary>
            <pre>{JSON.stringify(JSON.parse(h.details), null, 2)}</pre>
          </details>
        ))}
        {!history.length && (
          <p>
            No revision history is available yet. Earlier records may predate
            audit tracking.
          </p>
        )}
      </section>
    </main>
  );
}
