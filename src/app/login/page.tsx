"use client";
import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { Users, Sparkles, Shield, UserCheck, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleDemoSignIn = async (code: string) => {
    setBusy(true);
    setError("");
    const res = await login(code);
    if (!res.success) {
      setError(res.error || "Could not complete demo sign-in.");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 lg:p-12">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6">
        {/* Left Column: Platform Branding & Sign-in */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>RDC CONCRETE · LEARN TOGETHER</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Your potential.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-300 to-teal-300">
                Our shared journey.
              </span>
            </h1>
            <p className="text-lg font-bold text-slate-300 flex items-center gap-2">
              <span>Margdarshan</span>
              <span className="text-indigo-400 font-normal" lang="hi">मार्गदर्शन</span>
            </p>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed max-w-lg">
            A structured, 12-week mentoring and development ecosystem for Graduate Engineer Trainees and seasoned managers to build technical mastery, operational safety, and leadership confidence.
          </p>

          <p className="text-xs text-indigo-200/90 italic" lang="hi">
            अनुभव से सीखें, आत्मविश्वास बढ़ाएँ और अपनी मेंटरिंग यात्रा को सहेजें।
          </p>

          {error && (
            <div className="p-4 bg-rose-950/80 border border-rose-500/40 text-rose-200 rounded-2xl flex items-center gap-3 text-xs">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Production Sign-In */}
          <div className="space-y-3 pt-2">
            <a
              href="/api/auth/google"
              className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-2xl shadow-lg shadow-white/10 transition cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google Workspace (@rdc.in)</span>
            </a>

            <p className="text-[11px] text-slate-400">
              For verified @rdc.in Google accounts. Saved records are shared between counterparts and program administrators.
            </p>
          </div>

          {/* TEMPORARY TESTING PERSONA SWITCHER */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-extrabold tracking-wider uppercase border border-amber-500/30">
                  Testing Mode
                </span>
                <span className="text-xs font-bold text-slate-200">
                  1-Click Role &amp; Persona Switcher
                </span>
              </div>
              <span className="text-[10px] text-slate-400">2 Complete Pairs</span>
            </div>

            <p className="text-[11px] text-slate-300">
              Switch roles instantly to test both mentor and mentee spaces, session scheduling, Google Meet links, and surveys:
            </p>

            <div className="space-y-3">
              {/* Pair 1 */}
              <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-700/70 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300">
                  <span>Pair 1 · Operations &amp; Quality</span>
                  <span className="text-[10px] text-slate-400">DISC: D ↔ S</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    disabled={busy}
                    onClick={() => void handleDemoSignIn("EMP101")}
                    className="p-2.5 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/30 hover:border-indigo-400 rounded-xl text-left transition cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-300 uppercase">Mentor</span>
                      <span className="text-[9px] bg-rose-950 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30">DISC D</span>
                    </div>
                    <p className="text-xs font-bold text-white mt-0.5">Rajesh Sharma</p>
                    <p className="text-[10px] text-slate-400 truncate">Sr. Operations Mgr · Turbhe</p>
                  </button>

                  <button
                    disabled={busy}
                    onClick={() => void handleDemoSignIn("EMP201")}
                    className="p-2.5 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/30 hover:border-indigo-400 rounded-xl text-left transition cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-300 uppercase">Mentee</span>
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">DISC S</span>
                    </div>
                    <p className="text-xs font-bold text-white mt-0.5">Amit Verma</p>
                    <p className="text-[10px] text-slate-400 truncate">GET Engineer · Pune Plant</p>
                  </button>
                </div>
              </div>

              {/* Pair 2 */}
              <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-700/70 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-teal-300">
                  <span>Pair 2 · Technical Quality &amp; Plant Ops</span>
                  <span className="text-[10px] text-slate-400">DISC: C ↔ I</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    disabled={busy}
                    onClick={() => void handleDemoSignIn("EMP102")}
                    className="p-2.5 bg-teal-950/70 hover:bg-teal-900 border border-teal-500/30 hover:border-teal-400 rounded-xl text-left transition cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-teal-300 uppercase">Mentor</span>
                      <span className="text-[9px] bg-blue-950 text-blue-300 px-1.5 py-0.2 rounded border border-blue-500/30">DISC C</span>
                    </div>
                    <p className="text-xs font-bold text-white mt-0.5">Shalini Iyer</p>
                    <p className="text-[10px] text-slate-400 truncate">Quality Head · Mumbai Central</p>
                  </button>

                  <button
                    disabled={busy}
                    onClick={() => void handleDemoSignIn("EMP202")}
                    className="p-2.5 bg-teal-950/70 hover:bg-teal-900 border border-teal-500/30 hover:border-teal-400 rounded-xl text-left transition cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-teal-300 uppercase">Mentee</span>
                      <span className="text-[9px] bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">DISC I</span>
                    </div>
                    <p className="text-xs font-bold text-white mt-0.5">Priya Patel</p>
                    <p className="text-[10px] text-slate-400 truncate">GET Engineer · Ahmedabad</p>
                  </button>
                </div>
              </div>

              {/* Admin */}
              <button
                disabled={busy}
                onClick={() => void handleDemoSignIn("ADMIN001")}
                className="w-full p-2.5 bg-purple-950/70 hover:bg-purple-900 border border-purple-500/30 hover:border-purple-400 rounded-xl flex items-center justify-between transition cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">Log in as Administrator (Dr. K.S. Bhoon)</p>
                    <p className="text-[10px] text-purple-300">System Admin Control Center</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Visual Graphic */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative rounded-3xl overflow-hidden border border-slate-700 shadow-2xl group">
            <Image
              src="/images/rdc-transit-mixer-mentoring.jpg"
              alt="RDC Concrete mentor and young GET engineer reviewing quality test at site"
              width={1000}
              height={700}
              priority
              className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Empowering Engineering Talent
              </span>
              <p className="text-lg font-extrabold text-white">
                Learn from experience. Build confidence. Drive impact.
              </p>
              <p className="text-xs text-slate-300">
                RDC Concrete Ready Mix Concrete operations across 100+ plants in India.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="max-w-6xl mx-auto w-full pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
        Margdarshan Platform &bull; RDC Concrete India &bull; Internal Developmental System
      </footer>
    </main>
  );
}
