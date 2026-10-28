import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface PerQuestion {
  questionId: string;
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  conceptTag: string;
  subject: string;
}
interface WeakConcept {
  concept: string;
  subject: string;
  missCount: number;
  missedQuestionIds: string[];
}
interface StrongConcept {
  concept: string;
  subject: string;
  correctCount: number;
}
interface Report {
  id: string;
  sourceType: string;
  sourceId: string;
  overallScore: number;
  perQuestion: PerQuestion[];
  weakConcepts: WeakConcept[];
  strongConcepts: StrongConcept[];
  createdAt: string;
}

interface Synopsis {
  subject: string;
  concept: string;
  synopsis: string;
  bulletKeys: string[];
  commonMistakes: string | null;
  recommendedGames: { gameType: string; reason: string }[];
}

const SOURCE_LABEL: Record<string, string> = {
  'aptitude-quiz': '🧮 Aptitude Quiz',
  'core-cs-quiz': '🖥️ Core CS Quiz',
  'ai-interview': '🤖 AI Interview',
  'coding-round': '⚡ Coding Round',
};

const ConceptCard: React.FC<{
  weak: WeakConcept;
  onPractice: () => void;
  onReadTheory?: () => void;
}> = ({ weak, onPractice, onReadTheory }) => {
  const [syn, setSyn] = useState<Synopsis | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<Synopsis>(`/reports/synopsis/${encodeURIComponent(weak.subject)}/${encodeURIComponent(weak.concept)}`)
      .then((s) => {
        if (!cancelled) setSyn(s);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [weak.subject, weak.concept]);

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-amber-500/30 shadow-lg p-5 mb-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">
            {weak.subject} · {weak.missCount} miss{weak.missCount > 1 ? 'es' : ''}
          </div>
          <h3 className="text-lg font-black text-white">{weak.concept}</h3>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse text-xs text-slate-500">Loading synopsis…</div>
      ) : syn ? (
        <>
          {syn.bulletKeys.length > 0 && (
            <ul className="space-y-1.5 mb-3">
              {syn.bulletKeys.map((b, i) => (
                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-emerald-400 font-bold mt-0.5">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {expanded && (
            <p className="text-sm text-slate-300 leading-relaxed mb-3 whitespace-pre-wrap bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              {syn.synopsis}
            </p>
          )}
          {!expanded && syn.synopsis && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline mb-3 block"
            >
              Read full synopsis →
            </button>
          )}
          {syn.commonMistakes && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 mb-3">
              <b className="font-black">⚠ Common mistake:</b> {syn.commonMistakes}
            </div>
          )}
        </>
      ) : (
        <div className="text-xs text-slate-500 italic mb-3">
          (Synopsis will appear here once generated.)
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
        <button
          onClick={onPractice}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition"
        >
          ▶ Practice this
        </button>
        {onReadTheory && (
          <button
            onClick={onReadTheory}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition"
          >
            📖 Read theory
          </button>
        )}
        {syn?.recommendedGames?.slice(0, 2).map((g) => (
          <span
            key={g.gameType}
            className="px-2.5 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[11px] font-bold"
            title={g.reason}
          >
            🎮 {g.gameType.replace(/_/g, ' ').toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
};

const QuestionReview: React.FC<{ q: PerQuestion }> = ({ q }) => {
  const [expanded, setExpanded] = useState(false);
  const containerStyle = q.isCorrect
    ? 'bg-emerald-950/20 border-emerald-500/30'
    : 'bg-rose-950/20 border-rose-500/30';

  return (
    <div className={`rounded-2xl border p-4 mb-2.5 transition-all ${containerStyle}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-start justify-between gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            {q.isCorrect ? (
              <span className="text-emerald-400 font-bold">✓ Correct</span>
            ) : (
              <span className="text-rose-400 font-bold">✗ Wrong</span>
            )}{' '}
            · {q.conceptTag}
          </div>
          <div className="text-sm font-semibold text-white truncate">{q.prompt}</div>
        </div>
        <span className="text-xs text-slate-400 mt-1">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="mt-3.5 space-y-2 text-xs border-t border-slate-800/80 pt-3">
          <div>
            <span className="font-bold text-slate-400">Your answer: </span>
            <span className={q.isCorrect ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {q.userAnswer}
            </span>
          </div>
          {!q.isCorrect && (
            <div>
              <span className="font-bold text-slate-400">Correct answer: </span>
              <span className="text-emerald-400 font-semibold">{q.correctAnswer}</span>
            </div>
          )}
          {q.explanation && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-slate-300 mt-2">
              <b className="text-indigo-400">Why:</b> {q.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface TestReportProps {
  reportId: string;
  onBack: () => void;
  onNavigate: (page: string, ctx?: Record<string, string>) => void;
  user?: any;
  onLogout?: () => void;
}

export const TestReport: React.FC<TestReportProps> = ({
  reportId,
  onBack,
  onNavigate,
  user,
  onLogout,
}) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [inject, setInject] = useState<{ busy: boolean; result: string | null }>({
    busy: false,
    result: null,
  });

  const injectIntoPipeline = async () => {
    setInject({ busy: true, result: null });
    try {
      const res = await apiClient.post<{ added: number; skipped: number }>(
        `/pipeline/current/inject-from-report/${reportId}`,
        {},
      );
      const parts: string[] = [];
      if (res.added > 0) parts.push(`Added ${res.added} stage${res.added > 1 ? 's' : ''} to your pipeline.`);
      if (res.skipped > 0) parts.push(`${res.skipped} already covered.`);
      if (parts.length === 0) parts.push('No new stages needed — everything is already on your pipeline.');
      setInject({ busy: false, result: parts.join(' ') });
    } catch (e: any) {
      const msg = e?.message || 'Failed';
      if (msg.toLowerCase().includes('no active pipeline')) {
        setInject({ busy: false, result: 'No active pipeline yet — go to My Pipeline to generate one first.' });
      } else {
        setInject({ busy: false, result: msg });
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<Report>(`/reports/${reportId}`)
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load report.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  return (
    <FullScreenShell
      title="Test Report"
      subtitle="Performance breakdown & targeted improvement path"
      currentPage="test-report"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {loading ? (
          <div className="text-center py-20 text-slate-500 animate-pulse font-medium">
            Loading comprehensive report…
          </div>
        ) : error || !report ? (
          <div className="max-w-lg mx-auto py-10 text-center">
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-6 rounded-2xl mb-4">
              {error || 'Report unavailable.'}
            </div>
            <button
              onClick={onBack}
              className="text-sm font-bold text-indigo-400 hover:text-indigo-300"
            >
              ← Back
            </button>
          </div>
        ) : (
          (() => {
            const pct = Math.round(report.overallScore);
            const scoreColor =
              pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-rose-400';
            const misses = report.perQuestion.filter((q) => !q.isCorrect);
            const visibleQs = showAll ? report.perQuestion : misses;

            return (
              <>
                {/* Header score card */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">
                      {SOURCE_LABEL[report.sourceType] || report.sourceType}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white">Performance Report</h1>
                    <div className="text-xs text-slate-400 mt-1">
                      {new Date(report.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 bg-slate-950/80 px-6 py-4 rounded-2xl border border-slate-800 self-end sm:self-auto">
                    <div className={`text-4xl sm:text-5xl font-black ${scoreColor}`}>{pct}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">/ 100</div>
                  </div>
                </div>

                {/* Weak concepts */}
                {report.weakConcepts.length > 0 && (
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                      <span>⚠ Focus Areas ({report.weakConcepts.length})</span>
                    </div>
                    {report.weakConcepts.map((w) => (
                      <ConceptCard
                        key={`${w.subject}::${w.concept}`}
                        weak={w}
                        onPractice={() => {
                          const target =
                            w.subject === 'CN' || w.subject === 'OS' || w.subject === 'DBMS' || w.subject === 'SQL'
                              ? 'core-cs-hub'
                              : w.subject === 'HR'
                              ? 'hr-prep'
                              : w.subject === 'DSA'
                              ? 'coding-tracks'
                              : 'interview-hub';
                          onNavigate(target, { subject: w.subject });
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Add weak concepts to pipeline */}
                {report.weakConcepts.length > 0 && (
                  <div className="bg-gradient-to-r from-indigo-950/40 to-violet-950/40 border border-indigo-500/30 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">🎯</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-lg text-white mb-1">Push into Your Pipeline</div>
                        <div className="text-xs text-slate-300 mb-4 leading-relaxed">
                          Add one stage per weak concept directly to your active learning pipeline. Each stage reinforces the concept through tailored practice and tests.
                        </div>
                        {inject.result && (
                          <div className="bg-indigo-950/60 border border-indigo-500/30 rounded-xl p-3 text-xs font-bold text-indigo-300 mb-4">
                            {inject.result}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={injectIntoPipeline}
                            disabled={inject.busy}
                            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-md shadow-indigo-500/25 disabled:opacity-50 transition"
                          >
                            {inject.busy ? 'Adding…' : `➕ Add ${report.weakConcepts.length} to pipeline`}
                          </button>
                          <button
                            onClick={() => onNavigate('pipeline')}
                            className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:text-white transition"
                          >
                            Open pipeline →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Strengths */}
                {report.strongConcepts.length > 0 && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
                    <div className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-3">
                      💪 Strengths ({report.strongConcepts.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {report.strongConcepts.map((s) => (
                        <span
                          key={`${s.subject}::${s.concept}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold"
                        >
                          {s.concept}
                          <span className="opacity-60 text-[10px]">× {s.correctCount}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-question review */}
                {report.perQuestion.length > 0 && (
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Question Review
                      </div>
                      <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline"
                      >
                        {showAll ? 'Hide correct answers' : `Show all ${report.perQuestion.length} questions`}
                      </button>
                    </div>
                    {visibleQs.length === 0 ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm text-emerald-300 text-center font-bold">
                        🎉 Perfect run — no mistakes to review.
                      </div>
                    ) : (
                      visibleQs.map((q) => <QuestionReview key={q.questionId} q={q} />)
                    )}
                  </div>
                )}

                <button
                  onClick={onBack}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition shadow-lg"
                >
                  ← Return to Dashboard
                </button>
              </>
            );
          })()
        )}
      </div>
    </FullScreenShell>
  );
};
