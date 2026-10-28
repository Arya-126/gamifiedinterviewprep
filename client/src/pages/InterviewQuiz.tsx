import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { useQuizIntegrity } from '../hooks/useQuizIntegrity';
import { FullScreenShell } from '../components/FullScreenShell';

type IntegritySignal = 'CLEAN' | 'LOW' | 'MEDIUM' | 'HIGH';

interface IntegrityResult {
  counts: { TAB_BLUR: number; COPY: number; PASTE: number; CONTEXT_MENU: number };
  hiddenMs: number;
  signal: IntegritySignal;
  score: number;
}

const SIGNAL_STYLES: Record<IntegritySignal, { label: string; cls: string }> = {
  CLEAN: { label: 'Clean session', cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' },
  LOW: { label: 'Low activity', cls: 'bg-amber-500/15 border-amber-500/30 text-amber-300' },
  MEDIUM: { label: 'Some activity', cls: 'bg-orange-500/15 border-orange-500/30 text-orange-300' },
  HIGH: { label: 'High activity', cls: 'bg-rose-500/15 border-rose-500/30 text-rose-300' },
};

interface Question {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string | null;
  difficulty: string;
}

interface QuizResult {
  questionId: string;
  isCorrect: boolean;
  correctIndex: number;
  correctAnswer: string;
  hintUsed?: boolean;
}

interface QuizSubmissionResponse {
  score: number;
  maxScore: number;
  percentage: number;
  xpEarned: number;
  results: QuizResult[];
  integrity: IntegrityResult | null;
}

export interface InterviewQuizProps {
  topicId: string;
  topicName: string;
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onComplete: () => void;
  onReviewTheory: () => void;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const InterviewQuiz: React.FC<InterviewQuizProps> = ({
  topicId,
  topicName,
  user,
  onComplete,
  onReviewTheory,
  onNavigate,
  onLogout,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [hintsUsed, setHintsUsed] = useState<Record<string, boolean>>({});
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);

  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<Record<string, boolean>>({});

  const [submission, setSubmission] = useState<QuizSubmissionResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nav = onNavigate || (() => {});

  // Lightweight, transparent integrity monitor — active only while taking the quiz.
  const integrityActive = !loading && !submission && !error && questions.length > 0;
  const { warning: integrityWarning, getPayload: getIntegrityPayload, totalEvents } =
    useQuizIntegrity(integrityActive);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const data = await apiClient.get<Question[]>(`/interview/topics/${topicId}/questions?count=10`);
        setQuestions(data);
      } catch (e) {
        setError('Failed to load questions.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [topicId]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleNext = () => {
    setActiveHint(null);
    setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
  };

  const handlePrev = () => {
    setActiveHint(null);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleShowHint = async (questionId: string) => {
    if (activeHint) return;
    setLoadingHint(true);
    try {
      const data = await apiClient.get<{ hint: string }>(`/interview/questions/${questionId}/hint`);
      setActiveHint(data.hint);
      setHintsUsed((prev) => ({ ...prev, [questionId]: true }));
    } catch (e) {
      alert('Failed to load hint');
    } finally {
      setLoadingHint(false);
    }
  };

  const handleShowExplanation = async (questionId: string) => {
    setLoadingExplanation((prev) => ({ ...prev, [questionId]: true }));
    try {
      const data = await apiClient.get<{ explanation: string }>(
        `/interview/questions/${questionId}/explanation`
      );
      setExplanations((prev) => ({ ...prev, [questionId]: data.explanation }));
    } catch (e) {
      alert('Failed to load explanation');
    } finally {
      setLoadingExplanation((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formattedAnswers = Object.entries(selectedAnswers).map(([qId, optIdx]) => ({
        questionId: qId,
        chosenIndex: optIdx,
        hintUsed: !!hintsUsed[qId],
      }));

      const integrity = getIntegrityPayload();

      const response = await apiClient.post<QuizSubmissionResponse>('/interview/submit', {
        topicId,
        answers: formattedAnswers,
        integrity,
      });

      setSubmission(response);
    } catch (e) {
      setError('Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <FullScreenShell
        title={`${topicName} Quiz`}
        subtitle="Practice Questions"
        icon="🎮"
        currentPage="interview-quiz"
        user={user}
        onNavigate={nav}
        onBack={onComplete}
        onLogout={onLogout}
      >
        <div className="flex flex-col items-center justify-center p-16 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          <p className="text-xs text-slate-400 font-bold">Loading quiz session…</p>
        </div>
      </FullScreenShell>
    );
  }

  if (error || questions.length === 0) {
    return (
      <FullScreenShell
        title={`${topicName} Quiz`}
        subtitle="Practice Questions"
        icon="🎮"
        currentPage="interview-quiz"
        user={user}
        onNavigate={nav}
        onBack={onComplete}
        onLogout={onLogout}
      >
        <div className="max-w-xl mx-auto text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl my-8">
          <p className="text-rose-400 font-bold mb-4">{error || 'No questions found for this topic.'}</p>
          <button
            onClick={onComplete}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
          >
            ← Return to Hub
          </button>
        </div>
      </FullScreenShell>
    );
  }

  // Scorecard View
  if (submission) {
    return (
      <FullScreenShell
        title="Quiz Completed!"
        subtitle={`Topic: ${topicName} · Performance Summary`}
        icon="🏆"
        currentPage="interview-quiz"
        user={user}
        onNavigate={nav}
        onBack={onComplete}
        onLogout={onLogout}
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          <div className="bg-slate-900/90 rounded-3xl shadow-xl shadow-slate-950/50 border border-slate-800 p-8 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">Drill Session Complete!</h2>
            <p className="text-slate-400 text-xs sm:text-sm mb-6">Topic: {topicName}</p>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
              <div className="bg-indigo-500/15 border border-indigo-500/30 rounded-2xl p-4">
                <p className="text-xs text-indigo-300 font-bold uppercase mb-1">Accuracy Score</p>
                <p className="text-3xl font-black text-white">{Math.round(submission.percentage)}%</p>
                <p className="text-xs text-indigo-300 mt-1">
                  {submission.score} / {submission.maxScore} correct
                </p>
              </div>
              <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-4">
                <p className="text-xs text-emerald-300 font-bold uppercase mb-1">XP Earned</p>
                <p className="text-3xl font-black text-emerald-400">+{submission.xpEarned}</p>
                <p className="text-xs text-emerald-300 mt-1">Added to profile</p>
              </div>
            </div>

            {submission.integrity && (
              <div
                className={`max-w-md mx-auto mb-6 rounded-2xl border p-4 text-left ${
                  SIGNAL_STYLES[submission.integrity.signal].cls
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold">🛡️ Focus & Integrity Signals</p>
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {SIGNAL_STYLES[submission.integrity.signal].label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-300">
                  <span>Tab switches: <b>{submission.integrity.counts.TAB_BLUR}</b></span>
                  <span>Pastes: <b>{submission.integrity.counts.PASTE}</b></span>
                  <span>Copies: <b>{submission.integrity.counts.COPY}</b></span>
                  <span>Right-clicks: <b>{submission.integrity.counts.CONTEXT_MENU}</b></span>
                  {submission.integrity.hiddenMs > 1000 && (
                    <span className="col-span-2">
                      Time off-tab: <b>{Math.round(submission.integrity.hiddenMs / 1000)}s</b>
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button
                onClick={onReviewTheory}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                📖 Review Theory Notes
              </button>
              <button
                onClick={onComplete}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-indigo-900/50 cursor-pointer"
              >
                🎯 Return to Category
              </button>
            </div>
          </div>

          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <span>📝</span> Detailed Answer Review
          </h3>

          <div className="space-y-4">
            {questions.map((q, i) => {
              const res = submission.results.find((r) => r.questionId === q.id);
              const userAns = selectedAnswers[q.id];
              const isCorrect = res?.isCorrect;

              return (
                <div
                  key={q.id}
                  className={`p-6 rounded-2xl border ${
                    isCorrect
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-rose-500/10 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl">{isCorrect ? '✅' : '❌'}</span>
                    <div className="flex-1">
                      <p className="text-sm sm:text-base font-bold text-white">
                        {i + 1}. {q.question}
                      </p>
                      {res?.hintUsed && (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-full">
                          💡 Hint Used (-20% XP)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-8">
                    {[q.optionA, q.optionB, q.optionC, q.optionD, q.optionE]
                      .filter(Boolean)
                      .map((opt, optIdx) => {
                        let optClass = 'p-3 rounded-xl border text-xs ';
                        if (res?.correctIndex === optIdx) {
                          optClass += 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold';
                        } else if (userAns === optIdx && !isCorrect) {
                          optClass += 'border-rose-500 bg-rose-500/20 line-through text-rose-300';
                        } else {
                          optClass += 'border-slate-800 bg-slate-900/60 text-slate-400';
                        }

                        return (
                          <div key={optIdx} className={optClass}>
                            {String.fromCharCode(65 + optIdx)}. {opt}
                          </div>
                        );
                      })}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 pl-8">
                    {explanations[q.id] ? (
                      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
                        <h4 className="font-bold text-indigo-400 mb-1">Step-by-step Solution:</h4>
                        <p className="whitespace-pre-wrap leading-relaxed">{explanations[q.id]}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleShowExplanation(q.id)}
                        disabled={loadingExplanation[q.id]}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                      >
                        {loadingExplanation[q.id] ? 'Loading solution...' : '📝 Show Full Solution'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </FullScreenShell>
    );
  }

  // Active Quiz View
  const currentQ = questions[currentIndex];
  const options = [currentQ.optionA, currentQ.optionB, currentQ.optionC, currentQ.optionD];
  if (currentQ.optionE) options.push(currentQ.optionE);

  const isLastQuestion = currentIndex === questions.length - 1;
  const hasAnsweredCurrent = selectedAnswers[currentQ.id] !== undefined;

  return (
    <FullScreenShell
      title={`${topicName} Drill`}
      subtitle={`Question ${currentIndex + 1} of ${questions.length}`}
      icon="🎮"
      currentPage="interview-quiz"
      user={user}
      onNavigate={nav}
      onBack={onComplete}
      onLogout={onLogout}
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {integrityWarning && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/15 px-4 py-3 text-xs text-amber-300">
            <span className="text-base">⚠️</span>
            <span>{integrityWarning}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black text-white">{topicName}</h2>
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400"
              title="Advisory focus monitor"
            >
              <span className={`h-2 w-2 rounded-full ${totalEvents > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              Focus monitor{totalEvents > 0 ? ` · ${totalEvents}` : ''}
            </span>
            <span className="text-xs font-bold text-indigo-400">
              Question {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* QUESTION CARD */}
        <div className="bg-slate-900/90 rounded-3xl shadow-xl shadow-slate-950/50 border border-slate-800 p-6 sm:p-8">
          <p className="text-base sm:text-lg text-white font-medium mb-6 leading-relaxed">
            {currentQ.question}
          </p>

          <div className="space-y-3">
            {options.map((opt, idx) => {
              const isSelected = selectedAnswers[currentQ.id] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(currentQ.id, idx)}
                  className={`w-full text-left p-4 rounded-2xl border transition flex items-center gap-3 cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-600/30 text-white font-bold shadow-lg shadow-indigo-950/50'
                      : 'border-slate-800 bg-slate-800/60 text-slate-200 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-400 shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1 text-xs sm:text-sm">{opt}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            {activeHint ? (
              <div className="bg-amber-500/15 border border-amber-500/30 p-4 rounded-2xl text-amber-300 flex items-start gap-2.5 text-xs">
                <span className="text-lg">💡</span>
                <p className="leading-relaxed">{activeHint}</p>
              </div>
            ) : (
              <button
                onClick={() => handleShowHint(currentQ.id)}
                disabled={loadingHint}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition cursor-pointer"
              >
                {loadingHint ? 'Loading hint...' : '💡 Show Hint (Reduces XP by 20%)'}
              </button>
            )}
          </div>
        </div>

        {/* BOTTOM NAVIGATION */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-6 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs disabled:opacity-40 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
          >
            ← Previous
          </button>

          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={!hasAnsweredCurrent || submitting}
              className="px-7 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-900/40 disabled:opacity-40 transition active:scale-95 cursor-pointer"
            >
              {submitting ? 'Submitting…' : 'Submit Quiz Drill ✓'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!hasAnsweredCurrent}
              className="px-7 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs shadow-lg shadow-indigo-900/40 disabled:opacity-40 transition active:scale-95 cursor-pointer"
            >
              Next Question →
            </button>
          )}
        </div>
      </div>
    </FullScreenShell>
  );
};
export default InterviewQuiz;
