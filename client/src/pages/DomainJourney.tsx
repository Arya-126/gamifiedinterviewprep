import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface TopicNode {
  id: string;
  topic: string;
  subtopic: string;
  levelOrder: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  bestScore: number;
  gamesPlayed: number;
}

interface DomainData {
  domain: {
    id: string;
    name: string;
    color: string;
    description: string;
  };
  progress: {
    currentLevel: number;
    totalXpInDomain: number;
    rank: string;
  };
  topics: TopicNode[];
}

interface DomainJourneyProps {
  domainSlug: string;
  onSelectTopic: (topicId: string, topicName: string) => void;
  onLearnConcept: (topicId: string) => void;
  onBack: () => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const DomainJourney: React.FC<DomainJourneyProps> = ({
  domainSlug,
  onSelectTopic,
  onLearnConcept,
  onBack,
  user,
  onNavigate = () => {},
  onLogout,
}) => {
  const [data, setData] = useState<DomainData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get<DomainData>(`/domains/${domainSlug}`);
        setData(response);
      } catch (error) {
        console.error('Failed to load journey', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [domainSlug]);

  if (loading || !data) {
    return (
      <FullScreenShell
        title="Domain Roadmap"
        currentPage="domain-journey"
        user={user}
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        <div className="text-center py-20 text-slate-500 font-medium animate-pulse">
          Loading Journey...
        </div>
      </FullScreenShell>
    );
  }

  const levels = [1, 2, 3, 4];
  const topicsByLevel = levels.reduce((acc, level) => {
    acc[level] = data.topics.filter((t) => t.levelOrder === level);
    return acc;
  }, {} as Record<number, TopicNode[]>);

  const { domain, progress } = data;

  return (
    <FullScreenShell
      title={`${domain.name} Journey`}
      subtitle={domain.description}
      currentPage="domain-journey"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Banner */}
        <div
          className="bg-slate-900/90 rounded-2xl shadow-xl p-6 border border-slate-800 border-t-4"
          style={{ borderTopColor: domain.color }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <button
                onClick={onBack}
                className="text-xs font-bold text-slate-400 hover:text-white mb-2 flex items-center gap-1 transition"
              >
                ← Back to Domains
              </button>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{domain.name} Journey</h1>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">{domain.description}</p>
            </div>
            <div className="text-left sm:text-right bg-slate-950/60 p-4 rounded-xl border border-slate-800 self-stretch sm:self-auto">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Current Rank
              </div>
              <div className="text-2xl font-black" style={{ color: domain.color }}>
                {progress.rank}
              </div>
              <div className="text-xs font-mono text-slate-400">{progress.totalXpInDomain} XP</div>
            </div>
          </div>
        </div>

        {/* Skill Tree */}
        <div className="relative">
          {/* Vertical connecting line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-800 transform -translate-x-1/2 z-0" />

          {levels.map((level) => {
            const topics = topicsByLevel[level] || [];
            if (topics.length === 0) return null;

            const isLevelUnlocked = level <= progress.currentLevel;
            const isCurrentLevel = level === progress.currentLevel;

            return (
              <div key={level} className="relative z-10 mb-14">
                <div className="flex justify-center mb-6">
                  <span
                    className={`px-6 py-2 rounded-full font-bold text-xs shadow-lg border ${
                      isLevelUnlocked
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                    style={{
                      borderColor: isLevelUnlocked ? domain.color : undefined,
                      color: isCurrentLevel ? domain.color : undefined,
                    }}
                  >
                    Level {level}
                  </span>
                </div>

                <div className="flex flex-wrap justify-center gap-6">
                  {topics.map((topic) => (
                    <div
                      key={topic.id}
                      className={`w-72 bg-slate-900/95 rounded-2xl shadow-xl border p-5 transition-all ${
                        topic.isUnlocked
                          ? 'border-slate-800 hover:border-slate-700 hover:shadow-slate-950/60'
                          : 'opacity-50 grayscale cursor-not-allowed border-slate-800/60 bg-slate-950/80'
                      }`}
                      style={{
                        borderColor:
                          topic.isCompleted
                            ? '#10b981'
                            : topic.isUnlocked
                            ? domain.color + '66'
                            : undefined,
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-base leading-tight text-white">{topic.subtopic}</h3>
                        {topic.isCompleted ? (
                          <span className="text-xl" title="Completed">
                            ✅
                          </span>
                        ) : !topic.isUnlocked ? (
                          <span className="text-xl" title="Locked">
                            🔒
                          </span>
                        ) : (
                          <span className="text-xl animate-pulse" title="In Progress">
                            🔓
                          </span>
                        )}
                      </div>

                      {topic.isUnlocked ? (
                        <div className="text-xs text-slate-400 mb-4 space-y-1">
                          <div>
                            Best Score:{' '}
                            <span className="font-mono font-bold text-slate-200">
                              {topic.bestScore}%
                            </span>
                          </div>
                          <div>Attempts: {topic.gamesPlayed}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 mb-4 italic">
                          Complete Level {level - 1} to unlock
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        {topic.levelOrder >= 3 && topic.isUnlocked && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onLearnConcept(topic.id);
                            }}
                            className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold rounded-xl border border-amber-500/30 text-xs transition"
                          >
                            📖 Read Tutorial
                          </button>
                        )}
                        <button
                          disabled={!topic.isUnlocked}
                          onClick={() => onSelectTopic(topic.id, topic.subtopic)}
                          className={`w-full py-2.5 font-bold rounded-xl text-xs text-white shadow-md transition active:scale-95 ${
                            !topic.isUnlocked ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : ''
                          }`}
                          style={{
                            backgroundColor: topic.isUnlocked ? domain.color : undefined,
                          }}
                        >
                          {topic.isUnlocked ? '🎮 Play Games' : 'Locked'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </FullScreenShell>
  );
};
