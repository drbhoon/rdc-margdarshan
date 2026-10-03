"use client";

import Image from "next/image";
import { useState } from "react";
import { AlertCircle, ArrowRight, Shield, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const personas = [
  { code: "EMP101", role: "Mentor", name: "Rajesh Sharma", detail: "Senior Operations Manager · Turbhe", style: "D" },
  { code: "EMP201", role: "Mentee", name: "Amit Verma", detail: "Graduate Engineer Trainee · Pune", style: "S" },
  { code: "EMP102", role: "Mentor", name: "Shalini Iyer", detail: "Quality Head · Mumbai", style: "C" },
  { code: "EMP202", role: "Mentee", name: "Priya Patel", detail: "Graduate Engineer Trainee · Ahmedabad", style: "I" },
] as const;

export default function LoginPage() {
  const { login } = useAuth();
  const [showDemo, setShowDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-slate-100 p-4 sm:p-8 lg:p-12">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[82vh]">
        <section className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" /> RDC CONCRETE · LEARN TOGETHER
          </div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Turn every conversation<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-300 to-teal-300">into visible progress.</span>
            </h1>
            <p className="mt-3 text-lg font-bold text-slate-300">Margdarshan <span className="text-indigo-300 font-normal" lang="hi">मार्गदर्शन</span></p>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed max-w-lg">Prepare, meet, agree actions, follow through and reflect across a guided 13-session mentoring journey for RDC employees.</p>
          <p className="text-xs text-indigo-200/90" lang="hi">तैयारी करें, बातचीत करें, कार्य तय करें और प्रगति को सहेजें।</p>

          {error && <div className="p-4 bg-rose-950/80 border border-rose-500/40 text-rose-200 rounded-2xl flex gap-3 text-xs"><AlertCircle className="w-5 h-5 shrink-0" />{error}</div>}

          <div className="space-y-3">
            <a href="/api/auth/google" className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-2xl shadow-lg transition">
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
              Continue with RDC Google account
            </a>
            <p className="text-[11px] text-slate-400">For verified @rdc.in accounts.</p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/60 overflow-hidden">
            <button type="button" className="w-full p-4 flex items-center justify-between text-left bg-transparent" onClick={() => setShowDemo((value) => !value)} aria-expanded={showDemo}>
              <span><strong className="text-sm text-white">Explore the sample journey</strong><span className="block text-[11px] text-slate-400">One-click personas with sample data</span></span>
              <ArrowRight className={`w-4 h-4 text-indigo-300 transition ${showDemo ? "rotate-90" : ""}`} />
            </button>
            {showDemo && <div className="p-4 pt-0 space-y-3 border-t border-slate-700">
              <p className="text-[11px] text-amber-200 pt-3">Demo workspace · Everything here is sample data and can be reset.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {personas.map((persona) => <button key={persona.code} disabled={busy} onClick={() => void demoSignIn(persona.code)} className="p-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-400 text-left disabled:opacity-50">
                  <span className="text-[10px] uppercase font-bold text-indigo-300">{persona.role} · DISC {persona.style}</span>
                  <span className="block text-xs font-bold text-white mt-1">{persona.name}</span>
                  <span className="block text-[10px] text-slate-400">{persona.detail}</span>
                </button>)}
              </div>
              <button disabled={busy} onClick={() => void demoSignIn("ADMIN001")} className="w-full p-3 rounded-xl bg-purple-950/70 border border-purple-500/30 hover:border-purple-400 flex items-center justify-between disabled:opacity-50">
                <span className="flex items-center gap-3"><Shield className="w-4 h-4 text-purple-300"/><span className="text-left"><strong className="block text-xs text-white">Administrator view</strong><span className="block text-[10px] text-purple-200">Cohort overview and attention queue</span></span></span><ArrowRight className="w-4 h-4"/>
              </button>
            </div>}
          </div>
        </section>

        <section className="lg:col-span-6">
          <div className="relative rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
            <Image src="/images/rdc-transit-mixer-mentoring.jpg" alt="RDC Concrete mentor and young engineer learning at a concrete site" width={1000} height={700} priority className="w-full h-auto object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6"><span className="text-xs font-bold uppercase tracking-wider text-indigo-300">A practical coaching rhythm</span><p className="text-lg font-extrabold text-white">One conversation. One clear action. Visible follow-through.</p></div>
          </div>
        </section>
      </div>
      <footer className="max-w-6xl mx-auto pt-6 border-t border-slate-800 text-center text-xs text-slate-500">Margdarshan · RDC Concrete · Internal learning platform</footer>
    </main>
  );
}
