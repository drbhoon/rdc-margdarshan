"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
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
  // Synchronize with the remote API; state is updated only after the response resolves.
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
  if (loading || !user) return <main className="coach">Checking sign-in…</main>;
  return (
    <main className="coach">
      <header>
        <h1>Resource hub</h1>
        <Link href="/dashboard">← Dashboard</Link>
      </header>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <section className="card">
        <h2>Share useful learning</h2>
        <p>
          Resources are reviewed by administrators before appearing for
          everyone. Contributions are visible to you and the administrators
          while awaiting review.
        </p>
        <details>
          <summary>Contribute a resource</summary>
          <form onSubmit={contribute}>
            <fieldset disabled={busy}>
              <label>
                Title
                <input name="title" required maxLength={500} />
              </label>
              <label>
                HTTPS link (optional)
                <input name="url" type="url" />
              </label>
              <label>
                Learning content / सीख
                <textarea name="content" maxLength={20000} />
              </label>
              <label>
                Tags, separated by commas
                <input name="tags" />
              </label>
              <button>Submit resource</button>
            </fieldset>
          </form>
        </details>
      </section>
      <label>
        Search resources
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {resources
        .filter((r) =>
          (r.title + " " + r.content + " " + r.tags.join(" "))
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .map((r) => (
          <article className="card" key={r.id}>
            <span className="pill">
              {r.isApproved ? "Approved" : "Awaiting review"}
            </span>
            <h2>{r.title}</h2>
            <pre>{r.content}</pre>
            <p className="muted">{r.tags.join(" · ")}</p>
            {r.url?.startsWith("https://") && (
              <p>
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  Open resource ↗
                </a>
              </p>
            )}
            {user.role === "ADMIN" && (
              <button
                disabled={busy}
                className="secondary"
                onClick={() =>
                  void send("PUT", { id: r.id, isApproved: !r.isApproved })
                }
              >
                {r.isApproved ? "Withdraw approval" : "Approve resource"}
              </button>
            )}
          </article>
        ))}
      {!resources.length && <p>No resources have been shared yet.</p>}
    </main>
  );
}
