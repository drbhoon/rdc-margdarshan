"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AdminHero } from "@/components/admin-ui";
import { CollapsibleCard } from "@/components/collapsible-card";

type Resource = {
  id: string;
  title: string;
  url: string | null;
  content: string | null;
  tags: string[];
  isApproved: boolean;
};

export default function Resources() {
  const { user, loading } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/resources");
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    setResources(j.resources);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) void load().catch((e) => setError(e.message));
  }, [user, load]);

  async function send(method: string, data: unknown) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/resources", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function contribute(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      data = Object.fromEntries(new FormData(form));
    if (
      await send("POST", {
        ...data,
        tags: String(data.tags)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      })
    )
      form.reset();
  }

  if (loading || !user) return <main className="container">Checking sign-in…</main>;

  const filtered = resources.filter((r) =>
    (r.title + " " + r.content + " " + r.tags.join(" "))
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <main className="container">
      <AdminHero
        icon={BookOpen}
        title="Resource hub"
        subtitle="Shared guides, plant SOP notes, and mentoring tips for RDC Concrete teams."
      />

      {error && (
        <p role="alert" className="message error-box">
          {error}
        </p>
      )}

      <CollapsibleCard
        title="Contribute a resource"
        summary="share useful learning with the cohort"
      >
        <p className="muted">
          Resources are reviewed by administrators before appearing for
          everyone. Contributions are visible to you and the administrators
          while awaiting review.
        </p>
        <form onSubmit={contribute} className="form">
          <fieldset
            disabled={busy}
            className="form"
            style={{ border: 0, padding: 0, margin: 0 }}
          >
            <div className="form-row">
              <label>
                Title *
                <input name="title" required maxLength={500} />
              </label>
              <label>
                HTTPS link (optional)
                <input name="url" type="url" placeholder="https://..." />
              </label>
            </div>
            <label>
              Learning content / सीख
              <textarea name="content" maxLength={20000} />
            </label>
            <label>
              Tags, separated by commas
              <input name="tags" placeholder="Safety, Quality, Operations" />
            </label>
            <div>
              <button type="submit">Submit resource</button>
            </div>
          </fieldset>
        </form>
      </CollapsibleCard>

      <section className="card">
        <h2>Browse resources ({filtered.length})</h2>
        <div className="employee-search">
          <input
            type="search"
            placeholder="Search resources by title, content, or tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="secondary"
              onClick={() => setQuery("")}
            >
              Clear
            </button>
          )}
        </div>

        <div className="form" style={{ marginTop: "1rem" }}>
          {filtered.map((r) => (
            <article className="record" key={r.id} style={{ margin: 0 }}>
              <div className="badge-row">
                <span
                  className={`status-pill ${
                    r.isApproved ? "status-completed" : "status-proposed"
                  }`}
                >
                  {r.isApproved ? "Approved" : "Awaiting review"}
                </span>
                {r.tags.map((tag) => (
                  <span key={tag} className="badge">
                    {tag}
                  </span>
                ))}
              </div>
              <h3>{r.title}</h3>
              {r.content && <pre>{r.content}</pre>}
              <div
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "center",
                  marginTop: "0.6rem",
                }}
              >
                {r.url?.startsWith("https://") && (
                  <a
                    className="button secondary"
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open resource ↗
                  </a>
                )}
                {user.role === "ADMIN" && (
                  <button
                    type="button"
                    disabled={busy}
                    className="secondary"
                    onClick={() =>
                      void send("PUT", { id: r.id, isApproved: !r.isApproved })
                    }
                  >
                    {r.isApproved ? "Withdraw approval" : "Approve resource"}
                  </button>
                )}
              </div>
            </article>
          ))}
          {!filtered.length && (
            <p className="muted">No resources match your search.</p>
          )}
        </div>
      </section>
    </main>
  );
}
