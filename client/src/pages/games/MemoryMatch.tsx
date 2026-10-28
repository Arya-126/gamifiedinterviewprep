import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';
import { FullScreenShell } from '../../components/FullScreenShell';

interface MemoryMatchProps {
  topicId: string;
  topicName: string;
  onGameComplete: () => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
  onBack?: () => void;
}

interface Card {
  id: number;
  text: string;
  type: 'term' | 'definition';
  pairId: number;
  isFlipped: boolean;
  isMatched: boolean;
}

export const MemoryMatch: React.FC<MemoryMatchProps> = ({
  topicId,
  topicName,
  onGameComplete,
  user,
  onNavigate = () => {},
  onLogout,
  onBack,
}) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const [results, setResults] = useState<{ score: number; xpEarned: number } | null>(null);

  useEffect(() => {
    loadGame();
  }, [topicId]);

  useEffect(() => {
    let interval: any;
    if (timerActive && !gameComplete) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, gameComplete]);

  const loadGame = async () => {
    try {
      const response = await apiClient.get<any>(`/games/mini/${topicId}/MEMORY_MATCH`);
      setSessionKey(response.sessionKey);

      const pairs = response.content.pairs;
      const gameCards: Card[] = [];

      pairs.forEach((pair: any, index: number) => {
        gameCards.push({
          id: index * 2,
          text: pair.term,
          type: 'term',
          pairId: index,
          isFlipped: false,
          isMatched: false,
        });
        gameCards.push({
          id: index * 2 + 1,
          text: pair.definition,
          type: 'definition',
          pairId: index,
          isFlipped: false,
          isMatched: false,
        });
      });

      // Shuffle cards
      setCards(gameCards.sort(() => Math.random() - 0.5));
      setLoading(false);
      setTimerActive(true);
    } catch (error) {
      console.error('Failed to load memory match:', error);
      setLoading(false);
    }
  };

  const handleCardClick = (id: number) => {
    if (!timerActive || flippedCards.length >= 2) return;

    const currentCard = cards.find((c) => c.id === id);
    if (!currentCard || currentCard.isFlipped || currentCard.isMatched) return;

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    const newCards = cards.map((c) => (c.id === id ? { ...c, isFlipped: true } : c));
    setCards(newCards);

    if (newFlipped.length === 2) {
      checkMatch(newFlipped, newCards);
    }
  };

  const checkMatch = (flippedIds: number[], currentCards: Card[]) => {
    const card1 = currentCards.find((c) => c.id === flippedIds[0]);
    const card2 = currentCards.find((c) => c.id === flippedIds[1]);

    if (!card1 || !card2) return;

    if (card1.pairId === card2.pairId && card1.type !== card2.type) {
      setTimeout(() => {
        const newCards = currentCards.map((c) =>
          flippedIds.includes(c.id) ? { ...c, isMatched: true } : c
        );
        setCards(newCards);
        setFlippedCards([]);
        setMatches((m) => {
          const newMatches = m + 1;
          if (newMatches === currentCards.length / 2) {
            submitGame(newMatches, mistakes);
          }
          return newMatches;
        });
      }, 500);
    } else {
      setMistakes((m) => m + 1);
      setTimeout(() => {
        const newCards = currentCards.map((c) =>
          flippedIds.includes(c.id) ? { ...c, isFlipped: false } : c
        );
        setCards(newCards);
        setFlippedCards([]);
      }, 1000);
    }
  };

  const submitGame = async (finalMatches: number, finalMistakes: number) => {
    setTimerActive(false);
    setSubmitting(true);

    const maxScore = 100;
    const penaltyPerMistake = 5;
    const score = Math.max(20, maxScore - finalMistakes * penaltyPerMistake);

    try {
      const response = await apiClient.post<any>('/games/mini/submit', {
        sessionKey,
        topicId,
        gameType: 'MEMORY_MATCH',
        score,
        durationSec: timeElapsed,
        details: { mistakes: finalMistakes },
      });

      setResults(response);
      setGameComplete(true);
    } catch (error) {
      console.error('Failed to submit game:', error);
      alert('Failed to submit game results.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <FullScreenShell
      title={`Memory Match: ${topicName}`}
      subtitle="Pair terms with their matching technical definitions"
      icon="🧠"
      currentPage="game-memory-match"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
      showBackButton={!!onBack}
      onBack={onBack}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-24 text-center">
            <div className="text-5xl mb-4">🧠</div>
            <div className="text-sm font-bold text-indigo-400 animate-pulse">
              Generating Cards with AI...
            </div>
          </div>
        ) : gameComplete && results ? (
          <div className="max-w-xl mx-auto bg-slate-900/90 p-8 rounded-3xl shadow-2xl border border-slate-800 text-center">
            <h2 className="text-3xl font-black text-white mb-6">🎉 Game Complete!</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
                <p className="text-slate-400 font-bold mb-1 uppercase tracking-wider text-xs">Score</p>
                <p className="text-4xl font-black text-indigo-400">{results.score}%</p>
              </div>
              <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
                <p className="text-slate-400 font-bold mb-1 uppercase tracking-wider text-xs">XP Earned</p>
                <p className="text-4xl font-black text-emerald-400">+{results.xpEarned}</p>
              </div>
            </div>

            <div className="flex justify-center gap-6 mb-8 text-xs text-slate-400 font-semibold">
              <div>⏱️ Time: {formatTime(timeElapsed)}</div>
              <div>❌ Mistakes: {mistakes}</div>
            </div>

            <button
              onClick={onGameComplete}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-500/25 active:scale-95"
            >
              Continue →
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div>
                <h2 className="text-lg font-black text-white">Memory Match</h2>
                <p className="text-xs text-slate-400 mt-0.5">Match terms with their definitions.</p>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mistakes</div>
                  <div className="text-lg font-black text-rose-400">{mistakes}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time</div>
                  <div className="text-lg font-black text-indigo-400">{formatTime(timeElapsed)}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {cards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  className={`
                    relative h-32 sm:h-36 cursor-pointer transition-all duration-500
                    ${card.isMatched ? 'opacity-0 invisible pointer-events-none' : 'opacity-100'}
                  `}
                  style={{ perspective: '1000px' }}
                >
                  <div
                    className={`
                      w-full h-full absolute top-0 left-0 transition-transform duration-500 rounded-2xl shadow-lg
                      ${card.isFlipped ? '' : 'rotate-y-180'}
                    `}
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: card.isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
                    }}
                  >
                    {/* Front (Hidden state) */}
                    <div
                      className="w-full h-full absolute top-0 left-0 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-slate-800 hover:border-indigo-500/50 transition-colors"
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                      <span className="opacity-40 text-indigo-400">🧠</span>
                    </div>

                    {/* Back (Revealed state) */}
                    <div
                      className={`
                        w-full h-full absolute top-0 left-0 rounded-2xl flex items-center justify-center p-3 text-center border
                        ${
                          card.type === 'term'
                            ? 'bg-indigo-950/40 border-indigo-500/40'
                            : 'bg-violet-950/40 border-violet-500/40'
                        }
                      `}
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <span
                        className={`
                          ${
                            card.type === 'term'
                              ? 'font-black text-sm text-indigo-300'
                              : 'font-medium text-xs text-violet-200 leading-snug'
                          }
                        `}
                      >
                        {card.text}
                      </span>
                      <div className="absolute bottom-2 right-2 text-[9px] opacity-40 font-bold uppercase text-slate-400">
                        {card.type}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </FullScreenShell>
  );
};
