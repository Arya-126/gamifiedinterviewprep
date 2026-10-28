import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

export interface InterviewGameSelectProps {
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
  onSelectGame: (gameId: 'flashcards' | 'match' | 'sprint') => void;
  onSelectClassicGame: (gameType: string) => void;
  onBack: () => void;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const InterviewGameSelect: React.FC<InterviewGameSelectProps> = ({
  topicId,
  topicName,
  user,
  onSelectGame,
  onSelectClassicGame,
  onBack,
  onNavigate,
  onLogout,
}) => {
  const [availability, setAvailability] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAvailability = async () => {
      try {
        const data = await apiClient.get<Record<string, boolean>>(`/games/interview-availability/${topicId}`);
        if (!cancelled) setAvailability(data);
      } catch {
        if (!cancelled) setAvailability(null);
      }
    };
    fetchAvailability();
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  const nav = onNavigate || (() => {});

  const isAvailable = (gameType: string): boolean => {
    if (!availability) return true;
    return availability[gameType] !== false;
  };

  const formulaGames = [
    {
      id: 'flashcards' as const,
      name: 'Formula Flash Cards',
      emoji: '🃏',
      desc: 'Spaced repetition flash cards to rapidly memorize placement formulas and identities.',
      glow: 'hover:border-indigo-500/60 shadow-indigo-500/10',
      badge: 'Formula Recall',
    },
    {
      id: 'match' as const,
      name: 'Formula Match',
      emoji: '🔗',
      desc: 'Connect formula theorem names with their matching mathematical expressions under time.',
      glow: 'hover:border-emerald-500/60 shadow-emerald-500/10',
      badge: 'Pairing',
    },
    {
      id: 'sprint' as const,
      name: 'Concept Sprint',
      emoji: '⚡',
      desc: 'Rapid-fire True/False concept sprint verifying common placement edge cases and traps.',
      glow: 'hover:border-amber-500/60 shadow-amber-500/10',
      badge: 'Speed Drill',
    },
  ];

  const classicGames = [
    {
      type: 'MEMORY_MATCH',
      name: 'Memory Match',
      emoji: '🧠',
      desc: 'Flip and match terms and concepts',
    },
    {
      type: 'WORD_SCRAMBLE',
      name: 'Word Scramble',
      emoji: '🔤',
      desc: 'Unscramble key computer science terminology',
    },
    {
      type: 'CROSSWORD',
      name: 'Crossword Puzzle',
      emoji: '📝',
      desc: 'Solve technical crossword clues',
    },
    {
      type: 'HANGMAN',
      name: 'Hangman Drill',
      emoji: '💀',
      desc: 'Guess the algorithm or term letter-by-letter',
    },
    {
      type: 'FILL_BLANK',
      name: 'Fill the Blank',
      emoji: '⚡',
      desc: 'Complete the missing statements in definitions',
    },
    {
      type: 'CONCEPT_CANNON',
      name: 'Concept Cannon',
      emoji: '🎯',
      desc: 'Aim and fire at true vs false claims',
    },
  ];

  return (
    <FullScreenShell
      title={`Study Games: ${topicName}`}
      subtitle="Interactive concept drills & formula memorization"
      icon="🎮"
      currentPage="interview-game-select"
      user={user}
      onNavigate={nav}
      onBack={onBack}
      onLogout={onLogout}
    >
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        {/* SECTION 1: FORMULA GAMES */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            <h3 className="text-lg font-black text-white">⚡ Speed Formula Games</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {formulaGames.map((game) => (
              <button
                key={game.id}
                onClick={() => onSelectGame(game.id)}
                className={`bg-slate-900/90 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between text-left transition-all hover:-translate-y-1 shadow-lg shadow-slate-950/40 group cursor-pointer ${game.glow}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-4xl group-hover:scale-110 transition-transform">
                      {game.emoji}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {game.badge}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-white group-hover:text-indigo-300 transition mb-2">
                    {game.name}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{game.desc}</p>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
                  <span>Play Drill</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 2: CLASSIC STUDY GAMES */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <h3 className="text-lg font-black text-white">🕹️ Classic Arcade Engines</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {classicGames.map((game) => {
              const available = isAvailable(game.type);
              return (
                <button
                  key={game.type}
                  onClick={() => available && onSelectClassicGame(game.type)}
                  disabled={!available}
                  className={`bg-slate-900/90 rounded-2xl border p-6 flex flex-col justify-between text-left transition-all shadow-lg shadow-slate-950/40 ${
                    available
                      ? 'border-slate-800 hover:border-emerald-500/50 hover:-translate-y-1 cursor-pointer group'
                      : 'border-slate-800/50 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="text-3xl mb-3">{game.emoji}</div>
                    <h4
                      className={`text-base font-black mb-1.5 ${
                        available ? 'text-white group-hover:text-emerald-300' : 'text-slate-500'
                      }`}
                    >
                      {game.name}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{game.desc}</p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-emerald-400">
                    <span>{available ? 'Launch Arcade Engine' : 'Unavailable'}</span>
                    {available && <span className="group-hover:translate-x-1 transition-transform">→</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </FullScreenShell>
  );
};
export default InterviewGameSelect;
