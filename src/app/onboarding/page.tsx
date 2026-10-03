"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth, type User } from "@/context/AuthContext";
import { COMPETENCIES } from "@/lib/competencies";
import { getDiscDetails } from "@/lib/disc-guide";
const DISC_QUESTIONS = [
  {
    id: 1,
    question: "How do you typically approach a new task or problem?",
    options: [
      {
        key: "D",
        text: "Directly and quickly, focusing on immediate results and solutions.",
      },
      {
        key: "I",
        text: "Collaboratively and enthusiastically, brainstorming with team members.",
      },
      {
        key: "S",
        text: "Methodically and patiently, ensuring stability and team alignment before proceeding.",
      },
      {
        key: "C",
        text: "Analytically, gathering all specifications and studying the details first.",
      },
    ],
  },
  {
    id: 2,
    question: "Which best describes your communication style in meetings?",
    options: [
      {
        key: "D",
        text: "Brief, direct, and focused on targets (get-to-the-point).",
      },
      { key: "I", text: "Expressive, energetic, and highly conversational." },
      {
        key: "S",
        text: "Quiet, active listener, supportive, and accommodating of others.",
      },
      {
        key: "C",
        text: "Precise, objective, and backed by documents or data.",
      },
    ],
  },
  {
    id: 3,
    question: "What motivates you the most in a professional environment?",
    options: [
      {
        key: "D",
        text: "Overcoming obstacles, winning challenges, and having autonomy.",
      },
      {
        key: "I",
        text: "Receiving recognition, social approval, and team camaraderie.",
      },
      {
        key: "S",
        text: "Working in a stable team with clear guidelines and mutual support.",
      },
      {
        key: "C",
        text: "Achieving high standards, quality excellence, and logic-driven organization.",
      },
    ],
  },
  {
    id: 4,
    question: "When under stress or tight deadlines, how do you respond?",
    options: [
      {
        key: "D",
        text: "I become assertive, demanding, and highly focused on output.",
      },
      {
        key: "I",
        text: "I talk more, try to keep spirits high, and may become overly optimistic.",
      },
      {
        key: "S",
        text: "I slow down to ensure accuracy, keep quiet, and cooperate.",
      },
      {
        key: "C",
        text: "I become highly critical, detail-obsessed, and cautious.",
      },
    ],
  },
  {
    id: 5,
    question: "What kind of mentoring relationship is most valuable to you?",
    options: [
      {
        key: "D",
        text: "Action-driven, targeting quick growth and hard targets.",
      },
      {
        key: "I",
        text: "Creative, open-ended, filled with dialogue and big-picture ideas.",
      },
      {
        key: "S",
        text: "Structured, stable, with empathetic listening and steady feedback.",
      },
      {
        key: "C",
        text: "Resource-rich, technical, focused on code quality and standard operating procedures.",
      },
    ],
  },
];

