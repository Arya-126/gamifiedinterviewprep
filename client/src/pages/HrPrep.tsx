import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

// HR & Behavioral prep bank. Category chips + company filter over GET /hr,
// expandable question cards showing STAR guidance + an answer skeleton
// (rendered with a tiny markdown-ish parser — bold + bullets, no deps),
// and a "Practice with AI" hook into the AI interviewer.

interface HrQuestion {
  id: string;
  question: string;
  category: string;
  starGuidance: string;
  sampleOutline: string | null;
  companyTags: string[];
  sortOrder: number;
}

interface HrCategory {
  category: string;
  count: number;
}

const COMPANIES: { slug: string; name: string }[] = [
  { slug: 'tcs', name: 'TCS' },
  { slug: 'infosys', name: 'Infosys' },
  { slug: 'wipro', name: 'Wipro' },
  { slug: 'accenture', name: 'Accenture' },
  { slug: 'cognizant', name: 'Cognizant' },
  { slug: 'capgemini', name: 'Capgemini' },
  { slug: 'amazon', name: 'Amazon' },
  { slug: 'microsoft', name: 'Microsoft' },
  { slug: 'deloitte', name: 'Deloitte' },
  { slug: 'zs-associates', name: 'ZS Associates' },
  { slug: 'goldman-sachs', name: 'Goldman Sachs' },
  { slug: 'jp-morgan', name: 'JP Morgan' },
  { slug: 'standard-chartered', name: 'Standard Chartered' },
];

const CATEGORY_EMOJI: Record<string, string> = {
  intro: '👋',
  strengths: '💪',
  weakness: '🌱',
  failure: '📉',
  conflict: '⚖️',
  teamwork: '🤝',
  leadership: '🧭',
  'why-us': '🏢',
  'career-goals': '🎯',
  pressure: '⏱️',
  situational: '🎭',
};

const prettify = (slug: string) =>
  slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const companyName = (slug: string) => COMPANIES.find((c) => c.slug === slug)?.name || prettify(slug);

// ---- tiny markdown-ish renderer: **bold** + "- " bullets, pre-wrap otherwise ----

const BoldText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold text-white">
            {p}
          </strong>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </>
  );
};

const Markdownish: React.FC<{ text: string }> = ({ text }) => (
  <div className="space-y-1.5">
    {text.split('\n').map((line, i) => {
      const t = line.trim();
      if (!t) return null;
      if (t.startsWith('- ')) {
        return (
          <div key={i} className="flex gap-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <span className="text-indigo-400 shrink-0 font-bold">•</span>
            <span>
              <BoldText text={t.slice(2)} />
            </span>
          </div>
        );
      }
      return (
        <p key={i} className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
          <BoldText text={t} />
        </p>
      );
    })}
  </div>
);

export interface HrPrepProps {
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onBack: () => void;
  onPracticeWithAI: (question: string) => void;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const HrPrep: React.FC<HrPrepProps> = ({
  user,
  onBack,
  onPracticeWithAI,
  onNavigate,
  onLogout,
}) => {
  const [categories, setCategories] = useState<HrCategory[]>([]);
  const [questions, setQuestions] = useState<HrQuestion[]>([]);
  const [category, setCategory] = useState<string>('');
  const [company, setCompany] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<HrCategory[]>('/hr/categories')
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (company) params.set('company', company);
    const qs = params.toString();
    apiClient
      .get<HrQuestion[]>(`/hr${qs ? `?${qs}` : ''}`)
      .then((qsList) => {
        setQuestions(qsList);
        setExpanded(null);
      })
      .catch((e) => setError(e?.message || 'Failed to load HR questions'))
      .finally(() => setLoading(false));
  }, [category, company]);

  const nav = onNavigate || (() => {});

  return (
    <FullScreenShell
      title="HR & Behavioral Prep"
      subtitle="STAR-method guidance, answer frameworks & mock roleplay"
      icon="🗣️"
      currentPage="hr-prep"
      user={user}
      onNavigate={nav}
      onBack={onBack}
      onLogout={onLogout}
    >
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* HERO HEADER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-slate-900/70 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black mb-3">
              <span>🗣️</span> STAR Framework Mastery
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              HR & Behavioral Question Bank
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
              Curated behavioral interview questions with structured STAR guidance and adaptable answer outlines. Master the art of communicating your impact clearly without memorizing rigid scripts.
            </p>
          </div>
        </div>

        {/* FILTERS CARD */}
        <div className="bg-slate-900/90 rounded-2xl shadow-lg shadow-slate-950/40 border border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory('')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                category === ''
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.category}
                onClick={() => setCategory(c.category === category ? '' : c.category)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  category === c.category
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                <span>{CATEGORY_EMOJI[c.category] || '💬'}</span>
                <span>{prettify(c.category)}</span>
                <span className={category === c.category ? 'text-indigo-200' : 'text-slate-400'}>
                  {c.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
            <label className="text-xs font-bold text-slate-400">🏢 Filter Company:</label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">All Companies</option>
              {COMPANIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            {company && (
              <span className="text-xs text-indigo-400">
                showing questions famously asked at {companyName(company)}
              </span>
            )}
          </div>
        </div>

        {/* QUESTIONS LIST */}
        {error ? (
          <div className="bg-rose-500/20 border border-rose-500/30 rounded-2xl p-6 text-center text-rose-300 font-bold text-sm">
            {error}
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            <p className="text-xs text-slate-400 font-bold">Loading behavioral questions…</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
            No questions match these filters. Try clearing the company filter.
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q) => {
              const open = expanded === q.id;
              return (
                <div
                  key={q.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg shadow-slate-950/40 overflow-hidden transition"
                >
                  <button
                    onClick={() => setExpanded(open ? null : q.id)}
                    className="w-full text-left p-5 hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-white text-sm sm:text-base">{q.question}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                            {CATEGORY_EMOJI[q.category] || '💬'} {prettify(q.category)}
                          </span>
                          {q.companyTags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold"
                            >
                              {companyName(tag)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-slate-400 font-black shrink-0 mt-1">{open ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {open && (
                    <div className="px-5 pb-5 border-t border-slate-800/80 pt-4 space-y-4">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
                          <span>📋</span> STAR Strategy & Guidance
                        </h3>
                        <Markdownish text={q.starGuidance} />
                      </div>

                      {q.sampleOutline && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                            <span>🧩</span> Sample Answer Skeleton
                          </h3>
                          <Markdownish text={q.sampleOutline} />
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          onClick={() => onPracticeWithAI(q.question)}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-900/40 active:scale-95 cursor-pointer flex items-center gap-2"
                        >
                          <span>🤖</span> Practice with AI Interviewer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
export default HrPrep;
