import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';

interface SidebarData {
  xpTotal: number;
  level: number;
  streakDays: number;
  rank: number;
  codingSolved: number;
  codingTotal: number;
  weakTopics: { name: string; score: number }[];
  miniLeaderboard: { name: string; xpTotal: number; isMe: boolean }[];
}

export const StatsSidebar: React.FC = () => {
  const [data, setData] = useState<SidebarData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    apiClient
      .get<SidebarData>('/leaderboard/sidebar')
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null;
  if (!data) {
    return (
      <aside className="w-72 shrink-0 space-y-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg shadow-slate-950/50 p-5 text-center text-sm text-slate-400">
          Loading your stats…
        </div>
      </aside>
    );
  }

  const codingPct =
    data.codingTotal > 0 ? Math.min(100, Math.round((data.codingSolved / data.codingTotal) * 100)) : 0;

  return (
    <aside className="w-72 shrink-0 space-y-4">
      {/* XP / level / streak strip */}
      <div className="bg-gradient-to-r from-indigo-900/70 via-purple-900/60 to-slate-900/90 border border-indigo-500/30 rounded-2xl shadow-lg shadow-slate-950/50 p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <p className="font-black text-lg bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
            ⚡ {data.xpTotal.toLocaleString()} XP
          </p>
          <span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
            #{data.rank} global
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1">🎖️ Level {data.level}</span>
          <span className="flex items-center gap-1 text-amber-400">🔥 {data.streakDays}d streak</span>
        </div>
      </div>

      {/* coding progress */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg shadow-slate-950/50 p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-black text-sm text-white flex items-center gap-2">
            <span>💻</span> Coding Progress
          </h3>
          <span className="text-xs font-bold text-slate-400">
            {data.codingSolved}/{data.codingTotal}
          </span>
        </div>
        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
            style={{ width: `${codingPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2 font-medium">{codingPct}% of problems solved</p>
      </div>

      {/* weak topics */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg shadow-slate-950/50 p-5">
        <h3 className="font-black text-sm text-white mb-3 flex items-center gap-2">
          <span>🎯</span> Weak Topics
        </h3>
        {data.weakTopics.length === 0 ? (
          <div className="text-center py-2">
            <p className="text-2xl mb-1">🌟</p>
            <p className="text-xs text-slate-400 font-medium">
              No weak topics detected — keep practicing to stay sharp!
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {data.weakTopics.map((t) => (
              <li key={t.name} className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-300 truncate">{t.name}</span>
                <span className="text-xs font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full shrink-0">
                  {t.score}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* mini leaderboard */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg shadow-slate-950/50 p-5">
        <h3 className="font-black text-sm text-white mb-3 flex items-center gap-2">
          <span>🏆</span> Top 5 Cohort
        </h3>
        <ul className="space-y-1.5">
          {data.miniLeaderboard.map((u, i) => (
            <li
              key={`${u.name}-${i}`}
              className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl transition ${
                u.isMe
                  ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-200'
                  : 'bg-slate-800/40 border border-slate-800 text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-slate-400 w-5">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <span
                  className={`text-xs font-semibold truncate ${
                    u.isMe ? 'text-indigo-300 font-bold' : 'text-slate-200'
                  }`}
                >
                  {u.name}
                  {u.isMe && ' (You)'}
                </span>
              </span>
              <span className="text-xs font-bold text-emerald-400 shrink-0">
                {u.xpTotal.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};
