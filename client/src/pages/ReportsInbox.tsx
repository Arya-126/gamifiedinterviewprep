import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface ReportRow {
  id: string;
  sourceType: string;
  sourceId: string;
  overallScore: number;
  createdAt: string;
  weakConcepts: { concept: string; subject: string; missCount: number }[];
}

const SOURCE_LABEL: Record<string, string> = {
  'aptitude-quiz': '🧮 Aptitude',
  'core-cs-quiz': '🖥️ Core CS',
  'ai-interview': '🤖 AI Interview',
  'coding-round': '⚡ Coding',
};

interface ReportsInboxProps {
  onOpen: (reportId: string) => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const ReportsInbox: React.FC<ReportsInboxProps> = ({
  onOpen,
  user,
  onNavigate = () => {},
  onLogout,
}) => {
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<ReportRow[]>('/reports?limit=30')
      .then(setRows)
      .catch(() => setError('Failed to load reports'));
  }, []);

  return (
    <FullScreenShell
      title="Performance Reports"
      subtitle="Detailed analysis of every quiz and interview session"
      currentPage="reports-inbox"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Comprehensive Reports</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Detailed breakdown of your diagnostic quizzes, technical challenges, and mock interviews — complete with per-mistake explanations and AI-generated synopses for weaker concepts.
          </p>
        </div>

        {error ? (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-6 rounded-2xl text-center">
            {error}
          </div>
        ) : rows === null ? (
          <div className="text-center py-16 text-slate-500 animate-pulse font-medium">
            Loading your reports…
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-xl">
            <div className="text-5xl mb-3">📭</div>
            <div className="font-bold text-lg text-white mb-1">No reports recorded yet</div>
            <div className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              Complete any quiz, coding session, or AI interview — your detailed report will appear here automatically.
            </div>
            <button
              onClick={() => onNavigate('interview-hub')}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
            >
              Start Practice Session
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const pct = Math.round(r.overallScore);
              const scoreBadge =
                pct >= 80
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : pct >= 60
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400';
              const weakCount = (r.weakConcepts || []).length;

              return (
                <button
                  key={r.id}
                  onClick={() => onOpen(r.id)}
                  className="w-full text-left bg-slate-900/90 hover:bg-slate-850 p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/50 shadow-lg shadow-slate-950/40 transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
                        {SOURCE_LABEL[r.sourceType] || r.sourceType}
                      </span>
                      {weakCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                          ⚠ {weakCount} weak concept{weakCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div
                      className={`px-3 py-1 rounded-xl text-lg sm:text-xl font-black border ${scoreBadge}`}
                    >
                      {pct}%
                    </div>
                    <span className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-transform text-lg">
                      →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
