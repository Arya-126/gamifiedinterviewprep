import React from 'react';
import type { DiagnosticResultPayload } from './DiagnosticTest';
import { FullScreenShell } from '../components/FullScreenShell';

const BELT_STYLES: Record<string, { grad: string; ring: string; label: string; icon: string }> = {
  Unranked: { grad: 'from-slate-700 to-slate-900', ring: 'ring-slate-600', label: 'Unranked', icon: '🎯' },
  Bronze: { grad: 'from-amber-700/80 to-amber-950', ring: 'ring-amber-500/50', label: 'Bronze', icon: '🥉' },
  Silver: { grad: 'from-slate-500 to-slate-800', ring: 'ring-slate-400/50', label: 'Silver', icon: '🥈' },
  Gold: { grad: 'from-yellow-600/80 to-amber-900', ring: 'ring-yellow-400/50', label: 'Gold', icon: '🥇' },
  Platinum: { grad: 'from-cyan-600/80 to-blue-950', ring: 'ring-cyan-400/50', label: 'Platinum', icon: '🏆' },
  Diamond: { grad: 'from-fuchsia-600/80 via-violet-800 to-indigo-950', ring: 'ring-fuchsia-400/50', label: 'Diamond', icon: '💎' },
};

const PILLAR_META: Record<string, { icon: string; name: string }> = {
  aptitude: { icon: '🧮', name: 'Aptitude' },
  coreCS: { icon: '🖥️', name: 'Core CS' },
  coding: { icon: '⚡', name: 'Coding' },
};

const LEVEL_LABELS = ['Undiagnosed', 'Foundations', 'Novice', 'Intermediate', 'Proficient', 'Advanced'];

interface DiagnosticResultProps {
  result: DiagnosticResultPayload;
  onContinue: () => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const DiagnosticResult: React.FC<DiagnosticResultProps> = ({
  result,
  onContinue,
  user,
  onNavigate = () => {},
  onLogout,
}) => {
  const belt = BELT_STYLES[result.overallBelt] || BELT_STYLES.Unranked;

  return (
    <FullScreenShell
      title="Diagnostic Results"
      subtitle="Your initial placement belt and capability mapping"
      currentPage="diagnostic-result"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <div className="max-w-4xl mx-auto py-6 space-y-6 animate-fade-in">
        {/* Belt banner */}
        <div
          className={`bg-gradient-to-br ${belt.grad} text-white rounded-3xl shadow-2xl p-8 sm:p-10 text-center relative overflow-hidden border border-white/10`}
        >
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 mb-3 bg-white/10 border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest text-slate-200">
              Your Placement Belt
            </div>
            <div className="text-7xl mb-3">{belt.icon}</div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-white">{belt.label}</div>
            <div className="text-sm font-medium text-slate-300 mt-2 max-w-md mx-auto">
              Baseline evaluated across all key placement domains. Let's start climbing the ranks!
            </div>
          </div>
        </div>

        {/* Per-pillar levels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['aptitude', 'coreCS', 'coding'] as const).map((pillar) => {
            const lvl = result.levelsAwarded[pillar] || 0;
            const score = result.perPillarScores[pillar] || 0;
            const meta = PILLAR_META[pillar];
            return (
              <div
                key={pillar}
                className="bg-slate-900/90 p-5 rounded-2xl shadow-xl border border-slate-800"
              >
                <div className="text-3xl mb-1">{meta.icon}</div>
                <div className="font-black text-white text-base">{meta.name}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                  Level {lvl}/5
                </div>
                <div className="text-sm font-bold text-indigo-400 mt-0.5">
                  {LEVEL_LABELS[lvl] || 'Undiagnosed'}
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(lvl / 5) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] font-semibold text-slate-400 mt-2">
                  Score: {(score * 100).toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>

        {/* Subtopic breakdown */}
        {Object.keys(result.breakdown || {}).length > 0 && (
          <div className="bg-slate-900/90 p-6 rounded-2xl shadow-xl border border-slate-800">
            <div className="font-black text-white text-base mb-3">Topic Breakdown</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.breakdown).map(([subtopic, level]) => {
                const badgeColor =
                  level >= 4
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : level >= 3
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : level >= 2
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                return (
                  <span
                    key={subtopic}
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold border ${badgeColor}`}
                  >
                    {subtopic}
                    <span className="opacity-80">L{level}</span>
                  </span>
                );
              })}
            </div>
            <div className="text-[10px] text-slate-500 mt-3">
              Red L1 = Foundations, Amber L2 = Novice, Blue L3 = Intermediate, Green L4+ = Proficient.
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onContinue}
          className="w-full py-4 rounded-2xl font-black text-white bg-gradient-to-r from-indigo-500 via-violet-600 to-fuchsia-600 shadow-xl shadow-indigo-500/20 hover:opacity-95 active:scale-95 transition text-base"
        >
          Continue to Dashboard →
        </button>
      </div>
    </FullScreenShell>
  );
};
