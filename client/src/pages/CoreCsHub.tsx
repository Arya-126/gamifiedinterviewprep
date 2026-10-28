import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface CoreQuestion {
  id: string;
  subject: string;
  question: string;
  options: string[];
  explanation: string;
  difficulty: string;
}

interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  xpEarned: number;
  details: {
    questionId: string;
    isCorrect: boolean;
    correctIndex: number;
    explanation: string;
  }[];
}

const SUBJECT_INFO: Record<string, { title: string; icon: string; bg: string; border: string; desc: string }> = {
  CN: {
    title: 'Computer Networks',
    icon: '🌐',
    bg: 'from-blue-600/40 via-cyan-600/30 to-slate-900',
    border: 'border-blue-500/30',
    desc: 'OSI layers, TCP/IP, IP addressing, DNS, HTTP, socket programming & routing protocols.',
  },
  OS: {
    title: 'Operating Systems',
    icon: '💻',
    bg: 'from-purple-600/40 via-indigo-600/30 to-slate-900',
    border: 'border-purple-500/30',
    desc: 'Process management, threads, CPU scheduling, deadlocks, virtual memory & paging.',
  },
  DBMS: {
    title: 'Database Systems (DBMS)',
    icon: '🗄️',
    bg: 'from-emerald-600/40 via-teal-600/30 to-slate-900',
    border: 'border-emerald-500/30',
    desc: 'ER diagrams, Relational Algebra, Normalization (1NF to BCNF), Transactions & ACID.',
  },
  SQL: {
    title: 'SQL & Queries',
    icon: '⚡',
    bg: 'from-amber-600/40 via-orange-600/30 to-slate-900',
    border: 'border-amber-500/30',
    desc: 'JOINs, GROUP BY, Aggregate functions, Subqueries, Indexing, Triggers & Views.',
  },
};

