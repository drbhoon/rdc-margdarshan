"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth, type User } from "@/context/AuthContext";
import { COMPETENCIES } from "@/lib/competencies";
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
  return (
    <>
      <section className="card">
        <h2>{user.name}</h2>
        <p>
          {user.email} · {user.role} · {user.employeeCode}
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
            <label>
              Career goals / करियर के लक्ष्य
              <textarea
                name="careerGoals"
                defaultValue={user.careerGoals ?? ""}
                maxLength={20000}
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
              />
            </label>
            <label>
              Availability / उपलब्धता
              <input
                name="availability"
                defaultValue={user.availability ?? ""}
              />
            </label>
            <label>
              How I prefer to communicate / संवाद की पसंद
              <textarea
                name="commStyleNotes"
                defaultValue={user.commStyleNotes ?? ""}
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
        <h2>Communication reflection</h2>
        <p>
          This short DISC-style exercise is a conversation starter, not a
          validated personality assessment or performance rating.
        </p>
        <p>Current reflection: {user.discStyle || "Not completed"}</p>
        <form onSubmit={(e) => void submit(e, true)}>
          <fieldset disabled={busy}>
            {DISC_QUESTIONS.map((q) => (
              <fieldset className="record" key={q.id}>
                <legend>{q.question}</legend>
                {q.options.map((option) => (
                  <label
                    key={option.key}
                    style={{ display: "flex", gap: 10, fontWeight: 400 }}
                  >
                    <input
                      style={{ width: 18, margin: 0 }}
                      type="radio"
                      name={"question-" + q.id}
                      value={option.key}
                      required
                    />
                    {option.text}
                  </label>
                ))}
              </fieldset>
            ))}
            <button>Save reflection</button>
          </fieldset>
        </form>
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
