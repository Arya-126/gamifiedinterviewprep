import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '../../services/api';
import { FullScreenShell } from '../../components/FullScreenShell';

interface Card {
  id: string;
  kind: 'term-def' | 'fact';
  prompt: string;
  answer: string | null;
}
interface Payload {
  topicId: string;
  topicName: string;
  categoryName: string;
  durationSec: number;
  cards: Card[];
}

interface TimeRushGameProps {
  onBack: () => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const TimeRushGame: React.FC<TimeRushGameProps> = ({
  onBack,
  user,
  onNavigate = () => {},
  onLogout,
}) => {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [got, setGot] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(60000);
  const startTs = useRef<number>(0);

  useEffect(() => {
    apiClient
      .get<Payload>('/games-content/time-rush/random')
      .then(setData)
      .catch(() => setError('Could not load a topic — try again.'));
  }, []);

  useEffect(() => {
    if (phase !== 'play' || !data) return;
    startTs.current = Date.now();
    setTimeLeftMs(data.durationSec * 1000);
    const t = setInterval(() => {
      const remaining = Math.max(0, data.durationSec * 1000 - (Date.now() - startTs.current));
      setTimeLeftMs(remaining);
      if (remaining === 0) {
        clearInterval(t);
        setPhase('done');
      }
    }, 200);
    return () => clearInterval(t);
  }, [phase, data]);

  return (
    <FullScreenShell
      title="Time Rush"
      subtitle="60-second rapid fire concept flashcard sprint"
      currentPage="game-time-rush"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <div className="max-w-xl mx-auto space-y-4">
        {error ? (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-6 rounded-2xl text-center text-xs">
            {error}
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-slate-500 font-medium animate-pulse">
            Loading rapid sprint...
          </div>
        ) : phase === 'intro' ? (
          <div className="bg-slate-900/90 p-8 rounded-3xl shadow-2xl border border-slate-800 text-center">
            <div className="text-5xl mb-3">⏱</div>
            <h1 className="text-2xl font-black text-white">Time Rush Sprint</h1>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Topic: <b className="text-indigo-400">{data.topicName}</b> ({data.categoryName})
            </p>
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 text-left text-xs text-slate-300 space-y-2 mb-6">
              <div>• {data.durationSec} seconds, {data.cards.length} flashcards</div>
              <div>• Tap to reveal the answer, then rate yourself <b>Got it</b> or <b>Next</b></div>
              <div>• Count of self-verified "Got it" is your final sprint score</div>
            </div>
            <button
              onClick={() => setPhase('play')}
              className="w-full py-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-500/25 active:scale-95 transition"
            >
              🚀 Start 60s Sprint
            </button>
          </div>
        ) : phase === 'done' ? (
          (() => {
            const total = got + skipped;
            const pct = total > 0 ? Math.round((got / total) * 100) : 0;
            return (
              <div className="bg-slate-900/90 p-8 rounded-3xl shadow-2xl border border-slate-800 text-center">
                <div className="text-5xl font-black text-indigo-400 mb-1">{got}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Mastered in 60 seconds
                </div>
                <div className="text-xs text-slate-400 mt-4 mb-6">
                  Attempted {total} cards · {pct}% retention confidence
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onBack}
                    className="flex-1 py-3.5 rounded-xl font-bold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                  >
                    Back to Games
                  </button>
                  <button
                    onClick={() => {
                      setPhase('intro');
                      setIdx(0);
                      setGot(0);
                      setSkipped(0);
                      setRevealed(false);
                    }}
                    className="flex-1 py-3.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-md shadow-indigo-500/25 transition"
                  >
                    🔄 Play Again
                  </button>
                </div>
              </div>
            );
          })()
        ) : (
          (() => {
            const card = data.cards[idx % data.cards.length];
            const secLeft = Math.ceil(timeLeftMs / 1000);
            const barPct = (timeLeftMs / (data.durationSec * 1000)) * 100;
            const barColor = barPct < 20 ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500';

            const advance = (gotIt: boolean) => {
              if (gotIt) setGot(got + 1);
              else setSkipped(skipped + 1);
              setRevealed(false);
              setIdx(idx + 1);
            };

            return (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Card {idx + 1}
                  </span>
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                      secLeft < 12
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                    }`}
                  >
                    ⏱️ {secLeft}s
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-200 ${barColor}`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>

                <div className="bg-slate-900/90 p-8 rounded-3xl shadow-2xl border border-slate-800 min-h-[260px] flex flex-col justify-center text-center">
                  <div className="text-[10px] font-black uppercase text-indigo-400 mb-2">
                    {card.kind === 'term-def' ? 'Define this concept' : 'Recall key point'}
                  </div>
                  <div className="text-lg font-black text-white mb-4 whitespace-pre-wrap leading-relaxed">
                    {card.prompt}
                  </div>
                  {revealed && card.answer && (
                    <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 whitespace-pre-wrap leading-relaxed animate-fade-in">
                      {card.answer}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {card.answer && !revealed && (
                    <button
                      onClick={() => setRevealed(true)}
                      className="flex-1 py-3.5 rounded-xl font-bold text-xs text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                    >
                      👁 Reveal Answer
                    </button>
                  )}
                  <button
                    onClick={() => advance(false)}
                    className="flex-1 py-3.5 rounded-xl font-bold text-xs text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => advance(true)}
                    className="flex-1 py-3.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/20"
                  >
                    ✓ Got it
                  </button>
                </div>

                <div className="text-center text-xs text-slate-500 mt-2">
                  Score so far: <b className="text-emerald-400">{got}</b> · Skipped: {skipped}
                </div>
              </div>
            );
          })()
        )}
      </div>
    </FullScreenShell>
  );
};
