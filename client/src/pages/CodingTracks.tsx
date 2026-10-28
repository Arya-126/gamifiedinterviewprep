import React, { useEffect, useState, useMemo } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

// Coding practice tracks: overall progress bar + track cards or all-problems list view
// GET /coding-tracks

interface TrackProblem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  status: 'SOLVED' | 'ATTEMPTED' | 'UNATTEMPTED';
  bestScore: number;
  trackName?: string;
  level?: number;
}

interface TrackLevel {
  level: number;
  solved: number;
  total: number;
  complete: boolean;
  problems: TrackProblem[];
}

interface Track {
  track: string;
  name: string;
  solved: number;
  total: number;
  percent: number;
  levels: TrackLevel[];
}

interface TracksResponse {
  tracks: Track[];
  overall: { solved: number; total: number; percent: number };
}

const DIFF_CHIP: Record<string, string> = {
  EASY: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  MEDIUM: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  HARD: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
};

const statusIcon = (s: TrackProblem['status']) =>
  s === 'SOLVED' ? '✅' : s === 'ATTEMPTED' ? '🟡' : '○';

const Ring: React.FC<{ percent: number }> = ({ percent }) => {
  const r = 20;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, percent)) / 100) * c;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke="#6366f1"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${c}`}
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="900" fill="#f8fafc">
        {percent}%
      </text>
    </svg>
  );
};

export interface CodingTracksProps {
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onBack?: () => void;
  onOpenProblem: (slug: string) => void;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const CodingTracks: React.FC<CodingTracksProps> = ({
  user,
  onBack,
  onOpenProblem,
  onNavigate,
  onLogout,
}) => {
  const [data, setData] = useState<TracksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // per-track: which level's problem list is expanded ('ALL' means show all levels)
  const [open, setOpen] = useState<Record<string, number | 'ALL' | null>>({});
  // View mode: 'tracks' vs 'all-problems'
  const [viewMode, setViewMode] = useState<'tracks' | 'all-problems'>('tracks');
  // Filters for 'all-problems'
  const [searchQuery, setSearchQuery] = useState('');
  const [diffFilter, setDiffFilter] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SOLVED' | 'UNATTEMPTED'>('ALL');
  const [trackFilter, setTrackFilter] = useState<string>('ALL');

  useEffect(() => {
    apiClient
      .get<TracksResponse>('/coding-tracks')
      .then((d) => {
        setData(d);
        const o: Record<string, number | 'ALL' | null> = {};
        for (const t of d.tracks) {
          const firstIncomplete = t.levels.find((l) => !l.complete);
          o[t.track] = firstIncomplete ? firstIncomplete.level : t.levels[0]?.level ?? null;
        }
        setOpen(o);
      })
      .catch((e) => setError(e?.message || 'Failed to load tracks.'));
  }, []);

  const nav = onNavigate || (() => {});

  // Flatten all problems across tracks for the 'all-problems' view
  const allProblems = useMemo(() => {
    if (!data) return [];
    const list: TrackProblem[] = [];
    const seen = new Set<string>();
    for (const t of data.tracks) {
      for (const lv of t.levels) {
        for (const p of lv.problems) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            list.push({ ...p, trackName: t.name, level: lv.level });
          }
        }
      }
    }
    return list;
  }, [data]);

  // Filtered problems in 'all-problems' mode
  const filteredAllProblems = useMemo(() => {
    return allProblems.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesTrack = p.trackName?.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesTrack) return false;
      }
      if (diffFilter !== 'ALL' && p.difficulty !== diffFilter) return false;
      if (statusFilter === 'SOLVED' && p.status !== 'SOLVED') return false;
      if (statusFilter === 'UNATTEMPTED' && p.status === 'SOLVED') return false;
      if (trackFilter !== 'ALL' && p.trackName !== trackFilter) return false;
      return true;
    });
  }, [allProblems, searchQuery, diffFilter, statusFilter, trackFilter]);

  if (error) {
    return (
      <FullScreenShell
        title="Coding Practice Tracks"
        subtitle="Topic-wise DSA ladders"
        icon="💻"
        currentPage="coding-tracks"
        user={user}
        onNavigate={nav}
        onBack={onBack}
        onLogout={onLogout}
      >
        <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 p-5 rounded-2xl max-w-lg mx-auto my-12 text-center text-sm font-bold">
          {error}
        </div>
      </FullScreenShell>
    );
  }

  if (!data) {
    return (
      <FullScreenShell
        title="Coding Practice Tracks"
        subtitle="Topic-wise DSA ladders"
        icon="💻"
        currentPage="coding-tracks"
        user={user}
        onNavigate={nav}
        onBack={onBack}
        onLogout={onLogout}
      >
        <div className="flex flex-col items-center justify-center p-16 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          <p className="text-xs text-slate-400 font-bold">Loading coding tracks and questions…</p>
        </div>
      </FullScreenShell>
    );
  }

  return (
    <FullScreenShell
      title="Coding Practice Tracks"
      subtitle="Topic-wise DSA ladders & 70+ placement practice problems"
      icon="💻"
      currentPage="coding-tracks"
      user={user}
      onNavigate={nav}
      onBack={onBack}
      onLogout={onLogout}
    >
      <div className="flex flex-col gap-6">
        {/* HEADER CONTROLS + VIEW SWITCHER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black mb-2">
              <span>💻</span> 70+ Curated DSA Questions
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Coding Problems & Tracks
            </h1>
          </div>

          {/* View Switcher */}
          <div className="flex items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('tracks')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'tracks'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎯 Track Ladders ({data.tracks.length})
            </button>
            <button
              onClick={() => setViewMode('all-problems')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'all-problems'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📋 All Problems
              <span className="px-1.5 py-0.2 text-[10px] bg-slate-800 text-indigo-300 rounded-full font-black border border-indigo-500/30">
                {allProblems.length}
              </span>
            </button>
          </div>
        </div>

        {/* OVERALL PROGRESS BANNER */}
        <div className="bg-slate-900/90 rounded-2xl shadow-lg shadow-slate-950/40 p-5 border border-slate-800">
          <div className="flex justify-between items-baseline mb-2">
            <div>
              <span className="font-black text-sm text-white">Overall Coding Progress</span>
              <span className="text-xs text-slate-400 ml-2">
                ({allProblems.length} verified practice questions)
              </span>
            </div>
            <span className="text-xs font-bold text-slate-300">
              {data.overall.solved} / {data.overall.total} solved ·{' '}
              <span className="text-emerald-400">{data.overall.percent}%</span>
            </span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${data.overall.percent}%` }}
            />
          </div>
        </div>

        {/* VIEW MODE 1: ALL 70 PROBLEMS LIST */}
        {viewMode === 'all-problems' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-slate-900/90 rounded-2xl shadow-lg shadow-slate-950/40 p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[220px]">
                <input
                  type="text"
                  placeholder="Search by problem title or topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-800 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Difficulty Filter */}
              <div className="flex items-center gap-1">
                {(['ALL', 'EASY', 'MEDIUM', 'HARD'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDiffFilter(d)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                      diffFilter === d
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Track Dropdown Filter */}
              <select
                value={trackFilter}
                onChange={(e) => setTrackFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-slate-800 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Topics / Tracks</option>
                {data.tracks.map((t) => (
                  <option key={t.track} value={t.name}>
                    {t.name} ({t.total})
                  </option>
                ))}
              </select>
            </div>

            {/* Problem Count Summary */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
              <span>Showing {filteredAllProblems.length} of {allProblems.length} problems</span>
              <span>Click any problem to launch in online IDE</span>
            </div>

            {/* List of Problems */}
            <div className="bg-slate-900/90 rounded-2xl shadow-lg shadow-slate-950/40 divide-y divide-slate-800/80 border border-slate-800 overflow-hidden">
              {filteredAllProblems.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => onOpenProblem(p.slug)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-800/60 text-left transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-center text-base">{statusIcon(p.status)}</span>
                    <span className="text-xs text-slate-500 font-mono w-6">#{idx + 1}</span>
                    <div className="truncate">
                      <p className="font-bold text-white group-hover:text-indigo-300 text-sm truncate">
                        {p.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-semibold text-slate-400">
                          {p.trackName}
                        </span>
                        {p.level && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-800 border border-slate-700 text-slate-300 rounded">
                            L{p.level}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {p.status !== 'UNATTEMPTED' && (
                      <span className="text-xs font-bold text-slate-400 hidden sm:inline">
                        Score: {Math.round(p.bestScore)}%
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        DIFF_CHIP[p.difficulty] || 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {p.difficulty}
                    </span>
                    <span className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* VIEW MODE 2: TRACK LADDERS */}
        {viewMode === 'tracks' && (
          <div className="space-y-4">
            {data.tracks.length === 0 && (
              <div className="bg-slate-900/90 rounded-2xl shadow p-8 text-center text-slate-400 italic border border-slate-800">
                No coding tracks available yet — check back soon.
              </div>
            )}

            {data.tracks.map((t) => {
              const openLevel = open[t.track] ?? null;
              const isAllOpen = openLevel === 'ALL';

              return (
                <div
                  key={t.track}
                  className="bg-slate-900/90 rounded-2xl shadow-lg shadow-slate-950/40 p-5 border border-slate-800 hover:border-indigo-500/30 transition"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <Ring percent={t.percent} />
                      <div className="min-w-0">
                        <h2 className="font-black text-lg text-white truncate">{t.name}</h2>
                        <p className="text-xs font-bold text-slate-400">
                          {t.solved} / {t.total} solved · {t.levels.length} levels
                        </p>
                      </div>
                    </div>

                    {/* Toggle Expand All Levels */}
                    <button
                      onClick={() =>
                        setOpen((o) => ({
                          ...o,
                          [t.track]: isAllOpen ? t.levels[0]?.level ?? null : 'ALL',
                        }))
                      }
                      className="text-xs font-bold text-indigo-300 hover:text-white bg-slate-800 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/40 px-3 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      {isAllOpen ? 'Collapse All' : `Show All (${t.total})`}
                    </button>
                  </div>

                  {/* horizontal level node chain */}
                  <div className="flex items-center overflow-x-auto pb-2 mb-1 scrollbar-none">
                    {t.levels.map((lv, i) => (
                      <React.Fragment key={lv.level}>
                        {i > 0 && (
                          <div
                            className={`h-1 w-8 shrink-0 rounded ${
                              t.levels[i - 1].complete ? 'bg-emerald-500/80' : 'bg-slate-800'
                            }`}
                          />
                        )}
                        <button
                          onClick={() =>
                            setOpen((o) => ({
                              ...o,
                              [t.track]: o[t.track] === lv.level ? null : lv.level,
                            }))
                          }
                          title={`Level ${lv.level}: ${lv.solved}/${lv.total} solved`}
                          className={`shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-2xl border-2 transition cursor-pointer ${
                            openLevel === lv.level
                              ? 'border-indigo-500 bg-indigo-500/20 shadow-md shadow-indigo-900/50'
                              : lv.complete
                                ? 'border-emerald-500/50 bg-emerald-500/10'
                                : 'border-slate-800 bg-slate-850 hover:border-indigo-500/40'
                          }`}
                        >
                          <span className="text-base leading-none">{lv.complete ? '✅' : '○'}</span>
                          <span className="text-[10px] font-black text-slate-400 mt-1">
                            L{lv.level}
                          </span>
                        </button>
                      </React.Fragment>
                    ))}
                  </div>

                  {/* problem rows for the expanded level(s) */}
                  {t.levels
                    .filter((lv) => isAllOpen || lv.level === openLevel)
                    .map((lv) => (
                      <div key={lv.level} className="mt-3 border-t border-slate-800/80 pt-3 first:mt-2">
                        <div className="text-xs font-black text-slate-400 uppercase mb-2 flex items-center justify-between">
                          <span>
                            Level {lv.level} · {lv.solved}/{lv.total} solved
                            {lv.complete ? ' · complete 🎉' : ''}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {lv.problems.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => onOpenProblem(p.slug)}
                              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-800 text-left transition cursor-pointer group"
                            >
                              <span className="w-6 text-center">{statusIcon(p.status)}</span>
                              <span className="flex-1 font-semibold text-sm text-slate-200 group-hover:text-white truncate">
                                {p.title}
                              </span>
                              {p.status !== 'UNATTEMPTED' && (
                                <span className="text-xs font-bold text-slate-400">
                                  best {Math.round(p.bestScore)}%
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  DIFF_CHIP[p.difficulty] || 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {p.difficulty}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
export default CodingTracks;
