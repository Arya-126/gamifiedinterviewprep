import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  level: number;
  xpTotal: number;
  streakDays: number;
}

interface DashboardPageProps {
  user: User;
  setCurrentPage: (page: string) => void;
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
  'Grandmaster'
];

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, setCurrentPage }) => {
  const [userStats, setUserStats] = useState(user);
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    totalXp: user.xpTotal,
    currentLevel: user.level,
    nextLevelXp: LEVEL_THRESHOLDS[user.level] || 0,
    currentLevelXp: LEVEL_THRESHOLDS[user.level - 1] || 0
  });

  useEffect(() => {
    setStats({
      gamesPlayed: 0,
      totalXp: user.xpTotal,
      currentLevel: user.level,
      nextLevelXp: LEVEL_THRESHOLDS[user.level] || 0,
      currentLevelXp: LEVEL_THRESHOLDS[user.level - 1] || 0
    });
  }, [user]);

  const xpProgress = ((stats.totalXp - stats.currentLevelXp) / (stats.nextLevelXp - stats.currentLevelXp)) * 100;
  const levelName = LEVEL_NAMES[stats.currentLevel - 1] || 'Unknown';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-8 rounded-lg shadow-lg mb-6">
        <h2 className="text-3xl font-bold mb-2">Welcome, {user.name}! 👋</h2>
        <p className="text-blue-100">Keep learning and climbing the leaderboard!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Level Card */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-2">Current Level</p>
            <p className="text-5xl font-bold text-indigo-600 mb-2">{stats.currentLevel}</p>
            <p className="text-lg text-gray-700 font-semibold">{levelName}</p>
          </div>
        </div>

        {/* XP Card */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-2">Total XP</p>
            <p className="text-4xl font-bold text-green-600 mb-2">{stats.totalXp}</p>
            <p className="text-xs text-gray-500">
              {stats.totalXp - stats.currentLevelXp} / {stats.nextLevelXp - stats.currentLevelXp}
            </p>
          </div>
        </div>

        {/* Streak Card */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-2">Daily Streak</p>
            <p className="text-5xl font-bold text-orange-600 mb-2">{user.streakDays}</p>
            <p className="text-sm text-gray-700">🔥 days</p>
          </div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
        <h3 className="font-bold text-lg mb-3">Progress to Next Level</h3>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div
            className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all"
            style={{ width: `${Math.min(xpProgress, 100)}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600">
          {stats.totalXp - stats.currentLevelXp} / {stats.nextLevelXp - stats.currentLevelXp} XP
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setCurrentPage('search')}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition transform hover:scale-105"
        >
          🎮 Play Game
        </button>
        <button
          className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition transform hover:scale-105"
          disabled
        >
          📊 View Mastery (Coming Soon)
        </button>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="font-bold text-xl mb-4">📈 Your Journey</h3>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-blue-50 rounded">
            <span className="text-2xl mr-3">🎮</span>
            <div className="flex-1">
              <p className="font-semibold">Started your learning journey</p>
              <p className="text-sm text-gray-600">Ready to earn XP!</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-gray-50 rounded opacity-50">
            <span className="text-2xl mr-3">🏆</span>
            <div className="flex-1">
              <p className="font-semibold">First topic mastered</p>
              <p className="text-sm text-gray-600">Complete 3 games on a topic</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-gray-50 rounded opacity-50">
            <span className="text-2xl mr-3">🔥</span>
            <div className="flex-1">
              <p className="font-semibold">7-day streak</p>
              <p className="text-sm text-gray-600">Play for 7 days straight</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
