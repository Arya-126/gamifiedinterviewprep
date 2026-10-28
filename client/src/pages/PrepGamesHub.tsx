import React, { useState, useEffect } from 'react';

export interface PrepGamesHubProps {
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onOpen: (key: 'complexity-sort' | 'time-rush' | 'star-roleplay' | 'bug-hunt' | 'dry-run' | 'sql-puzzle' | 'diagram-labeler') => void;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
}

interface GameItem {
  key: 'complexity-sort' | 'time-rush' | 'star-roleplay' | 'bug-hunt' | 'dry-run' | 'sql-puzzle' | 'diagram-labeler';
  icon: string;
  title: string;
  desc: string;
  category: 'DSA' | 'HR' | 'SQL' | 'SYSTEMS' | 'SPEED';
  categoryLabel: string;
  duration: string;
  xpReward: number;
  color: string;
  bgGlow: string;
  borderColor: string;
  skills: string[];
}

const PREP_GAMES: GameItem[] = [
  {
    key: 'complexity-sort',
    icon: '📊',
    title: 'Complexity Sort',
    desc: 'Drag & order classic algorithms by Big-O asymptotic growth rate (O(1) through O(n!)).',
    category: 'DSA',
    categoryLabel: 'DSA & Algorithms',
    duration: '2 min',
    xpReward: 35,
    color: 'from-indigo-500 via-purple-500 to-violet-600',
    bgGlow: 'hover:shadow-indigo-500/20',
    borderColor: 'border-indigo-500/30 hover:border-indigo-500/60',
    skills: ['Big-O', 'Asymptotics', 'Sorting Algos', 'Graph Search'],
  },
  {
    key: 'time-rush',
    icon: '⏱️',
    title: 'Time Rush Sprint',
    desc: 'Rapid-fire 60-second flashcard sprint covering high-frequency placement theory and formulas.',
    category: 'SPEED',
    categoryLabel: 'Speed & Recall',
    duration: '60 sec',
    xpReward: 40,
    color: 'from-amber-500 via-orange-500 to-rose-600',
    bgGlow: 'hover:shadow-amber-500/20',
    borderColor: 'border-amber-500/30 hover:border-amber-500/60',
    skills: ['Rapid Recall', 'Formulas', 'CS Fundamentals'],
  },
  {
    key: 'bug-hunt',
    icon: '🐛',
    title: 'Bug Hunt',
    desc: 'Scan real code snippets under time pressure to isolate off-by-one errors and memory leaks.',
    category: 'DSA',
    categoryLabel: 'Code Review',
    duration: '2 min',
    xpReward: 50,
    color: 'from-rose-500 via-red-500 to-pink-600',
    bgGlow: 'hover:shadow-rose-500/20',
    borderColor: 'border-rose-500/30 hover:border-rose-500/60',
    skills: ['Code Debugging', 'Boundary Cases', 'Pointer Math'],
  },
  {
    key: 'dry-run',
    icon: '🔍',
    title: 'Dry-Run Simulator',
    desc: 'Trace stack frames, recursive calls, and array mutations in your head to deduce the exact stdout.',
    category: 'DSA',
    categoryLabel: 'Mental Execution',
    duration: '3 min',
    xpReward: 45,
    color: 'from-emerald-500 via-teal-500 to-cyan-600',
    bgGlow: 'hover:shadow-emerald-500/20',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
    skills: ['Stack Tracing', 'Recursion', 'Memory State'],
  },
  {
    key: 'sql-puzzle',
    icon: '🗄️',
    title: 'SQL Query Puzzle',
    desc: 'Solve database challenges with JOINs, GROUP BY, and window functions on real sample tables.',
    category: 'SQL',
    categoryLabel: 'Databases & SQL',
    duration: '3 min',
    xpReward: 45,
    color: 'from-cyan-500 via-blue-500 to-indigo-600',
    bgGlow: 'hover:shadow-cyan-500/20',
    borderColor: 'border-cyan-500/30 hover:border-cyan-500/60',
    skills: ['JOINs', 'Aggregations', 'Subqueries', 'Indexing'],
  },
  {
    key: 'diagram-labeler',
    icon: '📐',
    title: 'Diagram Labeler',
    desc: 'Visually label OSI 7 layers, TCP 3-way handshakes, DB indexes, and ER cardinalities.',
    category: 'SYSTEMS',
    categoryLabel: 'Computer Networks & OS',
    duration: '2 min',
    xpReward: 35,
    color: 'from-violet-500 via-purple-500 to-fuchsia-600',
    bgGlow: 'hover:shadow-violet-500/20',
    borderColor: 'border-violet-500/30 hover:border-violet-500/60',
    skills: ['OSI Model', 'TCP/IP', 'B-Trees', 'Process States'],
  },
  {
    key: 'star-roleplay',
    icon: '🗣️',
    title: 'STAR Roleplay',
    desc: 'Master behavioral rounds by selecting winning Situation, Task, Action, and Result responses.',
    category: 'HR',
    categoryLabel: 'HR & Behavioral',
    duration: '3 min',
    xpReward: 30,
    color: 'from-fuchsia-500 via-pink-500 to-rose-600',
    bgGlow: 'hover:shadow-fuchsia-500/20',
    borderColor: 'border-fuchsia-500/30 hover:border-fuchsia-500/60',
    skills: ['Conflict Resolution', 'Leadership', 'Communication'],
  },
];