function ProfileForm({
  user,
  refresh,
}: {
  user: User;
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const setupSteps = [
    { label: "Goal or challenge", done: Boolean(user.careerGoals || user.challenges.length) },
    { label: "Development topics", done: user.topics.length > 0 },
    { label: "Availability", done: Boolean(user.availability) },
    { label: "Communication preference", done: Boolean(user.commStyleNotes) },
    { label: "DISC reflection", done: Boolean(user.discStyle) },
  ];
  const completedSteps = setupSteps.filter((step) => step.done).length;
  async function submit(e: FormEvent<HTMLFormElement>, assessment = false) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    const body = assessment
      ? {
          answers: DISC_QUESTIONS.map((q) =>
            String(values.get("question-" + q.id)),
          ),
        }
      : {
          careerGoals: String(values.get("careerGoals") ?? ""),
          highestQualification: String(values.get("highestQualification") ?? ""),
          location: String(values.get("location") ?? ""),
          topics: values.getAll("topics"),
          challenges: String(values.get("challenges") ?? "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          availability: String(values.get("availability") ?? ""),
          commStyleNotes: String(values.get("commStyleNotes") ?? ""),
          isConsentShared: values.get("consent") === "on",
        };
    try {
      const r = await fetch(
        assessment ? "/api/disc/generate" : "/api/employee/profile",
        {
          method: assessment ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await refresh();
      setMessage("Saved / सहेजा गया");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }

  const userDisc = getDiscDetails(user.discStyle);

  return (
    <>
      <section className="card">
        <h2>5-minute setup · {completedSteps}/{setupSteps.length} complete</h2>
        <p className="muted">A useful match needs only a goal, a few interests and a simple way to meet.</p>
        <div className="grid">
          {setupSteps.map((step) => (
            <div className="record" key={step.label} style={{ padding: 10 }}>
              {step.done ? "✓" : "○"} {step.label}
            </div>
          ))}
        </div>
        <p className="muted">Qualification and location add context but are optional for the proof of concept.</p>
      </section>
      <section className="card">
        <h2>{user.name}</h2>
        <p>
          {user.email} · {user.role} · {user.employeeCode} · {user.designation} ({user.department})
        </p>
        <p className="notice">
          Your saved profile is available to programme administrators and your
          mentoring counterpart. Share only what you want recorded. English and
          Hindi are accepted.
        </p>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <form onSubmit={(e) => void submit(e)}>
          <fieldset disabled={busy}>
            <div className="grid">
              <label>
                Highest Qualification / उच्चतम योग्यता
                <input
                  name="highestQualification"
                  defaultValue={user.highestQualification ?? ""}
                  placeholder="e.g. B.Tech Civil, B.E. Mechanical, M.Tech, MBA"
                />
              </label>
              <label>
                Location &amp; Plant Site / कार्यस्थल एवं प्लांट
                <input
                  name="location"
                  defaultValue={user.location ?? ""}
                  placeholder="e.g. Turbhe Plant, Mumbai / Pune / Gurgaon"
                />
              </label>
            </div>

            <label>
              Career goals / करियर के लक्ष्य
              <textarea
                name="careerGoals"
                defaultValue={user.careerGoals ?? ""}
                maxLength={20000}
                placeholder="What are your key career aspirations and growth targets over the next 1-3 years?"
              />
            </label>
            <fieldset>
              <legend>Competencies to develop or share / कौशल</legend>
              {COMPETENCIES.map((topic) => (
                <label
                  key={topic}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontWeight: 400,
                  }}
                >
                  <input
                    style={{ width: 18, margin: 0 }}
                    type="checkbox"
                    name="topics"
                    value={topic}
                    defaultChecked={user.topics.includes(topic)}
                  />
                  {topic}
                </label>
              ))}
            </fieldset>
            <label>
              Development priorities (one per line) / विकास की प्राथमिकताएँ
              <textarea
                name="challenges"
                defaultValue={user.challenges.join("\n")}
                maxLength={5000}
                placeholder="e.g. Plant telemetry calibration&#10;Dispatch turnaround optimization&#10;Assertive communication"
              />
            </label>
            <label>
              Availability / उपलब्धता
              <input
                name="availability"
                defaultValue={user.availability ?? ""}
                placeholder="e.g. Tuesdays &amp; Thursdays, 4:00 PM - 5:30 PM"
              />
            </label>
            <label>
              How I prefer to communicate / संवाद की पसंद
              <textarea
                name="commStyleNotes"
                defaultValue={user.commStyleNotes ?? ""}
                placeholder="e.g. Direct and action-focused / Step-by-step with written notes"
              />
            </label>
            <label style={{ display: "flex", gap: 10 }}>
              <input
                style={{ width: 18 }}
                name="consent"
                type="checkbox"
                required
                defaultChecked={user.isConsentShared}
              />
              I understand who can see my saved profile.
            </label>
            <button>Save profile</button>
          </fieldset>
        </form>
      </section>

      <section className="card">
        <h2>DISC communication reflection</h2>
        <p className="muted">A short conversation starter, not a psychometric diagnosis or performance evaluation.</p>
        <div style={{ backgroundColor: "#f8fafc", padding: 16, borderRadius: 8, margin: "12px 0", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: 14 }}>Understanding the DISC Framework at RDC Concrete:</h3>
          <p style={{ fontSize: 12, color: "#475569", margin: 0, lineHeight: 1.6 }}>
            DISC explains behavioral styles in workplace and site situations:
            <br />
            &bull; <strong>D (Dominance)</strong>: Direct, decisive, driven by results and overcoming challenges.
            <br />
            &bull; <strong>I (Influence)</strong>: Outgoing, persuasive, energized by teamwork and relationship building.
            <br />
            &bull; <strong>S (Steadiness)</strong>: Patient, loyal, methodical, values stability and team harmony.
            <br />
            &bull; <strong>C (Conscientiousness)</strong>: Analytical, precise, quality-focused, values data and standards.
          </p>
        </div>

        {user.discStyle ? (
          <div className="record" style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0", margin: "16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: "bold", color: "#166534", textTransform: "uppercase" }}>
                Your Recorded Reflection
              </span>
              <span style={{ fontSize: 12, fontWeight: "bold", padding: "3px 10px", borderRadius: 6, backgroundColor: "#dcfce7", color: "#166534" }}>
                Style: {user.discStyle}
              </span>
            </div>
            <h3 style={{ margin: "8px 0 2px 0", color: "#14532d" }}>{userDisc.name}</h3>
            <p className="muted" style={{ fontSize: 12, margin: "0 0 10px 0" }}>
              <span lang="hi">{userDisc.hindiName}</span> &bull; {userDisc.tagline}
            </p>
            <p style={{ fontSize: 13, color: "#1e293b", margin: "0 0 10px 0" }}>{userDisc.overview}</p>
            
            <div style={{ fontSize: 12, color: "#334155", display: "grid", gap: 8 }}>
              <div>
                <strong>Site &amp; Operations Strengths:</strong>
                <ul style={{ margin: "4px 0 0 0", paddingLeft: 20 }}>
                  {userDisc.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>Preferred Communication Style:</strong>
                <p style={{ margin: "2px 0 0 0", color: "#475569" }}>{userDisc.communicationStyle}</p>
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>Mentoring Dynamic ({user.role === "MENTOR" ? "As a Mentor" : "As a Mentee"}):</strong>
                <p style={{ margin: "2px 0 0 0", color: "#475569" }}>
                  {user.role === "MENTOR" ? userDisc.mentoringAdvice.asMentor : userDisc.mentoringAdvice.asMentee}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="notice">
            You have not completed the reflection yet. Select the options that best reflect your natural approach below.
          </p>
        )}

        <details className="record" style={{ marginTop: 12 }}>
          <summary style={{ fontWeight: "bold", cursor: "pointer" }}>
            {user.discStyle ? "Retake DISC Reflection Exercise" : "Take DISC Reflection Exercise"}
          </summary>
          <form onSubmit={(e) => void submit(e, true)} style={{ marginTop: 16 }}>
            <fieldset disabled={busy}>
              {DISC_QUESTIONS.map((q) => (
                <fieldset className="record" key={q.id}>
                  <legend style={{ fontWeight: "bold" }}>{q.question}</legend>
                  {q.options.map((option) => (
                    <label
                      key={option.key}
                      style={{ display: "flex", gap: 10, fontWeight: 400, margin: "6px 0" }}
                    >
                      <input
                        style={{ width: 18, margin: 0 }}
                        type="radio"
                        name={"question-" + q.id}
                        value={option.key}
                        required
                      />
                      <span>
                        <strong>[{option.key}]</strong> {option.text}
                      </span>
                    </label>
                  ))}
                </fieldset>
              ))}
              <button style={{ marginTop: 12 }}>Save reflection</button>
            </fieldset>
          </form>
        </details>
      </section>
    </>
  );
}
export default function Onboarding() {
  const { user, loading, refreshUser } = useAuth();
  if (loading || !user) return <main className="coach">Checking sign-in…</main>;
  return (
    <main className="coach">
      <header>
        <h1>My learning profile</h1>
        <Link href="/dashboard">← Dashboard</Link>
      </header>
      <ProfileForm user={user} refresh={refreshUser} />
    </main>
  );
}
