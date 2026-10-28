import React, { useState } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface DiagnosticStartResponse {
  attemptId: string;
  items: any[];
  resumed: boolean;
}

const PILLAR_CARDS = [
  { icon: '🧮', title: '8 aptitude', sub: 'Quant · Logical · Verbal' },
  { icon: '🖥️', title: '12 core CS', sub: 'CN · OS · DBMS · SQL' },
  { icon: '⚡', title: '1 coding', sub: 'DSA problem (optional)' },
];

interface DiagnosticIntroProps {
  onStart: (attemptId: string) => void;
  onSkip: () => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const DiagnosticIntro: React.FC<DiagnosticIntroProps> = ({
  onStart,
  onSkip,
  user,
  onNavigate = () => {},
  onLogout,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<DiagnosticStartResponse>('/diagnostic/start', {});
      onStart(res.attemptId);
    } catch (e: any) {
      setError(e?.message || 'Could not start the diagnostic — try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FullScreenShell
      title="Diagnostic Assessment"
      subtitle="Benchmark your baseline across Aptitude, Core CS, and Coding"
      currentPage="diagnostic-intro"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <div className="max-w-3xl mx-auto py-6 animate-fade-in">
        <div className="bg-slate-900/90 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-indigo-900/80 via-violet-900/80 to-purple-900/80 text-white p-8 sm:p-10 border-b border-indigo-500/20 relative">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 mb-4 bg-white/10 border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest text-indigo-200">
              ✨ Baseline Diagnostic
            </div>
            <h1 className="text-3xl sm:text-4xl font-black mb-3 text-white">Let's map your starting point</h1>
            <p className="text-slate-300 font-normal leading-relaxed text-sm sm:text-base max-w-2xl">
              A quick ~15-minute diagnostic test. We'll grade it instantly, assign your initial belt (Bronze → Diamond), and build a personalized learning roadmap.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Pillar Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PILLAR_CARDS.map((c) => (
                <div
                  key={c.title}
                  className="text-center bg-slate-950/60 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition"
                >
                  <div className="text-3xl mb-1.5">{c.icon}</div>
                  <div className="font-black text-sm text-white">{c.title}</div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                    {c.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Checklist */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-2.5">
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>21 questions, ~15 minutes. One question at a time with clear timers.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Instant diagnostic report — identify strong foundations and growth areas.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Completely skippable — you can take or retake anytime from the Prep Tracker.</span>
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-xs">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={start}
                disabled={busy}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-500/25 active:scale-95 transition disabled:opacity-50"
              >
                {busy ? 'Preparing your test…' : '🚀 Start Diagnostic'}
              </button>
              <button
                onClick={onSkip}
                disabled={busy}
                className="py-3.5 px-6 rounded-xl font-bold text-xs text-slate-400 bg-slate-800/80 hover:bg-slate-700 hover:text-white border border-slate-700 transition disabled:opacity-50"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    </FullScreenShell>
  );
};
