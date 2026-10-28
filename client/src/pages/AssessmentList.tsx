import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface AvailableTest {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  mode: 'PRACTICE' | 'PROCTORED';
  negativeMarking: number;
  passScore: number | null;
  company: { name: string } | null;
  sections: { title: string; kind: string }[];
  attempts: { id: string; status: string; score: number | null; startedAt: string }[];
}

interface CompanyCard {
  id: string;
  name: string;
  slug: string;
  rounds: { title: string; count: number }[];
  tracks: string[];
  durationMinutes: number;
}

export interface AssessmentListProps {
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onStart: (testId: string) => void;
  onOpenCompany: (slug: string) => void;
  onBack: () => void;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const AssessmentList: React.FC<AssessmentListProps> = ({
  user,
  onStart,
  onOpenCompany,
  onBack,
  onNavigate,
  onLogout,
}) => {
  const [tests, setTests] = useState<AvailableTest[]>([]);
  const [companies, setCompanies] = useState<CompanyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<AvailableTest[]>('/assessments/available')
      .then(setTests)
      .catch(() => setError('Failed to load tests'))
      .finally(() => setLoading(false));
    apiClient.get<CompanyCard[]>('/companies').then(setCompanies).catch(() => {});
  }, []);

  const nav = onNavigate || (() => {});

  return (
    <FullScreenShell
      title="Companies & Mock Assessments"
      subtitle="Company-specific hiring patterns and full-length proctored tests"
      icon="🏢"
      currentPage="assessments"
      user={user}
      onNavigate={nav}
      onBack={onBack}
      onLogout={onLogout}
    >
      <div className="flex flex-col gap-8">
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-slate-900/70 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black mb-3">
              <span>🏢</span> Real Hiring Workflows
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Placement Mock Tests & Company Prep
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
              Target enterprise recruitment drives (TCS, Amazon, Microsoft, Infosys) with company-pattern tests, or take timed, proctored assessments with full question breakdowns.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/20 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-xs font-bold">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            <p className="text-xs text-slate-400 font-bold">Loading available mocks and companies…</p>
          </div>
        )}

        {/* COMPANIES GRID */}
        {companies.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <h2 className="font-black text-lg text-white">Target Company Workspaces</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onOpenCompany(c.slug)}
                  className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 text-white p-6 rounded-2xl shadow-lg shadow-slate-950/40 hover:-translate-y-1 transition text-left cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-black text-lg text-white group-hover:text-indigo-300 transition">
                        {c.name}
                      </h3>
                      {c.tracks.length > 0 && (
                        <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                          {c.tracks.length} Tracks
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                      {c.rounds.map((r) => `${r.title} (${r.count})`).join(' · ')} · {c.durationMinutes} min
                    </p>
                  </div>

                  <span className="w-full text-center py-2.5 rounded-xl font-bold bg-slate-800 group-hover:bg-indigo-600/30 border border-slate-700/80 group-hover:border-indigo-500/50 text-slate-200 group-hover:text-white text-xs transition">
                    Open Company Prep & Readiness →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PUBLISHED TESTS GRID */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <h2 className="font-black text-lg text-white">Full-Length Mock Assessments</h2>
          </div>

          {!loading && tests.length === 0 && (
            <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow text-center text-slate-400 text-xs">
              No published tests yet. Check back soon!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {tests.map((t) => {
              const inProgress = t.attempts.find((a) => a.status === 'IN_PROGRESS');
              const best = t.attempts
                .filter((a) => a.score != null)
                .reduce((m, a) => Math.max(m, a.score!), 0);

              return (
                <div
                  key={t.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-2xl shadow-lg shadow-slate-950/40 flex flex-col justify-between transition"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="text-lg font-bold text-white">
                        {t.title}
                        {t.company && (
                          <span className="ml-2 text-[10px] align-middle bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-md font-bold">
                            {t.company.name}
                          </span>
                        )}
                      </h3>
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border shrink-0 ${
                          t.mode === 'PROCTORED'
                            ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                            : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                        }`}
                      >
                        {t.mode}
                      </span>
                    </div>

                    {t.description && (
                      <p className="text-xs text-slate-400 mb-3 leading-relaxed">{t.description}</p>
                    )}

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {t.sections.map((s, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-slate-800 border border-slate-700 text-indigo-300 px-2 py-0.5 rounded-md font-semibold"
                        >
                          {s.title}
                        </span>
                      ))}
                    </div>

                    <div className="text-xs text-slate-400 mb-5">
                      ⏱ {t.durationMinutes} min
                      {t.negativeMarking > 0 && <> · −{t.negativeMarking} per wrong answer</>}
                      {t.passScore != null && <> · pass ≥ {t.passScore}%</>}
                      {t.attempts.length > 0 && best > 0 && (
                        <span className="text-emerald-400 font-bold"> · Best {best}%</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onStart(t.id)}
                    className={`mt-auto font-black py-3 px-6 rounded-xl text-white transition active:scale-95 text-xs shadow-lg cursor-pointer ${
                      inProgress
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-900/40'
                        : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-900/40'
                    }`}
                  >
                    {inProgress ? '▶ Resume Attempt' : '🚀 Start Test'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </FullScreenShell>
  );
};
export default AssessmentList;
