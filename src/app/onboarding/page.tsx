"use client";

import { useState, type FormEvent } from "react";
import { UserCircle } from "lucide-react";
import { useAuth, type User } from "@/context/AuthContext";
import { COMPETENCIES } from "@/lib/competencies";
import { getDiscDetails } from "@/lib/disc-guide";
import { AdminHero } from "@/components/admin-ui";
import { ProgressRing } from "@/components/progress-ring";
import { CollapsibleCard } from "@/components/collapsible-card";

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
    {
      label: "Goal or challenge",
      done: Boolean(user.careerGoals || user.challenges.length),
    },
    { label: "Development topics", done: user.topics.length > 0 },
    { label: "Availability", done: Boolean(user.availability) },
    { label: "Communication preference", done: Boolean(user.commStyleNotes) },
    { label: "DISC reflection", done: Boolean(user.discStyle) },
  ];
  const completedSteps = setupSteps.filter((step) => step.done).length;
  const setupPercent = Math.round((completedSteps / setupSteps.length) * 100);

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
          highestQualification: String(
            values.get("highestQualification") ?? "",
          ),
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
      <section className="resume-card">
        <ProgressRing
          percent={setupPercent}
          size={72}
          stroke={8}
          label={`${completedSteps} of ${setupSteps.length} profile steps complete`}
        />
        <div className="resume-text">
          <span className="resume-kicker">5-minute setup</span>
          <strong>
            {completedSteps}/{setupSteps.length} profile steps complete
          </strong>
          <span>
            {setupSteps
              .map((step) => `${step.done ? "✓" : "○"} ${step.label}`)
              .join(" · ")}
          </span>
        </div>
      </section>

      <section className="card">
        <div className="badge-row">
          <span className="badge">{user.role}</span>
          <span className="badge">#{user.employeeCode}</span>
          <span className="badge">{user.department}</span>
        </div>
        <h2>{user.name}</h2>
        <p className="muted">
          {user.email} · {user.designation}
        </p>
        <p className="message">
          Your saved profile is available to programme administrators and your
          mentoring counterpart. Share only what you want recorded. English and
          Hindi are accepted.
        </p>

        {error && (
          <p role="alert" className="message error-box">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="message">
            {message}
          </p>
        )}

        <form onSubmit={(e) => void submit(e)} className="form">
          <fieldset
            disabled={busy}
            className="form"
            style={{ border: 0, padding: 0, margin: 0 }}
          >
            <div className="form-row">
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

            <fieldset className="feedback-question">
              <legend>Competencies to develop or share / कौशल</legend>
              <div className="grid">
                {COMPETENCIES.map((topic) => (
                  <label key={topic} className="checkbox">
                    <input
                      type="checkbox"
                      name="topics"
                      value={topic}
                      defaultChecked={user.topics.includes(topic)}
                    />
                    <span>{topic}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label>
              Development priorities (one per line) / विकास की प्राथमिकताएँ
              <textarea
                name="challenges"
                defaultValue={user.challenges.join("\n")}
                maxLength={5000}
                placeholder={
                  "e.g. Plant telemetry calibration\nDispatch turnaround optimization\nAssertive communication"
                }
              />
            </label>

            <div className="form-row">
              <label>
                Availability / उपलब्धता
                <input
                  name="availability"
                  defaultValue={user.availability ?? ""}
                  placeholder="e.g. Tuesdays & Thursdays, 4:00 PM - 5:30 PM"
                />
              </label>
              <label>
                How I prefer to communicate / संवाद की पसंद
                <input
                  name="commStyleNotes"
                  defaultValue={user.commStyleNotes ?? ""}
                  placeholder="e.g. Direct and action-focused / Step-by-step with written notes"
                />
              </label>
            </div>

            <label className="checkbox">
              <input
                name="consent"
                type="checkbox"
                required
                defaultChecked={user.isConsentShared}
              />
              <span>I understand who can see my saved profile.</span>
            </label>

            <div>
              <button type="submit">Save profile</button>
            </div>
          </fieldset>
        </form>
      </section>

      <section className="card">
        <h2>DISC communication reflection</h2>
        <p className="muted">
          A short conversation starter, not a psychometric diagnosis or
          performance evaluation.
        </p>

        <div className="record">
          <h3>Understanding the DISC Framework at RDC Concrete</h3>
          <ul className="requirement-list">
            <li>
              <strong>D (Dominance)</strong>: Direct, decisive, driven by
              results and overcoming challenges.
            </li>
            <li>
              <strong>I (Influence)</strong>: Outgoing, persuasive, energized by
              teamwork and relationship building.
            </li>
            <li>
              <strong>S (Steadiness)</strong>: Patient, loyal, methodical,
              values stability and team harmony.
            </li>
            <li>
              <strong>C (Conscientiousness)</strong>: Analytical, precise,
              quality-focused, values data and standards.
            </li>
          </ul>
        </div>

        {user.discStyle ? (
          <div className="record">
            <div className="badge-row">
              <span className="status-pill status-completed">
                Recorded Style: {user.discStyle}
              </span>
              <span className="badge" lang="hi">
                {userDisc.hindiName}
              </span>
            </div>
            <h3>{userDisc.name}</h3>
            <p className="muted">{userDisc.tagline}</p>
            <p>{userDisc.overview}</p>
            <p>
              <strong>Preferred Communication Style:</strong>{" "}
              {userDisc.communicationStyle}
            </p>
            <p>
              <strong>
                Mentoring Dynamic (
                {user.role === "MENTOR" ? "As a Mentor" : "As a Mentee"}):
              </strong>{" "}
              {user.role === "MENTOR"
                ? userDisc.mentoringAdvice.asMentor
                : userDisc.mentoringAdvice.asMentee}
            </p>
          </div>
        ) : (
          <p className="message">
            You have not completed the reflection yet. Select the options that
            best reflect your natural approach below.
          </p>
        )}

        <CollapsibleCard
          title={
            user.discStyle
              ? "Retake DISC Reflection Exercise"
              : "Take DISC Reflection Exercise"
          }
          summary="5 multiple-choice questions"
          defaultOpen={!user.discStyle}
        >
          <form onSubmit={(e) => void submit(e, true)} className="form">
            <fieldset
              disabled={busy}
              className="form"
              style={{ border: 0, padding: 0, margin: 0 }}
            >
              {DISC_QUESTIONS.map((q) => (
                <fieldset className="feedback-question" key={q.id}>
                  <legend>{q.question}</legend>
                  <div className="form" style={{ gap: "0.5rem" }}>
                    {q.options.map((option) => (
                      <label key={option.key} className="checkbox">
                        <input
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
                  </div>
                </fieldset>
              ))}
              <div>
                <button type="submit">Save reflection</button>
              </div>
            </fieldset>
          </form>
        </CollapsibleCard>
      </section>
    </>
  );
}

export default function Onboarding() {
  const { user, loading, refreshUser } = useAuth();
  if (loading || !user) return <main className="container">Checking sign-in…</main>;
  return (
    <main className="container">
      <AdminHero
        icon={UserCircle}
        title="My learning profile"
        subtitle="Share your career goals, site location, availability, and DISC communication reflection."
      />
      <ProfileForm user={user} refresh={refreshUser} />
    </main>
  );
}
