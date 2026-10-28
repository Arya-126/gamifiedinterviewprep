import React from 'react';
import { StatsSidebar } from '../components/StatsSidebar';
import { FullScreenShell } from '../components/FullScreenShell';

interface SectionCard {
  icon: string;
  title: string;
  desc: string;
  page: string;
  badge?: string;
  accent: string;
}

const PREP_CARDS: SectionCard[] = [
  { icon: '🧮', title: 'Aptitude Hub', desc: 'Quant, logical reasoning & verbal question banks with theory notes.', page: 'interview-hub', accent: 'from-blue-500/20 to-indigo-500/10' },
  { icon: '💻', title: 'Coding Tracks', desc: 'Topic-wise DSA tracks — arrays, graphs to dynamic programming.', page: 'coding-tracks', badge: '70+ Problems', accent: 'from-emerald-500/20 to-teal-500/10' },
  { icon: '🎮', title: 'Learning Games', desc: 'Big-O Sort, Time Rush, Bug Hunt, SQL Puzzles & interactive drills.', page: 'prep-games', badge: 'New', accent: 'from-amber-500/20 to-orange-500/10' },
  { icon: '📚', title: 'Core CS Drills', desc: 'CN, OS, DBMS & SQL subject practice & rapid theory quizzes.', page: 'core-cs-hub', accent: 'from-violet-500/20 to-purple-500/10' },
  { icon: '🎯', title: 'My Pipeline', desc: 'Curated milestone pipeline tailored to your skill gaps.', page: 'pipeline', badge: 'Recommended', accent: 'from-teal-500/20 to-cyan-500/10' },
  { icon: '🏢', title: 'Companies & Mocks', desc: 'Company-specific patterns and proctored full-length mock tests.', page: 'assessments', accent: 'from-rose-500/20 to-pink-500/10' },
  { icon: '🗣️', title: 'HR & Behavioral', desc: 'STAR-method guidance & roleplay for classic HR interview rounds.', page: 'hr-prep', accent: 'from-fuchsia-500/20 to-pink-500/10' },
  { icon: '🤖', title: 'AI Mock Interview', desc: 'Practice live with adaptive AI interviewer & instant transcript scoring.', page: 'ai-interview', badge: 'AI', accent: 'from-cyan-500/20 to-blue-500/10' },
];

const COMPETE_CARDS: SectionCard[] = [
  { icon: '🏁', title: 'Live Contests', desc: 'Timed coding & aptitude competitions against your peers.', page: 'contests', accent: 'from-indigo-500/20 to-violet-500/10' },
  { icon: '📊', title: 'Global Leaderboard', desc: 'Compare percentile and rank by XP, coding accuracy & streaks.', page: 'leaderboard', accent: 'from-purple-500/20 to-pink-500/10' },
  { icon: '🏆', title: 'Trophy Room', desc: 'Milestone badges and gamified achievements unlocked so far.', page: 'achievements', accent: 'from-amber-500/20 to-yellow-500/10' },
  { icon: '📈', title: 'Prep Tracker', desc: 'Spider-radar analytics, baseline progress & drive verdicts.', page: 'prep-tracker', accent: 'from-emerald-500/20 to-teal-500/10' },
];

const CardGrid: React.FC<{ title: string; cards: SectionCard[]; onNavigate: (page: string) => void }> = ({
  title,
  cards,
  onNavigate,
}) => (
  <div className="mb-8">
    <div className="flex items-center justify-between mb-3.5">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
        {title}
      </p>
    </div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <button
          key={card.page}
          onClick={() => onNavigate(card.page)}
          className="relative bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-indigo-500/50 shadow-lg shadow-slate-950/40 p-5 text-left hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all group overflow-hidden cursor-pointer flex flex-col justify-between"
        >
          {/* Subtle background glow */}
          <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${card.accent} rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform`} />

          <div>
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:border-indigo-500/40 transition">
                {card.icon}
              </div>
              {card.badge && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {card.badge}
                </span>
              )}
            </div>
            <h3 className="font-black text-white group-hover:text-indigo-300 transition text-base">
              {card.title}
            </h3>
            <p className="text-xs text-slate-400 group-hover:text-slate-300 mt-1.5 leading-relaxed line-clamp-2">
              {card.desc}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-indigo-300">
            <span>Launch Track</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </div>
        </button>
      ))}
    </div>
  </div>
);

export interface InterviewHomeProps {
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  userName?: string;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
}

export const InterviewHome: React.FC<InterviewHomeProps> = ({
  user,
  userName,
  onNavigate,
  onLogout,
}) => {
  const displayName = user?.name || userName || 'Explorer';

  return (
    <FullScreenShell
      title="Placement Preparation"
      subtitle="Curated interview tracks, aptitude drills & AI mock interviews"
      icon="🚀"
      currentPage="interview-home"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
          {/* HERO BANNER */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/50 to-slate-900/80 border border-indigo-500/30 p-6 sm:p-8 backdrop-blur-md shadow-2xl mb-8">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black mb-3">
                <span>⚡</span> PLACEMENT READINESS SYSTEM
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
                Crack your dream placement,{' '}
                <span className="bg-gradient-to-r from-indigo-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                  {displayName}
                </span>{' '}
                🚀
              </h1>
              <p className="text-sm sm:text-base text-slate-300 font-normal max-w-2xl leading-relaxed">
                Aptitude drills, coding tracks, gamified practice, company mocks, and AI-powered voice interviews — everything you need to clear all rounds with distinction.
              </p>

              <div className="flex flex-wrap gap-3 mt-6">
                <button
                  onClick={() => onNavigate('pipeline')}
                  className="px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 transition shadow-lg shadow-emerald-900/40 active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <span>🎯</span> Continue My Pipeline
                </button>
                <button
                  onClick={() => onNavigate('placement-drive')}
                  className="px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-900/40 active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <span>🚀</span> Mock Placement Drive
                </button>
                <button
                  onClick={() => onNavigate('prep-games')}
                  className="px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm bg-slate-800 text-slate-200 border border-slate-700/80 hover:bg-slate-700 hover:text-white transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <span>🎮</span> Learning Games
                </button>
                <button
                  onClick={() => onNavigate('ai-interview')}
                  className="px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm bg-violet-600/30 text-violet-300 border border-violet-500/40 hover:bg-violet-600/50 hover:text-white transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <span>🤖</span> AI Mock Interview
                </button>
              </div>
            </div>
          </div>

          <CardGrid title="Prepare & Master" cards={PREP_CARDS} onNavigate={onNavigate} />
          <CardGrid title="Gamification & Compete" cards={COMPETE_CARDS} onNavigate={onNavigate} />
        </div>

        {/* Stats Sidebar */}
        <div className="w-full lg:w-72 shrink-0">
          <StatsSidebar />
        </div>
      </div>
    </FullScreenShell>
  );
};
export default InterviewHome;
