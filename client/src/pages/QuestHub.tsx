import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface Milestone {
  step: number;
  text: string;
  completed: boolean;
}

interface Quest {
  id: string;
  title: string;
  category: string;
  description: string;
  milestones: Milestone[];
  xpReward: number;
  status: string;
  createdAt: string;
}

interface QuestHubProps {
  user?: any;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
}

export const QuestHub: React.FC<QuestHubProps> = ({ user, onNavigate, onLogout }) => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuests = async () => {
    try {
      const res = await apiClient.get<{ quests: Quest[] }>('/quests/active');
      setQuests(res.quests || []);
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, []);

  const toggleMilestone = async (questId: string, stepNum: number) => {
    try {
      const updated = await apiClient.post<Quest>(`/quests/${questId}/milestone/${stepNum}`, {});
      setQuests((prev) => prev.map((q) => (q.id === questId ? updated : q)));
    } catch {
      alert('Failed to update milestone');
    }
  };

  return (
    <FullScreenShell
      title="Diagnostic Quests"
      subtitle="Personalized learning paths generated from your AI mock interview weak areas"
      currentPage="quest-hub"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
              🎯 Personalized Growth
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Active Diagnostic Quests</h1>
            <p className="text-sm text-slate-400 mt-1">
              Targeted milestones generated from your mock interview weak areas. Complete them to earn bonus XP and mastery!
            </p>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="self-start sm:self-center px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 hover:text-white transition flex items-center gap-1.5"
          >
            ← Back to Dashboard
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 animate-pulse font-medium">
            Loading your learning quests…
          </div>
        ) : quests.length === 0 ? (
          <div className="bg-slate-900/90 p-12 rounded-2xl shadow-xl text-center border border-slate-800">
            <div className="text-5xl mb-4">✨</div>
            <h3 className="font-black text-xl text-white mb-2">No Active Quests Yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
              Take an HR, Technical, or Coding mock interview round. The diagnostic engine will automatically curate custom quests tailored to your performance.
            </p>
            <button
              onClick={() => onNavigate('ai-interview')}
              className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-500/25 active:scale-95 transition"
            >
              🤖 Take an AI Interview Round
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {quests.map((q) => {
              const milestones = q.milestones || [];
              const completedCount = milestones.filter((m) => m.completed).length;
              const pct = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;
              const isFinished = q.status === 'COMPLETED';

              return (
                <div
                  key={q.id}
                  className={`bg-slate-900/90 rounded-2xl p-6 shadow-xl border transition-all ${
                    isFinished
                      ? 'border-emerald-500/40 bg-emerald-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                          {q.category} Quest
                        </span>
                        {isFinished && (
                          <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                            ✓ Completed (+{q.xpReward} XP)
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-black text-white">{q.title}</h2>
                      <p className="text-xs text-slate-400 mt-1">{q.description}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-3xl font-black text-indigo-400">{pct}%</span>
                      <span className="text-xs text-slate-500 block font-semibold">Progress</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800/80 rounded-full h-2.5 mb-5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        isFinished
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Milestones list */}
                  <div className="space-y-2 mb-4">
                    {milestones.map((m) => (
                      <button
                        key={m.step}
                        onClick={() => toggleMilestone(q.id, m.step)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                          m.completed
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300 font-semibold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-indigo-500/50 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                              m.completed
                                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                                : 'border border-slate-700 bg-slate-800 text-slate-400'
                            }`}
                          >
                            {m.completed ? '✓' : m.step}
                          </span>
                          <span>{m.text}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold ${
                            m.completed ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {m.completed ? 'Done' : 'Click to complete'}
                        </span>
                      </button>
                    ))}
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
