import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface Question {
  hash: string;
  questionText: string;
  options: string[];
}

interface GameSessionProps {
  topicId: string;
  topicName: string;
  onGameComplete: () => void;
  preloadedSessionData?: {
    sessionKey: string;
    topicId: string;
    topicName: string;
    questions: Question[];
  } | null;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
  onBack?: () => void;
}

interface Answer {
  hash: string;
  chosenAnswer: string;
  timeTakenMs: number;
  hintUsed: boolean;
}

interface GameResult {
  hash: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
}

export const GameSession: React.FC<GameSessionProps> = ({
  topicId,
  topicName,
  onGameComplete,
  preloadedSessionData,
  user,
  onNavigate = () => {},
  onLogout,
  onBack,
}) => {
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);

  const [timeLeft, setTimeLeft] = useState(30);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [results, setResults] = useState<GameResult[]>([]);

  // Load game session on mount
  useEffect(() => {
    if (preloadedSessionData) {
      setSessionKey(preloadedSessionData.sessionKey);
      setQuestions(preloadedSessionData.questions);
      setLoading(false);
    } else {
      loadGameSession();
    }
  }, [topicId, preloadedSessionData]);

  // Timer for each question
  useEffect(() => {
    if (gameComplete || !sessionKey) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionKey, gameComplete]);

  const loadGameSession = async () => {
    try {
      const response = await apiClient.get<any>(`/games/session/${topicId}`);
      setSessionKey(response.sessionKey);
      setQuestions(response.questions);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load game session:', error);
      setLoading(false);
    }
  };

  const handleTimeUp = () => {
    if (selectedAnswer === null) {
      handleAnswer(null);
    }
  };

  const fetchHint = async () => {
    if (!sessionKey || hintLoading || hint) return;
    setHintLoading(true);
    try {
      const response = await apiClient.post<any>('/games/hint', {
        sessionKey,
        questionHash: questions[currentQuestionIndex].hash,
      });
      setHint(response.hint);
    } catch (error) {
      console.error('Failed to get hint:', error);
      setHint('Failed to load hint.');
    } finally {
      setHintLoading(false);
    }
  };

  const handleAnswer = async (answer: string | null) => {
    const timeTaken = Date.now() - sessionStartTime;
    const currentQuestion = questions[currentQuestionIndex];

    const newAnswers = [
      ...answers,
      {
        hash: currentQuestion.hash,
        chosenAnswer: answer || 'skipped',
        timeTakenMs: timeTaken,
        hintUsed: !!hint,
      },
    ];
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setHint(null);
      setTimeLeft(30);
      setSessionStartTime(Date.now());
    } else {
      await submitGame(newAnswers);
    }
  };

  const submitGame = async (finalAnswers: Answer[]) => {
    setSubmitting(true);
    try {
      const response = await apiClient.post<any>('/games/session/submit', {
        sessionKey,
        topicId,
        answers: finalAnswers,
        durationSec: Math.floor((Date.now() - sessionStartTime) / 1000),
      });

      setScore(response.score);
      setXpEarned(response.xpEarned);
      setResults(response.results);
      setGameComplete(true);
    } catch (error) {
      console.error('Failed to submit game:', error);
      alert('Failed to submit game. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <FullScreenShell
      title={`Session: ${topicName}`}
      subtitle="Timed quiz challenge with hints and instant feedback"
      icon="📝"
      currentPage="game-session"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
      showBackButton={!!onBack}
      onBack={onBack}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {loading ? (
          <div className="text-center py-20 text-slate-500 font-medium animate-pulse">
            Loading session... Synthesizing questions with AI...
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/90 rounded-2xl border border-slate-800 text-slate-400">
            No questions available for this topic.
          </div>
        ) : gameComplete ? (
          <div className="bg-slate-900/90 p-8 rounded-3xl shadow-2xl border border-slate-800 text-center">
            <h2 className="text-3xl font-black text-white mb-2">🎉 Session Complete!</h2>
            <p className="text-xs text-slate-400 mb-6">Here is how you performed across this drill:</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Score</p>
                <p className="text-4xl font-black text-indigo-400">{score}%</p>
              </div>
              <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">XP Earned</p>
                <p className="text-4xl font-black text-emerald-400">+{xpEarned}</p>
              </div>
            </div>

            <div className="mt-8 text-left max-h-96 overflow-y-auto pr-2 space-y-3">
              <h3 className="text-base font-bold text-white mb-3">Review Your Answers</h3>
              {results.map((res, idx) => {
                const q = questions.find((item) => item.hash === res.hash);
                const userAns = answers.find((a) => a.hash === res.hash)?.chosenAnswer;

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border text-xs ${
                      res.isCorrect
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                        : 'border-rose-500/40 bg-rose-950/20 text-rose-200'
                    }`}
                  >
                    <p className="font-bold text-white mb-2">{q?.questionText}</p>
                    <p className="mb-1">
                      <span className="font-semibold text-slate-400">Your Answer: </span>
                      <span className={res.isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {userAns}
                      </span>
                    </p>
                    {!res.isCorrect && (
                      <p className="text-emerald-400 mb-2">
                        <span className="font-semibold text-slate-400">Correct Answer: </span>
                        {res.correctAnswer}
                      </p>
                    )}
                    <p className="italic text-slate-400 mt-2 text-[11px]">{res.explanation}</p>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                setGameComplete(false);
                onGameComplete();
              }}
              className="mt-6 px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/25 active:scale-95 transition"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/90 p-8 rounded-3xl shadow-2xl border border-slate-800">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span
                  className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                    timeLeft <= 10
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                  }`}
                >
                  ⏱️ {timeLeft}s
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-5 leading-relaxed">
                {currentQuestion.questionText}
              </h3>

              <div className="space-y-3 mb-6">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedAnswer(option)}
                    disabled={submitting}
                    className={`w-full p-4 text-left rounded-xl border text-xs font-medium transition-all flex items-center ${
                      selectedAnswer === option
                        ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-md'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] mr-3 shrink-0 ${
                        selectedAnswer === option
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{option}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 flex flex-col items-center">
              {hint ? (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-xl w-full text-xs">
                  <span className="font-bold mr-2">💡 Hint:</span>
                  {hint}
                </div>
              ) : (
                <button
                  onClick={fetchHint}
                  disabled={hintLoading || submitting}
                  className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition"
                >
                  {hintLoading ? 'Generating hint...' : '💡 Need a hint?'}
                </button>
              )}
            </div>

            <div className="flex gap-3">
              {selectedAnswer ? (
                <button
                  onClick={() => handleAnswer(selectedAnswer)}
                  disabled={submitting}
                  className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Answer →'}
                </button>
              ) : (
                <button
                  onClick={() => handleAnswer(null)}
                  disabled={submitting}
                  className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
                >
                  Skip Question
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
