import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface CategoryStats {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  topicCount: number;
  userProgress: {
    totalXp: number;
    avgScore: number;
    topicsStarted: number;
  };
}

export interface InterviewHubProps {
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onSelectCategory: (slug: string) => void;
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const InterviewHub: React.FC<InterviewHubProps> = ({
  user,
  onSelectCategory,
  onBack,
  onNavigate,
  onLogout,
}) => {
  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await apiClient.get<CategoryStats[]>('/interview/categories');
        setCategories(data);
      } catch (e) {
        console.error('Failed to fetch interview categories', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const nav = onNavigate || (() => {});

  const categoryGradients: Record<string, string> = {
    quantitative: 'from-blue-600/40 via-indigo-600/30 to-slate-900',
    logical: 'from-emerald-600/40 via-teal-600/30 to-slate-900',
    verbal: 'from-purple-600/40 via-fuchsia-600/30 to-slate-900',
  };

  return (
    <FullScreenShell
      title="Aptitude & Reasoning Hub"
      subtitle="Quantitative aptitude, logical reasoning & verbal ability banks with notes"
      icon="🧮"
      currentPage="interview-hub"
      user={user}
      onNavigate={nav}
      onBack={onBack}
      onLogout={onLogout}
    >
      <div className="flex flex-col gap-6">
        {/* HERO INTRO */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-slate-900/70 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black mb-3">
              <span>🎯</span> Placement Aptitude Drills
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Aptitude, Reasoning & Verbal Tracks
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
              Master the high-weightage placement rounds with curated topic-wise questions, step-by-step theory notes, quick formula flashcards, and speed quizzes.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            <p className="text-xs text-slate-400 font-bold">Loading aptitude categories...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((category) => {
              const bgGradient =
                categoryGradients[category.slug.toLowerCase()] ||
                'from-indigo-600/40 via-violet-600/30 to-slate-900';

              return (
                <div
                  key={category.id}
                  onClick={() => onSelectCategory(category.slug)}
                  className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-indigo-500/50 overflow-hidden shadow-lg shadow-slate-950/40 hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className={`h-36 bg-gradient-to-br ${bgGradient} border-b border-slate-800/80 flex items-center justify-center relative overflow-hidden`}>
                      <span className="text-6xl group-hover:scale-110 transition-transform">{category.icon}</span>
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-slate-900/70 border border-slate-700/60 text-[10px] font-bold text-slate-300">
                        {category.topicCount} Topics
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="text-xl font-black text-white group-hover:text-indigo-300 transition mb-2">
                        {category.name}
                      </h3>
                      <p className="text-slate-400 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-5">
                        {category.description}
                      </p>

                      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Topics Available</span>
                          <span className="font-bold text-white">{category.topicCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Topics Practiced</span>
                          <span className="font-bold text-indigo-400">{category.userProgress.topicsStarted}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Average Accuracy</span>
                          <span className="font-bold text-emerald-400">{category.userProgress.avgScore}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-5 pt-0">
                    <button
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600/30 border border-slate-700/80 hover:border-indigo-500/50 text-slate-200 hover:text-white font-bold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Explore Topics</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
export default InterviewHub;
