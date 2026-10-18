"use client";

import { useEffect, useState } from "react";
import { FolderArchive } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AdminHero } from "@/components/admin-ui";
import { CollapsibleCard } from "@/components/collapsible-card";

type Employee = {
  employeeCode: string;
  name: string;
  email: string;
  role: string;
  department: string;
  designation: string;
  highestQualification?: string | null;
  location?: string | null;
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

  if (loading) return <main className="container">Checking access…</main>;
  if (user?.role !== "ADMIN")
    return <main className="container">Administrator access required.</main>;

  const name = (code: string | null) =>
    data?.employees.find((e) => e.employeeCode === code)?.name ??
    code ??
    "Earlier system record";

  const filteredEmployees =
    data?.employees.filter((e) =>
      (e.name + " " + e.email + " " + e.employeeCode)
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) ?? [];

  return (
    <main className="container">
      <AdminHero
        icon={FolderArchive}
        title="Administrator record library"
        subtitle="Saved profiles, earlier unlinked journals, reviews, and the programme audit trail."
      />

      {error && (
        <p role="alert" className="message error-box">
          {error}
        </p>
      )}

      <section className="card">
        <h2>Employee profiles ({filteredEmployees.length})</h2>
        <div className="employee-search">
          <input
            type="search"
            placeholder="Find an employee by name, email, or employee code…"
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

        <div className="form" style={{ marginTop: "0.75rem" }}>
          {filteredEmployees.map((e) => (
            <CollapsibleCard
              key={e.employeeCode}
              title={e.name}
              summary={`${e.role} · ${e.employeeCode} · ${e.department}`}
            >
              <p className="muted">
                {e.email} · {e.department} · {e.designation}
                {e.highestQualification ? ` · ${e.highestQualification}` : ""}
                {e.location ? ` · 📍 ${e.location}` : ""}
              </p>
              <div className="form-row">
                <div>
                  <h3>Career goals</h3>
                  <pre>{e.careerGoals || "Not recorded"}</pre>
                </div>
                <div>
                  <h3>Availability</h3>
                  <pre>{e.availability || "Not recorded"}</pre>
                </div>
              </div>
              <div className="form-row">
                <div>
                  <h3>Competencies</h3>
                  <p>{e.topics.join(" · ") || "Not recorded"}</p>
                </div>
                <div>
                  <h3>Development priorities</h3>
                  <p>{e.challenges.join(" · ") || "Not recorded"}</p>
                </div>
              </div>
              <h3>Communication preferences</h3>
              <pre>{e.commStyleNotes || "Not recorded"}</pre>
              <div className="badge-row">
                <span className="badge">
                  DISC: {e.discStyle || "Not recorded"}
                </span>
                <span className="badge">
                  Sharing acknowledged: {e.isConsentShared ? "Yes" : "No"}
                </span>
              </div>
            </CollapsibleCard>
          ))}
        </div>
      </section>

      <div className="two-col">
        <section className="card">
          <h2>Earlier journals</h2>
          {data?.legacyNotes.map((n) => (
            <article className="record" key={n.id}>
              <h3>{name(n.employeeCode)}</h3>
              <pre>{n.content}</pre>
            </article>
          ))}
          {data && !data.legacyNotes.length && (
            <p className="muted">No unlinked journals.</p>
          )}
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
          {data && !data.legacyReviews.length && (
            <p className="muted">No unlinked reviews.</p>
          )}
        </section>
      </div>

      <CollapsibleCard
        title="Recent programme activity"
        summary={`Latest ${data?.audit.length ?? 0} audit events`}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Participant</th>
                <th>Timestamp (IST)</th>
              </tr>
            </thead>
            <tbody>
              {data?.audit.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.action.replaceAll("_", " ")}</strong>
                  </td>
                  <td>{name(a.performedByCode)}</td>
                  <td className="muted">
                    {new Date(a.timestamp).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    IST
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleCard>
    </main>
  );
}
