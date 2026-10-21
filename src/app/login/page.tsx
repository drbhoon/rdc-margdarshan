"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Shield, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const personas = [
  {
    code: "EMP101",
    role: "Mentor",
    name: "Rajesh Sharma",
    detail: "Senior Operations Manager · Turbhe",
    style: "D",
  },
  {
    code: "EMP201",
    role: "Mentee",
    name: "Amit Verma",
    detail: "Graduate Engineer Trainee · Pune",
    style: "S",
  },
  {
    code: "EMP102",
    role: "Mentor",
    name: "Shalini Iyer",
    detail: "Quality Head · Mumbai",
    style: "C",
  },
  {
    code: "EMP202",
    role: "Mentee",
    name: "Priya Patel",
    detail: "Graduate Engineer Trainee · Ahmedabad",
    style: "I",
  },
] as const;

export default function LoginPage() {
  const { login, refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [identifier, setIdentifier] = useState("");

  async function handleDirectSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign-in failed.");
        setBusy(false);
        return;
      }
      await refreshUser();
      window.location.assign("/dashboard");
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  async function demoSignIn(code: string) {
    setBusy(true);
    setError("");
    const result = await login(code);
    if (!result.success) {
      setError(result.error || "Could not complete demo sign-in.");
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero card">
        <div>
          <div className="login-brand">
            <Image
              src="/brand/rdc-logo.jpeg"
              alt="RDC logo"
              width={104}
              height={64}
            />
            <span>RDC Concrete (India) Limited</span>
          </div>
          <h1>MARGDARSHAN — MENTORING PLATFORM OF RDC</h1>
          <p>
            Prepare, meet, agree actions, follow through and reflect across a
            guided 12-session mentoring journey for RDC employees.{" "}
            <span lang="hi">
              तैयारी करें, बातचीत करें, कार्य तय करें और प्रगति को सहेजें।
            </span>
          </p>
        </div>
        <figure className="hero-photo">
          <Image
            src="/images/rdc-transit-mixer-mentoring.jpg"
            alt="RDC Concrete mentor and young engineer learning at a concrete site"
            width={1000}
            height={700}
            priority
          />
        </figure>
      </section>

      <section className="login-form-panel">
        <div className="card">
          <h1>Sign in</h1>
          <p className="muted">
            Use your verified RDC Concrete (<code>@rdc.in</code>) or Ultrafine
            Minerals (<code>@ultrafine.in</code>) Google account to access your
            mentoring workspace.
          </p>

          {error && <p className="message error">{error}</p>}

          <form
            onSubmit={(e) => void handleDirectSignIn(e)}
            className="form"
            style={{ marginTop: "1rem" }}
          >
            <label>
              Corporate Email (<code>@rdc.in</code> / <code>@ultrafine.in</code>) or Employee ID
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. saif@ultrafine.in, name@rdc.in, or S00642"
                required
                disabled={busy}
              />
            </label>
            <button type="submit" disabled={busy}>
              <Mail size={16} />
              <span>{busy ? "Signing in…" : "Sign in with Corporate Email / ID"}</span>
            </button>
          </form>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              margin: "1rem 0",
              color: "var(--muted)",
              fontSize: "0.8rem",
            }}
          >
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span>or</span>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>

          <div className="form">
            <a href="/api/auth/google" className="button secondary">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{ background: "white", borderRadius: "4px", padding: "2px" }}
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with RDC Google account
            </a>
          </div>

          <details className="archived-forms" style={{ marginTop: "1.25rem" }}>
            <summary>Explore sample journey (One-click demo personas)</summary>
            <div style={{ padding: "0.75rem 0.9rem", display: "grid", gap: "0.6rem" }}>
              <p className="muted" style={{ margin: 0 }}>
                Demo workspace · Sample data for testing Mentor, Mentee, and
                Admin roles.
              </p>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {personas.map((persona) => (
                  <button
                    key={persona.code}
                    type="button"
                    disabled={busy}
                    onClick={() => void demoSignIn(persona.code)}
                    className="secondary"
                    style={{
                      flexDirection: "column",
                      alignItems: "flex-start",
                      textAlign: "left",
                      padding: "0.6rem 0.75rem",
                    }}
                  >
                    <span className="badge" style={{ fontSize: "0.68rem" }}>
                      {persona.role} · DISC {persona.style}
                    </span>
                    <strong style={{ fontSize: "0.85rem", color: "var(--navy)" }}>
                      {persona.name}
                    </strong>
                    <span className="muted" style={{ fontSize: "0.72rem" }}>
                      {persona.detail}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void demoSignIn("ADMIN001")}
                className="secondary"
                style={{ justifyContent: "space-between", width: "100%" }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  <Shield size={16} />
                  <span>Administrator View (Cohort Overview)</span>
                </span>
                <span>→</span>
              </button>
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
