import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { QuickNotes } from '../components/QuickNotes';
import { FullScreenShell } from '../components/FullScreenShell';

interface GameType {
  type: string;
  name: string;
  icon: string;
  description: string;
  xpBase: number | string;
}

interface GameArcadeProps {
  topicId: string;
  topicName: string;
  onSelectGame: (topicId: string, topicName: string, gameType: string) => void;
  onBack: () => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const GameArcade: React.FC<GameArcadeProps> = ({
  topicId,
  topicName,
  onSelectGame,
  onBack,
  user,
  onNavigate = () => {},
  onLogout,
}) => {
  const [games, setGames] = useState<GameType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedGameForNotes, setSelectedGameForNotes] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await apiClient.get<any>(`/games/arcade/${topicId}`);
        setGames(response.games);
      } catch (err) {
        console.error('Failed to load arcade:', err);
        setError('Failed to load available games. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [topicId]);

  return (
    <FullScreenShell
      title="Game Arcade"
      subtitle={`Interactive drills and arcade mini-games for ${topicName}`}
      icon="🕹️"
      currentPage="game-arcade"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
      showBackButton={!!onBack}
      onBack={onBack}
    >
      <div className="max-w-6xl mx-auto space-y-6 relative">
        {selectedGameForNotes && (
          <QuickNotes
            topicId={topicId}
            topicName={topicName}
            gameType={selectedGameForNotes}
            onReady={() => onSelectGame(topicId, topicName, selectedGameForNotes)}
            onSkip={() => setSelectedGameForNotes(null)}
          />
        )}

        {/* Arcade Header */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              🕹️ Learning Arcade
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Select Arcade Drill</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Active Topic: <span className="font-bold text-indigo-400">{topicName}</span>
            </p>
          </div>
          <button
            onClick={onBack}
            className="self-start sm:self-center px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:text-white transition"
          >
            ← Back to Topics
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-sm font-semibold text-slate-500 animate-pulse">
              🎮 Loading Arcade...
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6">
            <div className="text-rose-300 text-xs font-semibold mb-4">{error}</div>
            <button
              onClick={onBack}
              className="text-indigo-400 hover:text-indigo-300 text-xs font-bold"
            >
              ← Back to Topics
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <div
                key={game.type}
                className="bg-slate-900/90 rounded-2xl shadow-xl border border-slate-800 hover:border-slate-700 hover:shadow-slate-950/60 transition-all duration-300 flex flex-col h-full group"
              >
                <div className="p-6 flex-grow flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
                      {game.icon}
                    </div>
                    <div className="bg-indigo-500/10 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold flex items-center border border-indigo-500/30">
                      <span className="mr-1">⭐</span>
                      {typeof game.xpBase === 'number'
                        ? `Up to ${game.xpBase * 1.5} XP`
                        : 'Variable XP'}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                    {game.name}
                  </h3>

                  <p className="text-slate-400 flex-grow text-xs leading-relaxed">
                    {game.description}
                  </p>
                </div>

                <div className="p-6 pt-0 mt-auto">
                  <button
                    onClick={() => setSelectedGameForNotes(game.type)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/25 active:scale-95 transition"
                  >
                    Play {game.name} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
