import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

export interface AchievementData {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  isEarned: boolean;
  earnedAt: string | null;
}

export interface AchievementsPageProps {
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onBack: () => void;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const AchievementsPage: React.FC<AchievementsPageProps> = ({
  user,
  onBack,
  onNavigate,
  onLogout,
}) => {
  const [achievements, setAchievements] = useState<AchievementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await apiClient.get<AchievementData[]>('/achievements');
        setAchievements(response);
      } catch (error) {
        console.error('Failed to load achievements', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAchievements();
  }, []);

  const nav = onNavigate || (() => {});
  const earnedCount = achievements.filter((a) => a.isEarned).length;

  const filtered =
    filter === 'all'
      ? achievements
      : achievements.filter((a) => a.category.toLowerCase() === filter.toLowerCase());

  return (
    <FullScreenShell
      title="Trophy Room & Achievements"
      subtitle={`${earnedCount} / ${achievements.length} milestones unlocked`}
      icon="🏆"
      currentPage="achievements"
      user={user}
      onNavigate={nav}
      onBack={onBack}
      onLogout={onLogout}
    >
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600/30 via-orange-600/20 to-slate-900/90 border border-amber-500/30 p-6 sm:p-8 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-black mb-3">
              <span>🏆</span> MILESTONES & TROPHIES
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Trophy Room & Badges
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Unlock badges by mastering aptitude topics, achieving high accuracy on DSA tracks, maintaining daily practice streaks, and topping leaderboards.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl text-center shrink-0">
            <div className="text-3xl sm:text-4xl font-black text-amber-400">
              {earnedCount} <span className="text-sm font-bold text-slate-500">/ {achievements.length}</span>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Unlocked Badges
            </div>
          </div>
        </div>

        {/* CATEGORY FILTERS */}
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {['all', 'general', 'domain'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl font-bold text-xs capitalize transition cursor-pointer ${
                filter === f
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All Trophies' : `${f} Badges`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            <p className="text-xs text-slate-400 font-bold">Loading achievements...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((a) => (
              <div
                key={a.id}
                className={`relative rounded-3xl p-6 border transition-all flex flex-col justify-between ${
                  a.isEarned
                    ? 'bg-slate-900/90 border-amber-500/40 shadow-xl shadow-amber-950/20 hover:-translate-y-1'
                    : 'bg-slate-900/40 border-slate-800/80 opacity-50 grayscale hover:grayscale-0 hover:opacity-80'
                }`}
              >
                {a.isEarned && (
                  <div className="absolute top-3 right-3 bg-amber-400/20 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-full text-amber-300">
                    EARNED
                  </div>
                )}

                <div className="text-5xl my-3 text-center transition-transform hover:scale-110">
                  {a.icon}
                </div>

                <div className="text-center">
                  <h3 className={`font-black text-base mb-1.5 ${a.isEarned ? 'text-white' : 'text-slate-400'}`}>
                    {a.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {a.description}
                  </p>
                </div>

                <div className="flex justify-between items-center border-t border-slate-800 pt-3 mt-auto text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {a.category}
                  </span>
                  <span className={`font-black ${a.isEarned ? 'text-emerald-400' : 'text-slate-500'}`}>
                    +{a.xpReward} XP
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
export default AchievementsPage;
