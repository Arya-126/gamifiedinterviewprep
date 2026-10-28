import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface DomainProgress {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  currentLevel: number;
  totalXpInDomain: number;
  rank: string;
  isStarted: boolean;
}

interface DomainSelectionProps {
  onSelectDomain: (slug: string) => void;
  onBack: () => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const DomainSelection: React.FC<DomainSelectionProps> = ({
  onSelectDomain,
  onBack,
  user,
  onNavigate = () => {},
  onLogout,
}) => {
  const [domains, setDomains] = useState<DomainProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchDomains = async () => {
    try {
      const response = await apiClient.get<DomainProgress[]>('/domains');
      setDomains(response);
    } catch (error) {
      console.error('Failed to load domains', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleGenerateCustom = async () => {
    if (!searchQuery.trim()) return;
    setIsGenerating(true);
    try {
      const newDomain = await apiClient.post<any>('/domains/generate', {
        name: searchQuery,
      });
      onSelectDomain(newDomain.slug);
    } catch (error) {
      console.error('Failed to generate domain:', error);
      alert('Failed to generate custom domain. Please try again.');
      setIsGenerating(false);
    }
  };

  const filteredDomains = domains.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <FullScreenShell
      title="Domain Learning"
      subtitle="Explore specialized learning tracks or generate custom curriculum"
      currentPage="domain-selection"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              🧭 Skill Domains
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Choose Your Learning Path</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Level up through structured skill trees, unlock interactive practice modules, and build verified mastery.
            </p>
          </div>
          <button
            onClick={onBack}
            className="self-start sm:self-center px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:text-white transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Search & Create Bar */}
        <div className="bg-slate-900/90 p-4 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search domains or type a custom topic to generate with AI..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchQuery.trim().length > 0 && filteredDomains.length === 0 && (
            <button
              onClick={handleGenerateCustom}
              disabled={isGenerating}
              className={`px-6 py-3 rounded-xl font-bold text-xs text-white shadow-lg transition-all whitespace-nowrap flex items-center justify-center ${
                isGenerating
                  ? 'bg-indigo-700/60 cursor-wait'
                  : 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-indigo-500/25 active:scale-95'
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span> AI is Creating Curriculum...
                </>
              ) : (
                <>✨ Generate Custom Domain</>
              )}
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 font-medium animate-pulse">
            Loading Domains...
          </div>
        ) : filteredDomains.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDomains.map((domain) => (
              <div
                key={domain.id}
                className="bg-slate-900/90 rounded-2xl shadow-xl border border-slate-800 overflow-hidden hover:border-slate-700 hover:shadow-slate-950/60 transition-all duration-300 flex flex-col cursor-pointer group"
                onClick={() => onSelectDomain(domain.slug)}
              >
                <div
                  className="h-32 p-6 flex flex-col justify-end relative overflow-hidden"
                  style={{ backgroundColor: domain.color + '22' }}
                >
                  <div
                    className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
                    style={{ backgroundColor: domain.color }}
                  />
                  <div className="text-5xl mb-1 z-10">{domain.icon}</div>
                  <h2 className="text-xl font-black z-10 text-white group-hover:text-indigo-400 transition-colors">
                    {domain.name}
                  </h2>
                </div>

                <div className="p-6 flex-grow flex flex-col">
                  <p className="text-xs text-slate-400 mb-6 flex-grow leading-relaxed">
                    {domain.description}
                  </p>

                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-slate-300">
                        Level {domain.currentLevel}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700"
                        style={{ color: domain.color }}
                      >
                        {domain.rank}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(100, (domain.currentLevel / 4) * 100)}%`,
                          backgroundColor: domain.color,
                        }}
                      />
                    </div>
                    <div className="text-right mt-1.5">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {domain.totalXpInDomain} XP
                      </span>
                    </div>
                  </div>

                  <button
                    className="w-full py-3 rounded-xl text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: domain.color }}
                  >
                    {domain.isStarted ? 'Continue Journey →' : 'Start Learning →'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-white mb-2">No matching domains found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
              We couldn't find an existing domain matching "{searchQuery}". Ask our AI curriculum engine to synthesize a complete roadmap for you right now!
            </p>
            {!isGenerating && (
              <button
                onClick={handleGenerateCustom}
                className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/25 active:scale-95 transition"
              >
                ✨ Create "{searchQuery}" Course
              </button>
            )}
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
