import React, { useState, useEffect } from 'react';

export interface FullScreenShellProps {
  /** Page title shown in the header */
  title: string;
  /** Optional subtitle below title */
  subtitle?: string;
  /** Optional emoji or icon next to title (defaults to 🚀) */
  icon?: string | React.ReactNode;
  /** Current page slug — highlights the correct item in the slide-out drawer */
  currentPage: string;
  /** User object for avatar/stats display */
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  /** Navigate to any page */
  onNavigate: (page: string) => void;
  /** Optional logout handler */
  onLogout?: () => void;
  /** Optional back button handler */
  onBack?: () => void;
  /** Optional custom elements to place in the header */
  headerActions?: React.ReactNode;
  /** Custom class for the main wrapper (default: max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8) */
  contentClassName?: string;
  /** Page content */
  children: React.ReactNode;
}

interface NavMenuCategory {
  title: string;
  items: { icon: string; label: string; page: string; badge?: string }[];
}

export const FullScreenShell: React.FC<FullScreenShellProps> = ({
  title,
  subtitle,
  icon = '✨',
  currentPage,
  user,
  onNavigate,
  onLogout,
  onBack,
  headerActions,
  contentClassName,
  children,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreenMode(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreenMode(false);
    }
  };

  const navCategories: NavMenuCategory[] = [
    {
      title: 'Primary Navigation',
      items: [
        { icon: '🎯', label: 'My Pipeline', page: 'pipeline', badge: 'Active' },
        { icon: '🏠', label: 'Home', page: 'interview-home' },
        { icon: '🎮', label: 'Learning Games', page: 'prep-games' },
      ],
    },
    {
      title: 'Practice & Preparation',
      items: [
        { icon: '💻', label: 'Coding Tracks', page: 'coding-tracks', badge: '70+ Problems' },
        { icon: '🧮', label: 'Aptitude Hub', page: 'interview-hub' },
        { icon: '📚', label: 'Core CS Drills', page: 'core-cs-hub' },
        { icon: '🏢', label: 'Companies & Mock Tests', page: 'assessments' },
        { icon: '🗣️', label: 'HR & Behavioral', page: 'hr-prep' },
        { icon: '🤖', label: 'AI Video Interview', page: 'ai-interview' },
        { icon: '🚀', label: 'Placement Drive Wizard', page: 'placement-drive' },
        { icon: '🩺', label: 'Skill Diagnostic Test', page: 'diagnostic-intro' },
      ],
    },
    {
      title: 'Gamification & Compete',
      items: [
        { icon: '🎯', label: 'Active Quests', page: 'quests-hub' },
        { icon: '🏁', label: 'Live Contests', page: 'contests' },
        { icon: '📊', label: 'Global Leaderboard', page: 'leaderboard' },
        { icon: '🏆', label: 'Trophy Room (Achievements)', page: 'achievements' },
        { icon: '📈', label: 'Prep Analytics Tracker', page: 'prep-tracker' },
        { icon: '📝', label: 'Reports & Test Analysis', page: 'reports' },
      ],
    },
    {
      title: 'Domain Learning Arcade',
      items: [
        { icon: '🚀', label: '8 Learning Domains', page: 'domains' },
        { icon: '🕹️', label: 'Classic Game Arcade', page: 'dashboard' },
      ],
    },
  ];

  if (user?.role === 'ADMIN' || user?.role === 'EDUCATOR') {
    navCategories.push({
      title: 'Admin Management',
      items: [
        { icon: '🔍', label: 'Question Review Queue', page: 'review-queue' },
        { icon: '🛠️', label: 'Test Builder', page: 'test-builder' },
        { icon: '📈', label: 'Admin Reports', page: 'admin-reports' },
      ],
    });
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden relative">
      {/* Background ambient glow blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[30rem] h-[30rem] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP FULLSCREEN HEADER */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-slate-900/80 border-b border-slate-800/80 px-4 sm:px-6 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left section: Hamburger menu + Back button + Title */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              title="Open Navigation Menu (All Pages)"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600/30 border border-slate-700/60 hover:border-indigo-500/50 text-slate-200 hover:text-white transition-all shadow-md group active:scale-95 flex items-center justify-center cursor-pointer"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className="w-full h-0.5 bg-current rounded-full transition-all group-hover:bg-indigo-400" />
                <span className="w-full h-0.5 bg-current rounded-full transition-all group-hover:bg-indigo-400" />
                <span className="w-full h-0.5 bg-current rounded-full transition-all group-hover:bg-indigo-400" />
              </div>
            </button>

            {onBack && (
              <button
                onClick={onBack}
                title="Go Back"
                className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <span>←</span>
                <span className="hidden md:inline">Back</span>
              </button>
            )}

            <div className="flex items-center gap-2.5">
              {icon && typeof icon === 'string' ? (
                <span className="text-2xl animate-pulse">{icon}</span>
              ) : (
                icon
              )}
              <div>
                <h1 className="text-lg sm:text-xl font-black bg-gradient-to-r from-indigo-400 via-violet-300 to-pink-400 bg-clip-text text-transparent">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-[11px] text-slate-400 hidden sm:block">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Center section: Required PIPELINE & HOME buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => onNavigate('pipeline')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                currentPage === 'pipeline'
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-900/40'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 hover:shadow-emerald-700/50'
              }`}
            >
              <span className="text-sm">🎯</span>
              <span className="hidden xs:inline">My</span> Pipeline
            </button>

            <button
              onClick={() => onNavigate('interview-home')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                currentPage === 'interview-home'
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/50 shadow-lg shadow-indigo-900/40'
                  : 'bg-slate-800 hover:bg-slate-700 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white'
              }`}
            >
              <span className="text-sm">🏠</span>
              <span>Home</span>
            </button>
          </div>

          {/* Right section: Header actions + User Stats & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {headerActions}

            {user && (
              <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5">
                <span className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 text-white text-xs font-black flex items-center justify-center">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </span>
                <span className="text-xs font-semibold text-slate-200 max-w-[100px] truncate">{user.name}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-500/30 text-indigo-300 rounded">
                  Lv {user.level || 1}
                </span>
                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                  🔥 {user.streakDays || 1}d
                </span>
                <span className="text-[10px] font-bold text-emerald-400">
                  ⚡ {user.xpTotal || 0} XP
                </span>
              </div>
            )}

            <button
              onClick={toggleBrowserFullscreen}
              title={isFullscreenMode ? 'Exit Browser Fullscreen' : 'Enter Browser Fullscreen'}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition active:scale-95 cursor-pointer"
            >
              {isFullscreenMode ? '↙️' : '⛶'}
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Logout"
                className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3-LINES SLIDE-OUT NAVIGATION DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fade-in"
          />

          {/* Drawer panel */}
          <div className="relative w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col h-full z-10 animate-slide-right">
            {/* Drawer header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{icon && typeof icon === 'string' ? icon : '⚡'}</span>
                <div>
                  <h2 className="text-base font-black text-white">Navigation Menu</h2>
                  <p className="text-[11px] text-slate-400">Select any page to jump</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick search inside menu */}
            <div className="p-3 border-b border-slate-800/60 bg-slate-900/50">
              <input
                type="text"
                placeholder="Search pages..."
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Navigation links list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {navCategories.map((cat) => {
                const filteredItems = cat.items.filter((item) =>
                  item.label.toLowerCase().includes(navSearch.toLowerCase())
                );
                if (filteredItems.length === 0) return null;

                return (
                  <div key={cat.title}>
                    <p className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {cat.title}
                    </p>
                    <div className="space-y-1">
                      {filteredItems.map((item) => {
                        const isCurrent = item.page === currentPage;
                        return (
                          <button
                            key={item.page}
                            onClick={() => {
                              setDrawerOpen(false);
                              onNavigate(item.page);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className="text-base">{item.icon}</span>
                              <span className="truncate">{item.label}</span>
                            </div>
                            {item.badge && (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold ${
                                  isCurrent
                                    ? 'bg-white/20 text-white'
                                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs">
              {user && (
                <div className="truncate text-slate-400 max-w-[180px]">
                  Logged in as <span className="font-bold text-slate-200">{user.name}</span>
                </div>
              )}
              {onLogout && (
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    onLogout();
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main page content container */}
      <main className={contentClassName ?? 'flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8'}>
        {children}
      </main>
    </div>
  );
};
