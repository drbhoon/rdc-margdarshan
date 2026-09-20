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

type Person = { employeeCode: string; name: string; designation: string };
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
const themes = [
  "Agreement & expectations",
  "Communication & assertiveness",
  "Skills & strengths",
  "Career direction & planning",
  "Focus & resource responsibility",
  "Feedback & trust",
  "Midpoint review",
  "Stakeholder relationships",
  "Problem solving & asset care",
  "Difficult conversations",
  "Teamwork & delegation",
  "Sustaining progress & safety",
  "Growth review & next steps",
];
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
  blocked,
  send,
  dirtyChanged,
}: {
  record: SessionRecord;
  pair: Pair;
  userCode: string;
  blocked: boolean;
  send: Send;
  dirtyChanged: (id: string, dirty: boolean) => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [base, setBase] = useState(record);
  const [dirty, setDirty] = useState(false);
  if (!dirty && base.version !== record.version) setBase(record);
  useEffect(() => {
    if (!dirty) form.current?.reset();
  }, [base, dirty]);
  const reflection =
    userCode === pair.menteeCode
      ? "postSessionReflectionMentee"
      : userCode === pair.mentorCode
        ? "postSessionReflectionMentor"
        : null;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = { version: base.version };
    for (const [key] of fields) payload[key] = String(data.get(key) ?? "");
    if (reflection) payload[reflection] = String(data.get(reflection) ?? "");
    payload.status = String(data.get("status"));
    const date = String(data.get("scheduledTime") ?? "");
    payload.scheduledTime = date ? date + ":00+05:30" : null;
    payload.googleMeetLink = String(data.get("googleMeetLink") ?? "");
    if (await send("/session/" + record.id, "PUT", payload)) {
      setDirty(false);
      dirtyChanged(record.id, false);
    }
  }
  return (
    <form
      ref={form}
      onSubmit={save}
      onChange={() => {
        setDirty(true);
        dirtyChanged(record.id, true);
      }}
    >
      {dirty && record.version !== base.version && (
        <p className="notice warning">
          A newer version is available. Your draft is still here. Copy any text
          you need, then reload the saved version.
        </p>
      )}
      <fieldset disabled={blocked}>
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
            Meeting link / बैठक का लिंक
            <input
              type="url"
              name="googleMeetLink"
              placeholder="https://"
              defaultValue={base.googleMeetLink ?? ""}
            />
          </label>
        </div>
        <label>
          Session status
          <select name="status" defaultValue={base.status}>
            {["SCHEDULED", "RESCHEDULED", "COMPLETED", "MISSED"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {fields.map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea
              name={key}
              defaultValue={base[key] ?? ""}
              maxLength={20000}
            />
          </label>
        ))}
        {reflection && (
          <label>
            My reflection / मेरा आत्मचिंतन
            <textarea
              name={reflection}
              defaultValue={base[reflection] ?? ""}
              maxLength={20000}
            />
          </label>
        )}
        <button type="submit">Save session record / सहेजें</button>
      </fieldset>
      {dirty && (
        <button
          type="button"
          className="secondary"
          style={{ marginLeft: 8 }}
          onClick={() => {
            if (
              window.confirm(
                "Discard this unsaved draft and load the saved record?",
              )
            ) {
              setDirty(false);
              dirtyChanged(record.id, false);
              setBase(record);
              form.current?.reset();
            }
          }}
        >
          Reload saved version
        </button>
      )}
      <details className="record">
        <summary>Both participants’ saved reflections</summary>
        <h3>{pair.mentee.name}</h3>
        <pre>
          {record.postSessionReflectionMentee || "No reflection saved yet."}
        </pre>
        <h3>{pair.mentor.name}</h3>
        <pre>
          {record.postSessionReflectionMentor || "No reflection saved yet."}
        </pre>
      </details>
    </form>
  );
}
export default function MentoringSpace() {
  const { pairId } = useParams<{ pairId: string }>();
  const { user, loading } = useAuth();
  const [data, setData] = useState<Space | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [week, setWeek] = useState(0),
    [tab, setTab] = useState("Session");
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
  // Synchronize the open workspace with remote changes without replacing dirty drafts.
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload().catch((e) => setError(e.message));
    const timer = setInterval(
      () =>
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const pair = data.pair,
    session = pair.sessions.find((s) => s.weekNumber === week),
    participant = [pair.mentorCode, pair.menteeCode].includes(
      user.employeeCode,
    );
  const ended = ["TERMINATED", "DECLINED"].includes(pair.status),
    blocked = busy || pair.isOffRecord || ended;
  const name = (code?: string) =>
    code === pair.mentorCode
      ? pair.mentor.name
      : code === pair.menteeCode
        ? pair.mentee.name
        : (code ?? "Unknown author");
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
  return (
    <main className="coach">
      <header>
        <div>
          <Link href="/dashboard">← Dashboard</Link>
          <h1>
            {pair.mentee.name} & {pair.mentor.name}
          </h1>
          <p className="muted">{pair.mentee.designation} · Mentoring record</p>
        </div>
        <span className="pill">{pair.status}</span>
      </header>
      <div className={"notice " + (pair.isOffRecord ? "warning" : "")}>
        <strong>
          {pair.isOffRecord
            ? "Off record / ऑफ द रिकॉर्ड"
            : "On record / रिकॉर्ड चालू"}
        </strong>
        <p>
          {pair.isOffRecord
            ? "Saving and new AI requests are paused. Continue your conversation outside the app. Both participants must agree to resume. Earlier saved records remain visible."
            : "Everything saved here is visible to both participants and the administrators. English and Hindi are welcome. The app does not capture audio or video."}
        </p>
        {participant && !ended && (
          <button
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
              ? "Agree to resume recording / सहमति दें"
              : "Go off record / रिकॉर्ड रोकें"}
          </button>
        )}
        {pair.isOffRecord && (
          <p className="muted">
            Resume agreement: Mentor {pair.resumeMentor ? "✓" : "pending"} ·
            Mentee {pair.resumeMentee ? "✓" : "pending"}
          </p>
        )}
      </div>
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
      <section className="card">
        <h2>Shared growth goals / साझा विकास लक्ष्य</h2>
        <pre>
          {pair.sharedGoals ||
            "Agree on specific outcomes, evidence of progress and a review date."}
        </pre>
        <form
          onChange={() => dirty.current.add("/goals")}
          onSubmit={(e) =>
            void simpleSubmit(e, "/goals", "PUT", { version: pair.version })
          }
        >
          <fieldset disabled={blocked}>
            <label>
              Add or revise the goals
              <textarea
                name="sharedGoals"
                required
                placeholder="Outcome · Evidence · Target date · Support"
                maxLength={20000}
              />
            </label>
            <button>Save goals</button>
          </fieldset>
        </form>
      </section>
      <nav>
        {[
          "Session",
          "Actions",
          "Learning journal",
          "Notebook",
          "AI coach",
          "Reviews",
          "History",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "" : "secondary"}
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              if (t === "History")
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
      </nav>
      <div className="weeknav" aria-label="Programme weeks">
        {themes.map((_, i) => (
          <button key={i} aria-pressed={week === i} onClick={() => setWeek(i)}>
            Week {i}
            {pair.sessions.find((s) => s.weekNumber === i)?.status ===
            "COMPLETED"
              ? " ✓"
              : ""}
          </button>
        ))}
      </div>
      <p className="muted">
        Week {week} · {themes[week]} ·{" "}
        {pair.sessions.filter((s) => s.status === "COMPLETED").length}/13
        completed
      </p>
      <section className="card" hidden={tab !== "Session"}>
        <h2>Session record / बैठक का रिकॉर्ड</h2>
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
              blocked={blocked}
              send={send}
              dirtyChanged={dirtyChanged}
            />
          </div>
        ))}
      </section>
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
      {(["Learning journal", "Notebook"] as const).map((t) => (
        <section className="card" hidden={tab !== t} key={t}>
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
      <section className="card" hidden={tab !== "AI coach"}>
        <h2>AI coaching suggestions</h2>
        <p className="muted">
          Questions are saved and may be sent to the AI provider. Replies are
          suggestions for discussion, not performance assessments. During
          off-record mode new requests are blocked; an earlier request may
          already have been sent.
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
              <h3>{c.question}</h3>
              <pre>{c.answer}</pre>
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
              Ask in English or Hindi
              <textarea name="message" maxLength={8000} required />
            </label>
            <button>Ask coach</button>
          </fieldset>
        </form>
      </section>
      <section className="card" hidden={tab !== "Reviews"}>
        <h2>Midpoint & closing reviews</h2>
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
          <p>Select week 6 or 12 to submit a review.</p>
        )}
      </section>
      <section className="card" hidden={tab !== "History"}>
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
