import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface TopicData {
  id: string;
  name: string;
  slug: string;
  questionCount: number;
  hasTheory: boolean;
  progress: {
    gamesPlayed: number;
    bestScore: number;
    avgScore: number;
    totalXp: number;
  };
}

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  topics: TopicData[];
}

export interface InterviewCategoryProps {
  categorySlug: string;
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onSelectTheory: (topicId: string) => void;
  onSelectQuiz: (topicId: string, topicName: string) => void;
  onSelectGames: (topicId: string, topicName: string) => void;
  onBack: () => void;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const InterviewCategory: React.FC<InterviewCategoryProps> = ({
  categorySlug,
  user,
  onSelectTheory,
  onSelectQuiz,
  onSelectGames,
  onBack,
  onNavigate,
  onLogout,
}) => {
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const data = await apiClient.get<CategoryData>(`/interview/categories/${categorySlug}`);
        setCategory(data);
      } catch (e) {
        console.error('Failed to fetch category', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCategory();
  }, [categorySlug]);

  const nav = onNavigate || (() => {});

  if (loading) {
    return (
      <FullScreenShell
        title="Loading Category…"
        subtitle="Aptitude topic list"
        icon="🧮"
        currentPage="interview-category"
        user={user}
        onNavigate={nav}
        onBack={onBack}
        onLogout={onLogout}
      >
        <div className="flex flex-col items-center justify-center p-16 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          <p className="text-xs text-slate-400 font-bold">Loading topic modules…</p>
        </div>
      </FullScreenShell>
    );
  }

  if (!category) {
    return (
      <FullScreenShell
        title="Category Not Found"
        subtitle="Aptitude topic list"
        icon="⚠️"
        currentPage="interview-category"
        user={user}
        onNavigate={nav}
        onBack={onBack}
        onLogout={onLogout}
      >
        <div className="text-center py-16 text-rose-400 font-bold">Category not found</div>
      </FullScreenShell>
    );
  }

  return (
    <FullScreenShell
      title={category.name}
      subtitle={category.description}
      icon={category.icon || '🧮'}
      currentPage="interview-category"
      user={user}
      onNavigate={nav}
      onBack={onBack}
      onLogout={onLogout}
    >
      <div className="flex flex-col gap-6">
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-slate-900/70 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-md shadow-2xl flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-4xl shrink-0">
            {category.icon}
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black mb-2">
              <span>📚</span> {category.topics.length} CURATED TOPICS
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{category.name}</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed max-w-2xl">
              {category.description}
            </p>
          </div>
        </div>

        {/* TOPIC CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {category.topics.map((topic) => (
            <div
              key={topic.id}
              className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-indigo-500/50 p-6 shadow-lg shadow-slate-950/40 flex flex-col justify-between hover:-translate-y-1 transition group"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-black text-white group-hover:text-indigo-300 transition">
                    {topic.name}
                  </h3>
                  <span className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2">
                    {topic.questionCount} Qs
                  </span>
                </div>

                <div className="text-xs text-slate-400 mb-5 space-y-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <span>Best Score</span>
                    <span className="font-bold text-emerald-400">{topic.progress.bestScore}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Sessions Played</span>
                    <span className="font-bold text-white">{topic.progress.gamesPlayed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total XP Earned</span>
                    <span className="font-bold text-indigo-400">+{topic.progress.totalXp} XP</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => onSelectTheory(topic.id)}
                  disabled={!topic.hasTheory}
                  className={`flex-1 py-2 px-2 rounded-xl font-bold text-xs text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                    topic.hasTheory
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 hover:text-white'
                      : 'bg-slate-800 text-slate-500 border border-slate-700/40 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span>📖</span> Study
                </button>
                <button
                  onClick={() => onSelectGames(topic.id, topic.name)}
                  disabled={!topic.hasTheory}
                  className={`flex-1 py-2 px-2 rounded-xl font-bold text-xs text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                    topic.hasTheory
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 hover:text-white'
                      : 'bg-slate-800 text-slate-500 border border-slate-700/40 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span>⚡</span> Games
                </button>
                <button
                  onClick={() => onSelectQuiz(topic.id, topic.name)}
                  disabled={topic.questionCount === 0}
                  className={`flex-1 py-2 px-2 rounded-xl font-bold text-xs text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                    topic.questionCount > 0
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-md shadow-emerald-900/40'
                      : 'bg-slate-800 text-slate-500 border border-slate-700/40 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span>🎮</span> Quiz
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FullScreenShell>
  );
};
export default InterviewCategory;