const CONCEPT_ARCADE_GAMES = [
  { icon: '🃏', name: 'Memory Match', desc: 'Flip and pair definitions with terms', path: 'domains' },
  { icon: '🔤', name: 'Word Scramble', desc: 'Unscramble core computer science vocabulary', path: 'domains' },
  { icon: '🧩', name: 'Crossword', desc: 'Solve placement aptitude & tech crosswords', path: 'domains' },
  { icon: '🎯', name: 'Hangman', desc: 'Guess the algorithm name letter-by-letter', path: 'domains' },
  { icon: '🚀', name: 'Concept Cannon', desc: 'Aim and fire at the right data structures', path: 'domains' },
];

import { FullScreenShell } from '../components/FullScreenShell';

export const PrepGamesHub: React.FC<PrepGamesHubProps> = ({
  user,
  onOpen,
  onNavigate,
  onLogout,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'DSA' | 'SPEED' | 'HR' | 'SQL' | 'SYSTEMS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGames = PREP_GAMES.filter((g) => {
    const matchesCategory = selectedCategory === 'ALL' || g.category === selectedCategory;
    const matchesQuery =
      searchQuery.trim() === '' ||
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  return (
    <FullScreenShell
      title="Learning Games Hub"
      subtitle="Gamified practice & interactive concept training"
      icon="🎮"
      currentPage="prep-games"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
      contentClassName="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6"
    >
        {/* HERO BANNER */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-slate-900/70 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-extrabold mb-3">
                <span>🚀</span> Interactive Placement Drills
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Welcome back,{' '}
                <span className="bg-gradient-to-r from-indigo-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                  {user?.name || 'Explorer'}
                </span>
                !
              </h2>
              <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
                Sharpen your Big-O instincts, sprint through formula recall, trace pointer execution, and master STAR interview patterns through quick interactive challenges.
              </p>
            </div>

            {/* Quick stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto shrink-0">
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl text-center">
                <span className="text-xl">🎮</span>
                <div className="text-lg font-black text-white mt-1">7 + 5</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Games</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl text-center">
                <span className="text-xl">🔥</span>
                <div className="text-lg font-black text-amber-400 mt-1">{user?.streakDays || 1} Day</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Streak</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl text-center col-span-2 sm:col-span-1">
                <span className="text-xl">⚡</span>
                <div className="text-lg font-black text-emerald-400 mt-1">{user?.xpTotal || 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total XP</div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTROLS: CATEGORY TABS & SEARCH */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: 'All Games', icon: '✨' },
              { id: 'DSA', label: 'DSA & Code', icon: '💻' },
              { id: 'SPEED', label: 'Speed Recall', icon: '⏱️' },
              { id: 'HR', label: 'Behavioral & STAR', icon: '🗣️' },
              { id: 'SQL', label: 'Databases & SQL', icon: '🗄️' },
              { id: 'SYSTEMS', label: 'Networks & OS', icon: '📐' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === tab.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative min-w-[220px]">
            <input
              type="text"
              placeholder="Search games or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900/90 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
          </div>
        </section>

        {/* GAMES GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGames.map((g) => (
            <div
              key={g.key}
              className={`group relative flex flex-col justify-between bg-slate-900/90 rounded-2xl border ${g.borderColor} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${g.bgGlow} overflow-hidden backdrop-blur-sm`}
            >
              {/* Subtle gradient corner highlight */}
              <div
                className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${g.color} opacity-10 group-hover:opacity-25 blur-xl transition-all duration-500 pointer-events-none`}
              />

              <div>
                {/* Card Top Pill: Category + Duration */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full bg-gradient-to-r ${g.color} text-white text-[10px] font-black uppercase tracking-wider shadow-sm`}
                  >
                    {g.categoryLabel}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                    <span>⏱️ {g.duration}</span>
                    <span className="text-emerald-400 font-bold">+{g.xpReward} XP</span>
                  </div>
                </div>

                {/* Icon & Title */}
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="text-3xl sm:text-4xl transform group-hover:scale-110 transition-transform">
                    {g.icon}
                  </div>
                  <h3 className="font-black text-white text-lg sm:text-xl group-hover:text-indigo-300 transition-colors">
                    {g.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed mb-4">
                  {g.desc}
                </p>

                {/* Skills tags */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {g.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 text-[10px] font-medium bg-slate-800/80 text-slate-300 rounded-md border border-slate-700/60"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Play Button */}
              <button
                onClick={() => onOpen(g.key)}
                className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm text-white bg-gradient-to-r ${g.color} hover:brightness-110 active:scale-98 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer group-hover:shadow-lg`}
              >
                <span>Play Challenge</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </button>
            </div>
          ))}
        </section>

        {filteredGames.length === 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <span className="text-3xl block mb-2">🔍</span>
            <p className="font-bold">No games matched your search criteria.</p>
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              className="mt-3 text-xs text-indigo-400 hover:underline font-semibold"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* CONCEPT & ARCADE GAMES SECTION */}
        <section className="mt-4 rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>🕹️</span> Domain Learning Arcade & Vocabulary Games
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Practice specific domain concepts through memory matching, crosswords, and word scrambles.
              </p>
            </div>
            <button
              onClick={() => onNavigate('domains')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 transition active:scale-95 cursor-pointer"
            >
              Explore All 8 Domains →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {CONCEPT_ARCADE_GAMES.map((cg) => (
              <button
                key={cg.name}
                onClick={() => onNavigate(cg.path)}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/40 transition-all text-center group active:scale-95"
              >
                <span className="text-3xl mb-1.5 transform group-hover:scale-110 transition-transform">
                  {cg.icon}
                </span>
                <span className="text-xs font-black text-slate-200 group-hover:text-white">
                  {cg.name}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                  {cg.desc}
                </span>
              </button>
            ))}
          </div>
        </section>
    </FullScreenShell>
  );
};

