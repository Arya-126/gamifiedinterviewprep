import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface User {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  level?: number;
  xpTotal?: number;
  streakDays?: number;
}

interface AchievementData {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface DashboardPageProps {
  user: User;
  onNavigate?: (page: string) => void;
  setCurrentPage?: (page: string) => void;
  onLogout?: () => void;
}

const LEVEL_THRESHOLDS = [0, 500, 1200, 2000, 3200, 5000, 8000, 12000, 18000];
const LEVEL_NAMES = [
  'Rookie',
  'Explorer',
  'Apprentice',
  'Scholar',
  'Expert',
  'Master',
  'Champion',
  'Legend',
  'Grandmaster',
];

const QUICK_ACTIONS = [
  {
    page: 'pipeline',
    icon: '🎯',
    title: 'My Placement Pipeline',
    desc: 'Structured diagnostic milestones tailored to your weak points',
    accent: 'from-emerald-500 to-teal-500',
    badge: 'Recommended',
  },
  {
    page: 'prep-games',
    icon: '🎮',
    title: 'Interactive Learning Games',
    desc: 'Big-O Sort, Time Rush, Bug Hunt, SQL Puzzles & 7 more engines',
    accent: 'from-amber-500 to-orange-500',
    badge: 'New',
  },
  {
    page: 'coding-tracks',
    icon: '💻',
    title: 'Coding Tracks (DSA)',
    desc: '70+ categorized problems with in-browser code editor',
    accent: 'from-indigo-500 to-cyan-500',
  },
  {
    page: 'interview-hub',
    icon: '🧮',
    title: 'Aptitude & Reasoning Hub',
    desc: 'Quantitative, logical reasoning & verbal question banks',
    accent: 'from-blue-500 to-indigo-600',
  },
  {
    page: 'domains',
    icon: '🚀',
    title: 'Learning Domains',
    desc: 'Explore 8 domains and 35 topics through interactive modules',
    accent: 'from-purple-500 to-pink-500',
  },
  {
    page: 'assessments',
    icon: '📝',
    title: 'Companies & Mock Tests',
    desc: 'Timed, proctored assessments matching real hiring workflows',
    accent: 'from-rose-500 to-red-600',
  },
  {
    page: 'ai-interview',
    icon: '🤖',
    title: 'AI Mock Interview',
    desc: 'Live audio & technical interview simulation with real-time feedback',
    accent: 'from-violet-500 to-fuchsia-600',
  },
  {
    page: 'contests',
    icon: '🏁',
    title: 'Live Contests',
    desc: 'Timed coding & aptitude contests — compete against peers',
    accent: 'from-cyan-500 to-blue-600',
  },
  {
    page: 'leaderboard',
    icon: '📊',
    title: 'Global Leaderboard',
    desc: 'Rank globally, in your university, or among friends',
    accent: 'from-purple-500 to-pink-600',
  },
  {
    page: 'achievements',
    icon: '🏆',
    title: 'Trophy Room',
    desc: 'Browse every achievement and badge you have unlocked',
    accent: 'from-amber-400 to-orange-500',
  },
];

const ADMIN_ACTIONS = [
  { page: 'review-queue', icon: '🔍', title: 'Question Review Queue', desc: 'Approve or reject flagged community submissions' },
  { page: 'test-builder', icon: '🛠️', title: 'Test Builder', desc: 'Compose, configure, and publish placement mock tests' },
  { page: 'admin-reports', icon: '📈', title: 'Attempt Reports', desc: 'Review student performance and proctoring logs' },
];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  onNavigate,
  setCurrentPage,
  onLogout,
}) => {
  const navigate = onNavigate || setCurrentPage || (() => {});

  const [stats, setStats] = useState({
    gamesPlayed: 0,
    totalXp: user?.xpTotal || 0,
    currentLevel: user?.level || 1,
    nextLevelXp: LEVEL_THRESHOLDS[user?.level || 1] || 500,
    currentLevelXp: LEVEL_THRESHOLDS[(user?.level || 1) - 1] || 0,
  });

  const [recentAchievements, setRecentAchievements] = useState<AchievementData[]>([]);

  useEffect(() => {
    setStats({
      gamesPlayed: 0,
      totalXp: user?.xpTotal || 0,
      currentLevel: user?.level || 1,
      nextLevelXp: LEVEL_THRESHOLDS[user?.level || 1] || 500,
      currentLevelXp: LEVEL_THRESHOLDS[(user?.level || 1) - 1] || 0,
    });

    const fetchRecent = async () => {
      try {
        const data = await apiClient.get<AchievementData[]>('/achievements/recent');
        setRecentAchievements(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchRecent();
  }, [user]);

  const xpProgress =
    stats.nextLevelXp > stats.currentLevelXp
      ? ((stats.totalXp - stats.currentLevelXp) / (stats.nextLevelXp - stats.currentLevelXp)) * 100
      : 100;
  const levelName = LEVEL_NAMES[stats.currentLevel - 1] || 'Explorer';
  const xpIntoLevel = stats.totalXp - stats.currentLevelXp;
  const xpForLevel = stats.nextLevelXp - stats.currentLevelXp;

  return (
    <FullScreenShell
      title="Classic Arcade & Dashboard"
      subtitle="XP progression, skill milestones & domain navigation"
      icon="🕹️"
      currentPage="dashboard"
      user={user}
      onNavigate={navigate}
      onLogout={onLogout}
    >
      <div className="flex flex-col gap-6">
        {/* WELCOME HERO */}
        <section className="relative overflow-hidden bg-gradient-to-r from-indigo-900/60 via-purple-900/50 to-slate-900/80 text-white p-6 sm:p-8 rounded-3xl border border-indigo-500/30 shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-3">
                <span>⭐</span> GAMIFIED LEARNING ARCADE
              </div>
              <h2 className="text-2xl sm:text-4xl font-black mb-2 tracking-tight">
                Welcome back,{' '}
                <span className="bg-gradient-to-r from-indigo-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                  {user?.name || 'Explorer'}
                </span>
                ! 👋
              </h2>
              <div className="flex flex-wrap items-center gap-2.5 mt-3">
                <span className="px-3 py-1 bg-slate-900/60 border border-slate-700/60 rounded-xl text-xs font-bold text-indigo-300">
                  ⭐ Level {stats.currentLevel} · {levelName}
                </span>
                <span className="px-3 py-1 bg-slate-900/60 border border-slate-700/60 rounded-xl text-xs font-bold text-amber-400">
                  🔥 {user?.streakDays || 1}-day streak
                </span>
              </div>
            </div>
            <div className="text-left md:text-right bg-slate-900/70 border border-slate-800 p-4 rounded-2xl shrink-0">
              <p className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
                {stats.totalXp.toLocaleString()}
              </p>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Total XP Earned</p>
            </div>
          </div>
        </section>

        {/* STATS OVERVIEW CARDS */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-slate-950/40 flex items-center gap-4">
            <div className="w-13 h-13 flex items-center justify-center text-2xl bg-indigo-500/20 border border-indigo-500/30 rounded-2xl shrink-0">
              ⭐
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current Tier</p>
              <p className="text-2xl font-black text-white mt-0.5">
                {stats.currentLevel}{' '}
                <span className="text-sm font-bold text-indigo-400">({levelName})</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-slate-950/40 flex items-center gap-4">
            <div className="w-13 h-13 flex items-center justify-center text-2xl bg-emerald-500/20 border border-emerald-500/30 rounded-2xl shrink-0">
              ⚡
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total XP Earned</p>
              <p className="text-2xl font-black text-white mt-0.5">{stats.totalXp.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400">
                {xpIntoLevel} / {xpForLevel} towards next level
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-slate-950/40 flex items-center gap-4">
            <div className="w-13 h-13 flex items-center justify-center text-2xl bg-amber-500/20 border border-amber-500/30 rounded-2xl shrink-0">
              🔥
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Daily Streak</p>
              <p className="text-2xl font-black text-amber-400 mt-0.5">
                {user?.streakDays || 1} <span className="text-sm font-bold text-slate-400">days</span>
              </p>
            </div>
          </div>
        </section>

        {/* XP PROGRESS BAR */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg shadow-slate-950/40">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-base text-white">
              Progress to Level {stats.currentLevel + 1}
            </h3>
            <span className="text-xs font-black text-indigo-300">
              {Math.min(Math.round(xpProgress), 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 mb-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-3 rounded-full transition-all"
              style={{ width: `${Math.min(xpProgress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">
            {xpIntoLevel} / {xpForLevel} XP ({Math.max(xpForLevel - xpIntoLevel, 0)} XP needed for Level {stats.currentLevel + 1})
          </p>
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-xl text-white flex items-center gap-2">
              <span>🚀</span> Explore & Practice Tracks
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.page}
                onClick={() => navigate(action.page)}
                className="relative bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 text-left transition-all hover:-translate-y-1 shadow-lg shadow-slate-950/40 group overflow-hidden cursor-pointer"
              >
                <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${action.accent}`} />
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 shrink-0 flex items-center justify-center text-2xl rounded-xl bg-slate-800 border border-slate-700/60 group-hover:scale-110 group-hover:border-indigo-500/40 transition">
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-white group-hover:text-indigo-300 transition text-sm truncate">
                        {action.title}
                      </p>
                      {action.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {action.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {action.desc}
                    </p>
                  </div>
                  <span className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition font-bold text-sm">
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* EDUCATOR ACTIONS */}
        {(user?.role === 'ADMIN' || user?.role === 'EDUCATOR') && (
          <section>
            <h3 className="font-black text-xl text-white mb-4 flex items-center gap-2">
              <span>🛠️</span> Educator & Admin Tools
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ADMIN_ACTIONS.map((action) => (
                <button
                  key={action.page}
                  onClick={() => navigate(action.page)}
                  className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 text-left transition hover:-translate-y-0.5 cursor-pointer flex items-center gap-3.5 group shadow-lg shadow-slate-950/40"
                >
                  <div className="w-11 h-11 shrink-0 flex items-center justify-center text-xl bg-slate-800 border border-slate-700/60 rounded-xl group-hover:border-indigo-500/40 transition">
                    {action.icon}
                  </div>
                  <div>
                    <p className="font-black text-white text-sm group-hover:text-indigo-300 transition">
                      {action.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* RECENT ACHIEVEMENTS */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg shadow-slate-950/40">
          <h3 className="font-black text-lg text-white mb-4 flex items-center gap-2">
            <span>✨</span> Recent Achievements Unlocked
          </h3>
          {recentAchievements.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">🎯</div>
              <p className="text-slate-300 font-bold text-sm">No achievements unlocked yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Solve problems and play learning games to unlock trophies!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentAchievements.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center p-4 bg-slate-800/60 border border-amber-500/30 rounded-2xl shadow-md"
                >
                  <span className="text-3xl mr-3">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{a.name}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </FullScreenShell>
  );
};
export default DashboardPage;
