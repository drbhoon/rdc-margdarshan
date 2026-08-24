'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [employeeCode, setEmployeeCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeCode.trim()) {
      setError('Please enter your Employee Code');
      return;
    }

    setError('');
    setLoading(true);
    const res = await login(employeeCode.trim());
    setLoading(false);

    if (res.success) {
      router.push('/dashboard');
    } else {
      setError(res.error || 'Authentication failed');
    }
  };

  const selectPreseeded = async (code: string) => {
    setError('');
    setLoading(true);
    const res = await login(code);
    setLoading(false);
    if (res.success) {
      router.push('/dashboard');
    } else {
      setError(res.error || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Margdarshan</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Internal Corporate Mentoring Platform
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Employee Code
            </label>
            <input
              type="text"
              placeholder="e.g. EMP101, EMP201"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-lg font-semibold transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 text-center">
            Or Quick Login (Pre-seeded Accounts)
          </p>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => selectPreseeded('EMP001')}
              disabled={loading}
              className="w-full text-left px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all flex justify-between items-center"
            >
              <span>Radhika Sen (Head of L&D & Operational Excellence)</span>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">ADMIN</span>
            </button>
            <button
              onClick={() => selectPreseeded('EMP101')}
              disabled={loading}
              className="w-full text-left px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all flex justify-between items-center"
            >
              <span>Amit Sharma (Chief Maintenance Engineer)</span>
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">MENTOR</span>
            </button>
            <button
              onClick={() => selectPreseeded('EMP102')}
              disabled={loading}
              className="w-full text-left px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all flex justify-between items-center"
            >
              <span>Priya Patel (VP Sourcing & Contracts)</span>
              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">MENTOR</span>
            </button>
            <button
              onClick={() => selectPreseeded('EMP201')}
              disabled={loading}
              className="w-full text-left px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all flex justify-between items-center"
            >
              <span>Aarav Mehta (Plant Maintenance Engineer)</span>
              <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded font-bold">MENTEE</span>
            </button>
            <button
              onClick={() => selectPreseeded('EMP203')}
              disabled={loading}
              className="w-full text-left px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all flex justify-between items-center"
            >
              <span>Kabir Kapoor (EHS & Safety Officer)</span>
              <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded font-bold">MENTEE</span>
            </button>
            <button
              onClick={() => selectPreseeded('EMP205')}
              disabled={loading}
              className="w-full text-left px-4 py-2 border border-emerald-300 bg-emerald-50/60 rounded-lg text-xs font-medium text-emerald-900 hover:bg-emerald-100 transition-all flex justify-between items-center"
            >
              <span>Vikram Shah (New Graduate Engineer - Fresh Onboarding)</span>
              <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">NEW MENTEE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
