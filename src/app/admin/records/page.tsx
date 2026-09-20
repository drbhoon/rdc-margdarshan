"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
type Employee = {
  employeeCode: string;
  name: string;
  email: string;
  role: string;
  department: string;
  designation: string;
  careerGoals: string | null;
  topics: string[];
  challenges: string[];
  availability: string | null;
  commStyleNotes: string | null;
  discStyle: string | null;
  isConsentShared: boolean;
};
type Data = {
  employees: Employee[];
  legacyNotes: Array<{ id: string; employeeCode: string; content: string }>;
  legacyReviews: Array<{
    id: string;
    employeeCode: string;
    weekNumber: number;
    growthRating: number;
    feedbackText: string;
  }>;
  audit: Array<{
    id: string;
    action: string;
    performedByCode: string | null;
    timestamp: string;
  }>;
};
export default function AdminRecords() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [search, setSearch] = useState("");
  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    let active = true;
    fetch("/api/admin/records")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        if (active) setData(j);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user]);
  if (loading) return <main className="coach">Checking access…</main>;
  if (user?.role !== "ADMIN")
    return <main className="coach">Administrator access required.</main>;
  const name = (code: string | null) =>
    data?.employees.find((e) => e.employeeCode === code)?.name ??
    code ??
    "Earlier system record";
  return (
    <main className="coach">
      <header>
        <h1>Administrator record library</h1>
        <Link href="/dashboard">← Dashboard</Link>
      </header>
      <p>
        All current and earlier coaching relationships remain accessible from
        the dashboard. This library includes saved profiles and earlier records
        without a relationship link.
      </p>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <label>
        Find an employee
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {data?.employees
        .filter((e) =>
          (e.name + " " + e.email + " " + e.employeeCode)
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .map((e) => (
          <details className="card" key={e.employeeCode}>
            <summary>
              {e.name} · {e.role} · {e.employeeCode}
            </summary>
            <p>
              {e.email} · {e.department} · {e.designation}
            </p>
            <h3>Career goals</h3>
            <pre>{e.careerGoals || "Not recorded"}</pre>
            <h3>Competencies</h3>
            <p>{e.topics.join(" · ") || "Not recorded"}</p>
            <h3>Development priorities</h3>
            <p>{e.challenges.join(" · ") || "Not recorded"}</p>
            <h3>Availability</h3>
            <pre>{e.availability || "Not recorded"}</pre>
            <h3>Communication preferences</h3>
            <pre>{e.commStyleNotes || "Not recorded"}</pre>
            <p>
              DISC-style reflection: {e.discStyle || "Not recorded"} · Sharing
              acknowledged: {e.isConsentShared ? "Yes" : "No"}
            </p>
          </details>
        ))}
      <section className="card">
        <h2>Earlier journals</h2>
        {data?.legacyNotes.map((n) => (
          <article className="record" key={n.id}>
            <h3>{name(n.employeeCode)}</h3>
            <pre>{n.content}</pre>
          </article>
        ))}
        {data && !data.legacyNotes.length && <p>No unlinked journals.</p>}
      </section>
      <section className="card">
        <h2>Earlier reviews</h2>
        {data?.legacyReviews.map((r) => (
          <article className="record" key={r.id}>
            <h3>
              {name(r.employeeCode)} · Week {r.weekNumber} · {r.growthRating}/5
            </h3>
            <pre>{r.feedbackText}</pre>
          </article>
        ))}
        {data && !data.legacyReviews.length && <p>No unlinked reviews.</p>}
      </section>
      <section className="card">
        <h2>Recent programme activity</h2>
        <p className="muted">
          Latest 500 events. Full relationship revisions are in each coaching
          record’s History tab.
        </p>
        {data?.audit.map((a) => (
          <p className="record" key={a.id}>
            {a.action.replaceAll("_", " ")} · {name(a.performedByCode)} ·{" "}
            {new Date(a.timestamp).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })}{" "}
            IST
          </p>
        ))}
      </section>
    </main>
  );
}
