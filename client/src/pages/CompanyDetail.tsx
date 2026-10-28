import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { CompanyPrep } from './CompanyPrep';
import { FullScreenShell } from '../components/FullScreenShell';

// Tabbed CompanyDetail — one place for the four company-scoped things a
// student needs before an interview. The Overview tab reuses the CompanyPrep
// component (readiness + pattern-mock CTAs); Coding / Technical / HR are
// backed by /companies/:slug/detail.

interface CodingItem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  track: string | null;
  level: number;
  topic: { name: string; slug: string };
  solved: boolean;
  bestScore: number | null;
}

interface TechnicalQuestion {
  id: string;
  category: string;
  subject: string | null;
  question: string;
  answerHint: string | null;
  difficulty: string;
  tags: string[];
}

interface HrQuestion {
  id: string;
  question: string;
  category: string;
  starGuidance: string;
  sampleOutline: string | null;
  companyTags: string[];
}

interface Detail {
  company: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    notes: string | null;
  };
  technical: {
    total: number;
    bySubject: Record<string, TechnicalQuestion[]>;
  };
  coding: CodingItem[];
  hr: HrQuestion[];
}

type Tab = 'overview' | 'coding' | 'technical' | 'hr';

const SUBJECT_META: Record<string, { icon: string; label: string; color: string }> = {
  OOPS: { icon: '🧱', label: 'OOP', color: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' },
  OS: { icon: '🖥️', label: 'Operating Systems', color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
  DBMS: { icon: '🗄️', label: 'DBMS & SQL', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  CN: { icon: '🌐', label: 'Computer Networks', color: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' },
  DSA: { icon: '📊', label: 'Data Structures & Algorithms', color: 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30' },
  SYSTEM_DESIGN: { icon: '🏗️', label: 'System Design', color: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' },
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-emerald-400',
  medium: 'text-amber-400',
  hard: 'text-rose-400',
  EASY: 'text-emerald-400',
  MEDIUM: 'text-amber-400',
  HARD: 'text-rose-400',
};

// Tiny markdown-ish renderer: **bold**, `code`, newlines → <br>, and single-line bullets.
const renderMarkdown = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const isBullet = /^\s*[-*]\s+/.test(line);
    const body = isBullet ? line.replace(/^\s*[-*]\s+/, '') : line;
    const parts: React.ReactNode[] = [];
    let remaining = body;
    let key = 0;
    while (remaining.length) {
      const boldM = remaining.match(/\*\*(.+?)\*\*/);
      const codeM = remaining.match(/`([^`]+)`/);
      const m = boldM && (!codeM || boldM.index! <= codeM.index!) ? boldM : codeM;
      if (!m) {
        parts.push(remaining);
        break;
      }
      if (m.index! > 0) {
        parts.push(remaining.slice(0, m.index!));
      }
      if (m[0].startsWith('**')) {
        parts.push(
          <strong key={key++} className="font-bold text-white">
            {m[1]}
          </strong>
        );
      } else {
        parts.push(
          <code key={key++} className="bg-slate-800 text-indigo-300 px-1 py-0.5 rounded text-[11px] font-mono">
            {m[1]}
          </code>
        );
      }
      remaining = remaining.slice(m.index! + m[0].length);
    }
    if (isBullet) {
      return (
        <div key={i} className="flex gap-2 text-xs text-slate-300 my-0.5">
          <span className="text-indigo-400 font-bold">•</span>
          <span>{parts}</span>
        </div>
      );
    }
    return (
      <p key={i} className="text-xs text-slate-300 my-1 leading-relaxed">
        {parts}
      </p>
    );
  });
};

export interface CompanyDetailProps {
  slug: string;
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onBack: () => void;
  onStartTest: (testId: string) => void;
  onStartInterview: (role: string, companyId: string) => void;
  onOpenProblem: (problemSlug: string) => void;
  onPracticeHr: (question: HrQuestion, companySlug: string) => void;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const CompanyDetail: React.FC<CompanyDetailProps> = ({
  slug,
  user,
  onBack,
  onStartTest,
  onStartInterview,
  onOpenProblem,
  onPracticeHr,
  onNavigate,
  onLogout,
}) => {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  const [techSubjectFilter, setTechSubjectFilter] = useState<string | null>(null);
  const [hrCategoryFilter, setHrCategoryFilter] = useState<string | null>(null);
  const [expandedTechnical, setExpandedTechnical] = useState<Set<string>>(new Set());
  const [expandedHr, setExpandedHr] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiClient
      .get<Detail>(`/companies/${slug}/detail`)
      .then(setDetail)
      .catch((e) => setError(e?.message || 'Failed to load company detail'))
      .finally(() => setLoading(false));
  }, [slug]);

  const nav = onNavigate || (() => {});

  if (loading) {
    return (
      <FullScreenShell
        title="Loading Company…"
        subtitle="Hiring workflow and question bank"
        icon="🏢"
        currentPage="company-prep"
        user={user}
        onNavigate={nav}
        onBack={onBack}
        onLogout={onLogout}
      >
        <div className="flex flex-col items-center justify-center p-16 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          <p className="text-xs text-slate-400 font-bold">Loading company profile & questions…</p>
        </div>
      </FullScreenShell>
    );
  }

  if (error || !detail) {
    return (
      <FullScreenShell
        title="Company Not Found"
        subtitle="Target company workspace"
        icon="🏢"
        currentPage="company-prep"
        user={user}
        onNavigate={nav}
        onBack={onBack}
        onLogout={onLogout}
      >
        <div className="max-w-xl mx-auto text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl my-8">
          <p className="text-rose-400 font-bold mb-4">{error || 'Company not found'}</p>
          <button
            onClick={onBack}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
          >
            ← Back to Companies
          </button>
        </div>
      </FullScreenShell>
    );
  }

  const subjects = Object.keys(detail.technical.bySubject);
  const visibleTechnical = techSubjectFilter
    ? { [techSubjectFilter]: detail.technical.bySubject[techSubjectFilter] || [] }
    : detail.technical.bySubject;

  const hrCategories = Array.from(new Set(detail.hr.map((q) => q.category)));
  const visibleHr = hrCategoryFilter
    ? detail.hr.filter((q) => q.category === hrCategoryFilter)
    : detail.hr;

  const toggleTech = (id: string) => {
    const next = new Set(expandedTechnical);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedTechnical(next);
  };
  const toggleHr = (id: string) => {
    const next = new Set(expandedHr);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedHr(next);
  };

  const tabButton = (id: Tab, label: string, badge?: number | string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className={`px-4 py-2 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
        tab === id
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
          : 'text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-850'
      }`}
    >
      <span>{label}</span>
      {badge != null && (
        <span
          className={`ml-1 text-[10px] font-black px-1.5 py-0.2 rounded-full ${
            tab === id ? 'bg-indigo-800/80 text-indigo-200' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <FullScreenShell
      title={detail.company.name}
      subtitle="Recruitment pattern, technical question bank & mock drills"
      icon="🏢"
      currentPage="company-prep"
      user={user}
      onNavigate={nav}
      onBack={onBack}
      onLogout={onLogout}
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* TABS SELECTOR */}
        <div className="flex gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-lg shadow-slate-950/40 overflow-x-auto scrollbar-none">
          {tabButton('overview', '📊 Overview & Readiness')}
          {tabButton('coding', '💻 Coding Questions', detail.coding.length)}
          {tabButton('technical', '🧠 Technical Round', detail.technical.total)}
          {tabButton('hr', '🤝 HR Behavioral', detail.hr.length)}
        </div>

        {tab === 'overview' && (
          <CompanyPrep
            slug={slug}
            onBack={onBack}
            onStartTest={onStartTest}
            onStartInterview={onStartInterview}
          />
        )}

        {tab === 'coding' && (
          <div className="space-y-4">
            {detail.coding.length === 0 ? (
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow p-8 text-center text-slate-400 text-xs">
                No coding problems are currently tagged specifically for {detail.company.name}. Try the general{' '}
                <span className="font-bold text-indigo-400">Coding Tracks</span> in the navigation drawer.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {detail.coding.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onOpenProblem(p.slug)}
                    className="text-left bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl shadow-lg shadow-slate-950/40 p-5 hover:-translate-y-0.5 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white group-hover:text-indigo-300 transition text-sm">
                        {p.title}
                      </span>
                      {p.solved ? (
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          ✓ Solved{p.bestScore != null ? ` · ${Math.round(p.bestScore)}%` : ''}
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            DIFFICULTY_COLOR[p.difficulty] || 'text-slate-400'
                          }`}
                        >
                          {p.difficulty}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {p.topic.name} · Level {p.level}
                      {p.track && p.track !== p.topic.slug ? ` · track: ${p.track}` : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'technical' && (
          <div className="space-y-4">
            {detail.technical.total === 0 ? (
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow p-8 text-center text-slate-400 text-xs">
                No technical questions authored for {detail.company.name} yet.
              </div>
            ) : (
              <>
                {subjects.length > 1 && (
                  <div className="flex gap-2 flex-wrap mb-4">
                    <button
                      onClick={() => setTechSubjectFilter(null)}
                      className={`text-xs font-bold px-3 py-1 rounded-xl transition cursor-pointer ${
                        techSubjectFilter === null
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                          : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      All ({detail.technical.total})
                    </button>
                    {subjects.map((s) => {
                      const meta = SUBJECT_META[s] || { icon: '📌', label: s, color: 'bg-slate-800 text-slate-300' };
                      return (
                        <button
                          key={s}
                          onClick={() => setTechSubjectFilter(s)}
                          className={`text-xs font-bold px-3 py-1 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                            techSubjectFilter === s
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                              : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span>{meta.icon}</span> <span>{meta.label}</span> ({detail.technical.bySubject[s].length})
                        </button>
                      );
                    })}
                  </div>
                )}

                {Object.entries(visibleTechnical).map(([subject, questions]) => {
                  const meta = SUBJECT_META[subject] || { icon: '📌', label: subject, color: 'bg-slate-800 text-slate-300' };
                  return (
                    <div key={subject} className="mb-6">
                      <div className="mb-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full ${meta.color}`}>
                          <span>{meta.icon}</span> {meta.label}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {questions.map((q) => {
                          const open = expandedTechnical.has(q.id);
                          return (
                            <div
                              key={q.id}
                              className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg shadow-slate-950/40 overflow-hidden"
                            >
                              <button
                                onClick={() => toggleTech(q.id)}
                                className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-slate-800/40 transition cursor-pointer"
                              >
                                <span className="mt-0.5 text-indigo-400 font-black text-sm">{open ? '▾' : '▸'}</span>
                                <div className="flex-1">
                                  <div className="font-semibold text-white text-sm leading-relaxed">{q.question}</div>
                                  <div className="mt-1.5 flex gap-2 items-center text-[10px]">
                                    <span className={`font-bold uppercase ${DIFFICULTY_COLOR[q.difficulty] || 'text-slate-400'}`}>
                                      {q.difficulty}
                                    </span>
                                    {q.tags.slice(0, 3).map((t) => (
                                      <span key={t} className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.2 rounded-md">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </button>
                              {open && q.answerHint && (
                                <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 text-xs text-slate-300 leading-relaxed bg-slate-950/40">
                                  <div className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-2">
                                    💡 Key Talking Points
                                  </div>
                                  {renderMarkdown(q.answerHint)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {tab === 'hr' && (
          <div className="space-y-4">
            {detail.hr.length === 0 ? (
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow p-8 text-center text-slate-400 text-xs">
                No HR prompts tagged for {detail.company.name}. Browse the general{' '}
                <span className="font-bold text-indigo-400">HR Prep</span> bank in the drawer.
              </div>
            ) : (
              <>
                {hrCategories.length > 1 && (
                  <div className="flex gap-2 flex-wrap mb-4">
                    <button
                      onClick={() => setHrCategoryFilter(null)}
                      className={`text-xs font-bold px-3 py-1 rounded-xl transition cursor-pointer ${
                        hrCategoryFilter === null
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                          : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      All ({detail.hr.length})
                    </button>
                    {hrCategories.map((c) => (
                      <button
                        key={c}
                        onClick={() => setHrCategoryFilter(c)}
                        className={`text-xs font-bold px-3 py-1 rounded-xl transition cursor-pointer ${
                          hrCategoryFilter === c
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                            : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {c} ({detail.hr.filter((h) => h.category === c).length})
                      </button>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  {visibleHr.map((q) => {
                    const open = expandedHr.has(q.id);
                    return (
                      <div
                        key={q.id}
                        className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg shadow-slate-950/40 overflow-hidden"
                      >
                        <button
                          onClick={() => toggleHr(q.id)}
                          className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-slate-800/40 transition cursor-pointer"
                        >
                          <span className="mt-0.5 text-indigo-400 font-black text-sm">{open ? '▾' : '▸'}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-white text-sm leading-relaxed">{q.question}</div>
                            <div className="mt-1 text-[10px] text-indigo-400 uppercase font-bold tracking-wider">
                              {q.category}
                            </div>
                          </div>
                        </button>
                        {open && (
                          <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-4 bg-slate-950/40">
                            <div>
                              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-1.5">
                                STAR Guidance
                              </div>
                              {renderMarkdown(q.starGuidance)}
                            </div>
                            {q.sampleOutline && (
                              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5">
                                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-1.5">
                                  Answer Outline
                                </div>
                                {renderMarkdown(q.sampleOutline)}
                              </div>
                            )}
                            <button
                              onClick={() => onPracticeHr(q, detail.company.slug)}
                              className="text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-md shadow-emerald-900/40 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                            >
                              <span>🎤</span> Practice with AI
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
export default CompanyDetail;