export interface CoreCsHubProps {
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const CoreCsHub: React.FC<CoreCsHubProps> = ({
  user,
  onBack,
  onNavigate,
  onLogout,
}) => {
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Active Quiz State
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [questions, setQuestions] = useState<CoreQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    apiClient
      .get<{ subjects: Record<string, number> }>('/core-subjects/summary')
      .then((res) => setSummary(res.subjects || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const nav = onNavigate || (() => {});

  const startQuiz = async (subject: string) => {
    setActiveSubject(subject);
    setQuizLoading(true);
    setUserAnswers({});
    setQuizResult(null);
    try {
      const res = await apiClient.get<{ subject: string; questions: CoreQuestion[] }>(
        `/core-subjects/${subject}/quiz`
      );
      setQuestions(res.questions);
    } catch {
      alert('Failed to load quiz questions');
      setActiveSubject(null);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (quizResult) return; // frozen after submission
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const submitQuiz = async () => {
    if (!activeSubject || !questions.length) return;
    const payload = questions.map((q) => ({
      questionId: q.id,
      selectedIndex: userAnswers[q.id] ?? -1,
    }));

    try {
      const res = await apiClient.post<QuizResult>('/core-subjects/submit-quiz', { answers: payload });
      setQuizResult(res);
    } catch {
      alert('Failed to submit quiz');
    }
  };

  return (
    <FullScreenShell
      title="Core CS Subject Drills"
      subtitle="OS, Computer Networks, DBMS & SQL speed drills for tech rounds"
      icon="📚"
      currentPage="core-cs-hub"
      user={user}
      onNavigate={nav}
      onBack={onBack}
      onLogout={onLogout}
    >
      <div className="flex flex-col gap-6">
        {/* HERO BANNER */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-slate-900/70 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black mb-3">
              <span>📚</span> Computer Science Fundamentals
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Core CS Drill & Theory Hub
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
              Master fundamental Computer Science subjects for placement written rounds and technical interviews. Practice 10-question timed drills with immediate step-by-step explanations.
            </p>
          </div>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            <p className="text-xs text-slate-400 font-bold">Loading subject modules…</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {Object.entries(SUBJECT_INFO).map(([code, info]) => (
              <div
                key={code}
                className="bg-slate-900/90 rounded-2xl shadow-lg shadow-slate-950/40 overflow-hidden border border-slate-800 hover:border-indigo-500/50 flex flex-col justify-between hover:-translate-y-1 transition group"
              >
                <div className={`p-6 bg-gradient-to-r ${info.bg} border-b border-slate-800/80`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-3xl group-hover:scale-110 transition-transform">{info.icon}</span>
                    <span className="bg-slate-900/80 text-indigo-300 border border-indigo-500/30 font-black text-xs px-3 py-1 rounded-full uppercase">
                      {summary[code] || 0} Questions
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white group-hover:text-indigo-300 transition">
                    {info.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{info.desc}</p>
                </div>

                <div className="p-5 bg-slate-900 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">10-Question Drill Session</span>
                  <button
                    onClick={() => startQuiz(code)}
                    className="px-5 py-2.5 rounded-xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-900/40 active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>⚡</span> Start Practice Drill
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quiz Modal */}
        {activeSubject && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full p-6 my-8 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-black uppercase text-indigo-400">
                    {SUBJECT_INFO[activeSubject]?.title} Drill
                  </span>
                  <h2 className="text-xl font-black text-white">Practice Quiz ({questions.length} Questions)</h2>
                </div>
                <button
                  onClick={() => setActiveSubject(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black text-sm transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-6">
                {quizLoading ? (
                  <div className="text-center py-12 text-slate-400">Fetching drill questions…</div>
                ) : (
                  questions.map((q, qIdx) => {
                    const userSel = userAnswers[q.id];
                    const detail = quizResult?.details.find((d) => d.questionId === q.id);

                    return (
                      <div key={q.id} className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-black text-xs text-slate-400 uppercase">
                            Question {qIdx + 1} / {questions.length}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                            {q.difficulty}
                          </span>
                        </div>
                        <p className="font-bold text-white text-sm mb-4 leading-relaxed">{q.question}</p>

                        <div className="space-y-2 mb-3">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = userSel === optIdx;
                            let btnStyle =
                              'bg-slate-900/80 border-slate-700/80 text-slate-200 hover:bg-slate-700 hover:border-slate-600';

                            if (quizResult && detail) {
                              if (optIdx === detail.correctIndex) {
                                btnStyle = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold';
                              } else if (isSelected && !detail.isCorrect) {
                                btnStyle = 'bg-rose-500/20 border-rose-500/60 text-rose-300 font-bold';
                              }
                            } else if (isSelected) {
                              btnStyle = 'bg-indigo-600 border-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/50';
                            }

                            return (
                              <button
                                key={optIdx}
                                onClick={() => handleSelectOption(q.id, optIdx)}
                                className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center gap-3 cursor-pointer ${btnStyle}`}
                              >
                                <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="flex-1">{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {quizResult && detail && (
                          <div className="mt-3 p-3.5 bg-slate-900/90 rounded-xl border border-slate-700/80 text-xs text-slate-300">
                            <b className={detail.isCorrect ? 'text-emerald-400' : 'text-rose-400'}>
                              {detail.isCorrect ? '✓ Correct!' : '✕ Incorrect.'}
                            </b>{' '}
                            {detail.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                {quizResult ? (
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-black text-indigo-400">
                      {quizResult.percentage}%
                    </div>
                    <div className="text-xs text-slate-400">
                      {quizResult.score} of {quizResult.total} correct (+{quizResult.xpEarned} XP)
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 font-semibold">
                    {Object.keys(userAnswers).length} of {questions.length} answered
                  </div>
                )}

                {quizResult ? (
                  <button
                    onClick={() => setActiveSubject(null)}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs transition cursor-pointer"
                  >
                    Done
                  </button>
                ) : (
                  <button
                    onClick={submitQuiz}
                    disabled={Object.keys(userAnswers).length === 0}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black rounded-xl text-xs disabled:opacity-40 transition cursor-pointer"
                  >
                    Submit Drill
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
export default CoreCsHub;
