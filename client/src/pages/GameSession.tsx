import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

interface Question {
  id: string;
  text: string;
  options: string[];
}

interface GameSessionProps {
  topicId: string;
  topicName: string;
  onGameComplete: () => void;
}

interface Answer {
  questionId: string;
  answer: string;
  timeTakenMs: number;
  hintUsed: boolean;
}

export const GameSession: React.FC<GameSessionProps> = ({ topicId, topicName, onGameComplete }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);

  // Load game session on mount
  useEffect(() => {
    loadGameSession();
  }, [topicId]);

  // Timer for each question
  useEffect(() => {
    if (gameComplete || showFeedback || !sessionId) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionId, gameComplete, showFeedback]);

  const loadGameSession = async () => {
    try {
      const response = await apiClient.get<any>(
        `/games/session/${topicId}`
      );
      setSessionId(response.sessionId);
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

  const handleAnswer = (answer: string | null) => {
    const timeTaken = Date.now() - sessionStartTime;
    const currentQuestion = questions[currentQuestionIndex];

    // Dummy feedback - in production, validate against backend
    const isCorrect = answer === currentQuestion.options[0]; // Simplified

    setAnswers([
      ...answers,
      {
        questionId: currentQuestion.id,
        answer: answer || 'skipped',
        timeTakenMs: timeTaken,
        hintUsed: false
      }
    ]);

    setFeedbackCorrect(isCorrect);
    setShowFeedback(true);
  };

  const handleNext = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setTimeLeft(30);
      setSessionStartTime(Date.now());
    } else {
      // Submit game
      await submitGame();
    }
  };

  const submitGame = async () => {
    setSubmitting(true);
    try {
      const response = await apiClient.post<any>('/games/session/submit', {
        topicId,
        answers,
        durationSec: Math.floor((Date.now() - sessionStartTime) / 1000)
      });

      setScore(response.score);
      setXpEarned(response.xpEarned);
      setGameComplete(true);
    } catch (error) {
      console.error('Failed to submit game:', error);
      alert('Failed to submit game. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading game...</div>;
  }

  if (questions.length === 0) {
    return <div className="text-center py-8">No questions available</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl mx-auto">
      {gameComplete ? (
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">🎉 Game Complete!</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded">
              <p className="text-gray-600">Score</p>
              <p className="text-3xl font-bold text-blue-600">{score}</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="text-gray-600">XP Earned</p>
              <p className="text-3xl font-bold text-green-600">+{xpEarned}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setGameComplete(false);
              onGameComplete();
            }}
            className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 font-bold"
          >
            Back to Dashboard
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">{topicName}</h2>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className={`text-sm font-bold ${timeLeft <= 10 ? 'text-red-600' : 'text-blue-600'}`}>
                ⏱️ {timeLeft}s
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold mb-4">{currentQuestion.text}</h3>

            <div className="space-y-2 mb-6">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => !showFeedback && setSelectedAnswer(option)}
                  disabled={showFeedback}
                  className={`w-full p-4 text-left rounded border-2 transition ${
                    selectedAnswer === option
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  } ${showFeedback ? 'opacity-75' : ''}`}
                >
                  <span className="font-semibold mr-3">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  {option}
                </button>
              ))}
            </div>

            {showFeedback && (
              <div
                className={`p-4 rounded mb-4 ${
                  feedbackCorrect
                    ? 'bg-green-100 border border-green-400'
                    : 'bg-red-100 border border-red-400'
                }`}
              >
                <p className={`font-bold ${feedbackCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {feedbackCorrect ? '✅ Correct!' : '❌ Incorrect'}
                </p>
                <p className="text-sm mt-1">The correct answer is {currentQuestion.options[0]}</p>
              </div>
            )}
          </div>

          {showFeedback && (
            <button
              onClick={handleNext}
              disabled={submitting}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 font-bold disabled:bg-gray-400"
            >
              {submitting
                ? 'Submitting...'
                : currentQuestionIndex === questions.length - 1
                ? 'Finish Game'
                : 'Next Question'}
            </button>
          )}

          {!showFeedback && selectedAnswer && (
            <button
              onClick={() => handleAnswer(selectedAnswer)}
              className="w-full px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 font-bold"
            >
              Submit Answer
            </button>
          )}

          {!showFeedback && !selectedAnswer && (
            <button
              onClick={() => handleAnswer(null)}
              className="w-full px-6 py-3 bg-gray-400 text-white rounded hover:bg-gray-500 font-bold"
            >
              Skip Question
            </button>
          )}
        </>
      )}
    </div>
  );
};
