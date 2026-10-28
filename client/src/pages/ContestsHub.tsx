import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface Contest {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  status: 'UPCOMING' | 'LIVE' | 'ENDED';
  durationMinutes: number;
  mode: string;
  cohort: string | null;
}
interface RankRow {
  rank: number;
  userId: string;
  name: string;
  score: number;
  durationUsedSec: number;
}

function countdown(toIso: string): string {
  const ms = new Date(toIso).getTime() - Date.now();
  if (ms <= 0) return 'now';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}
const fmtDur = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

export interface ContestsHubProps {
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onBack: () => void;
  onStart: (testId: string) => void;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const ContestsHub: React.FC<ContestsHubProps> = ({
  user,
  onBack,
  onStart,
  onNavigate,
  onLogout,
}) => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<{ contest: Contest; rows: RankRow[]; mine: RankRow | null } | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    apiClient
      .get<Contest[]>('/contests')
      .then(setContests)
      .catch(() => setError('Failed to load contests'))
      .finally(() => setLoading(false));
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const nav = onNavigate || (() => {});

  const enter = async (c: Contest) => {
    setBusy(c.id);
    setError(null);
    try {
      const { testId } = await apiClient.post<{ testId: string }>(`/contests/${c.slug}/start`, {});
      onStart(testId);
    } catch {
      setError('Could not enter the contest — it may not be live.');
    } finally {
      setBusy(null);
    }
  };

  const viewResults = async (c: Contest) => {
    setBusy(c.id);
    try {
      const d = await apiClient.get<{ leaderboard: RankRow[]; currentUser: RankRow | null }>(
        `/contests/${c.slug}/leaderboard`
      );
      setResults({ contest: c, rows: d.leaderboard, mine: d.currentUser });
    } catch {
      setError('Could not load results.');
    } finally {
      setBusy(null);
    }
  };

  const live = contests.filter((c) => c.status === 'LIVE');
  const upcoming = contests.filter((c) => c.status === 'UPCOMING');
  const past = contests.filter((c) => c.status === 'ENDED');

  const Card = (c: Contest) => (
    <div
      key={c.id}
      className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-indigo-500/50 p-6 flex flex-col justify-between shadow-lg shadow-slate-950/40 transition"
    >
      <div>
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-black text-lg text-white">{c.title}</h3>
          <span
            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border shrink-0 ${
              c.status === 'LIVE'
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                : c.status === 'UPCOMING'
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {c.status}
          </span>
        </div>
        {c.description && <p className="text-xs text-slate-400 mb-3 leading-relaxed">{c.description}</p>}
        <p className="text-xs text-slate-400 mb-5">
          ⏱ {c.durationMinutes} min · {c.mode}
          {c.cohort ? ` · ${c.cohort} only` : ' · open to all'}
          {c.status === 'LIVE' && (
            <span className="text-emerald-400 font-bold"> · Ends in {countdown(c.endsAt)}</span>
          )}
          {c.status === 'UPCOMING' && (
            <span className="text-amber-400 font-bold"> · Starts in {countdown(c.startsAt)}</span>
          )}
        </p>
      </div>

      <div className="mt-auto">
        {c.status === 'LIVE' && (
          <button
            onClick={() => enter(c)}
            disabled={busy === c.id}
            className="w-full py-2.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition shadow-lg shadow-emerald-900/40 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {busy === c.id ? 'Entering…' : '⚡ Enter Contest Now'}
          </button>
        )}
        {c.status === 'UPCOMING' && (
          <button disabled className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed">
            Starts in {countdown(c.startsAt)}
          </button>
        )}
        {c.status === 'ENDED' && (
          <button
            onClick={() => viewResults(c)}
            disabled={busy === c.id}
            className="w-full py-2.5 rounded-xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-md shadow-indigo-900/40 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            🏆 View Contest Results
          </button>
        )}
      </div>
    </div>
  );

  return (
    <FullScreenShell
      title="Live Placement Contests"
      subtitle="Timed competitive rounds against your cohort"
      icon="🏁"
      currentPage="contests"
      user={user}
      onNavigate={nav}
      onBack={onBack}
      onLogout={onLogout}
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-slate-900/70 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black mb-3">
              <span>🏁</span> Placement Simulation League
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Live & Scheduled Contests
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
              Test your speed under placement pressure. Compete on timed coding challenges and aptitude rounds to earn leaderboard prestige and bonus XP.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/20 border border-rose-500/30 text-rose-300 p-3 rounded-2xl text-xs font-bold">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            <p className="text-xs text-slate-400 font-bold">Loading contest schedules…</p>
          </div>
        )}

        {!loading && contests.length === 0 && (
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow p-10 text-center text-slate-400 text-sm">
            No contests scheduled currently. Check back soon!
          </div>
        )}

        {live.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <h2 className="font-black text-base text-emerald-400">🟢 Live Right Now</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{live.map(Card)}</div>
          </section>
        )}

        {upcoming.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <h2 className="font-black text-base text-amber-400">⏳ Upcoming Contests</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{upcoming.map(Card)}</div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <h2 className="font-black text-base text-slate-400">✅ Past Competitions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{past.map(Card)}</div>
          </section>
        )}

        {/* RESULTS MODAL */}
        {results && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setResults(null)}
          >
            <div
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                <h2 className="font-black text-lg text-white">🏆 {results.contest.title} Results</h2>
                <button
                  onClick={() => setResults(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {results.mine && (
                <div className="bg-indigo-500/15 border border-indigo-500/30 rounded-2xl p-4 mb-4 text-xs font-bold text-indigo-300">
                  Your Standing: #{results.mine.rank} · {results.mine.score}% · {fmtDur(results.mine.durationUsedSec)}
                </div>
              )}

              {results.rows.length === 0 ? (
                <p className="text-slate-400 text-center py-6 text-xs">No submissions recorded.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-slate-400 border-b border-slate-800 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="text-left py-2">#</th>
                      <th className="text-left py-2">Candidate</th>
                      <th className="text-right py-2">Score</th>
                      <th className="text-right py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {results.rows.map((r) => (
                      <tr
                        key={r.userId}
                        className={results.mine?.userId === r.userId ? 'bg-indigo-500/10 text-indigo-200' : 'text-slate-200'}
                      >
                        <td className="py-2.5 font-bold">
                          {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `#${r.rank}`}
                        </td>
                        <td className="py-2.5 font-semibold">{r.name}</td>
                        <td className="text-right py-2.5 font-bold text-emerald-400">{r.score}%</td>
                        <td className="text-right py-2.5 text-slate-400">{fmtDur(r.durationUsedSec)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
export default ContestsHub;
