import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface RadarData {
  labels: string[];
  baselineScores: number[];
  currentScores: number[];
}

interface SummaryStats {
  overallAverage: number;
  improvementPct: number;
  totalInterviews: number;
  totalDrives: number;
}

interface PlacementDrive {
  id: string;
  currentStep: string;
  status: string;
  overallScore: number | null;
  overallVerdict: string | null;
  startedAt: string;
  company?: { name: string } | null;
}

interface StatsResponse {
  radar: RadarData;
  summary: SummaryStats;
  placementDrives: PlacementDrive[];
  activeQuests: any[];
}

export interface PrepTrackerDashboardProps {
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
  onBack?: () => void;
}

export const PrepTrackerDashboard: React.FC<PrepTrackerDashboardProps> = ({
  user,
  onNavigate,
  onLogout,
  onBack,
}) => {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<StatsResponse>('/prep-tracker/stats')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // SVG Radar Polygon Math Generator
  const renderRadarSvg = (radar: RadarData) => {
    const size = 340;
    const center = size / 2;
    const radius = 120;
    const totalAxes = radar.labels.length;

    const getCoordinates = (score: number, index: number) => {
      const angle = (Math.PI * 2 * index) / totalAxes - Math.PI / 2;
      const r = (score / 100) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return { x, y };
    };

    // Concentric grid circles (20%, 40%, 60%, 80%, 100%)
    const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

    const baselinePoints = radar.baselineScores
      .map((score, i) => {
        const { x, y } = getCoordinates(score, i);
        return `${x},${y}`;
      })
      .join(' ');

    const currentPoints = radar.currentScores
      .map((score, i) => {
        const { x, y } = getCoordinates(score, i);
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto overflow-visible">
        {/* Grid Background Web */}
        {rings.map((pct, idx) => (
          <polygon
            key={idx}
            points={radar.labels
              .map((_, i) => {
                const { x, y } = getCoordinates(pct * 100, i);
                return `${x},${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#334155"
            strokeDasharray={idx === 4 ? '0' : '3 3'}
            strokeWidth={idx === 4 ? '1.5' : '1'}
          />
        ))}

        {/* Axes Lines */}
        {radar.labels.map((_, i) => {
          const { x, y } = getCoordinates(100, i);
          return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#475569" strokeWidth="1" />;
        })}

        {/* Baseline Polygon (Indigo Dashed) */}
        <polygon points={baselinePoints} fill="rgba(99, 102, 241, 0.12)" stroke="#818cf8" strokeWidth="2" strokeDasharray="4 4" />

        {/* Current Polygon (Vibrant Emerald) */}
        <polygon points={currentPoints} fill="rgba(16, 185, 129, 0.28)" stroke="#10b981" strokeWidth="3" />

        {/* Vertices Dots */}
        {radar.currentScores.map((score, i) => {
          const { x, y } = getCoordinates(score, i);
          return <circle key={i} cx={x} cy={y} r="5" fill="#10b981" stroke="#0f172a" strokeWidth="2" />;
        })}

        {/* Axis Labels */}
        {radar.labels.map((label, i) => {
          const { x, y } = getCoordinates(126, i);
          const currentVal = radar.currentScores[i];
          return (
            <g key={i}>
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] font-bold fill-slate-300"
              >
                {label}
              </text>
              <text
                x={x}
                y={y + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] font-black fill-emerald-400"
              >
                {currentVal}%
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <FullScreenShell
      title="Placement Prep Analytics"
      subtitle="Competency skill radar, baseline growth & placement history"
      icon="📊"
      currentPage="prep-tracker"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
      onBack={onBack}
    >
      <div className="flex flex-col gap-6">
        {/* HERO HEADER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-slate-900/70 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black mb-3">
              <span>📈</span> Performance & Readiness Telemetry
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Placement Prep Analytics & Skill Radar
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
              Multi-axis competency radar, baseline improvement tracker, and comprehensive placement drive history.
            </p>
          </div>

          <button
            onClick={() => onNavigate('placement-drive')}
            className="px-5 py-3 rounded-xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition shadow-lg shadow-emerald-900/40 active:scale-95 cursor-pointer flex items-center gap-2 shrink-0"
          >
            <span>🚀</span> Start Placement Drive
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            <p className="text-xs text-slate-400 font-bold">Loading placement analytics…</p>
          </div>
        ) : !data ? (
          <div className="text-center py-16 text-rose-400 font-bold">Failed to load analytics data.</div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg shadow-slate-950/40">
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Overall Readiness</span>
                <div className="text-3xl font-black text-indigo-400">{data.summary.overallAverage}%</div>
                <span className="text-[10px] text-slate-400 block font-semibold mt-1">Average Across 6 Axes</span>
              </div>

              <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg shadow-slate-950/40">
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Skill Growth</span>
                <div className="text-3xl font-black text-emerald-400">+{data.summary.improvementPct}%</div>
                <span className="text-[10px] text-slate-400 block font-semibold mt-1">Vs. Baseline Attempts</span>
              </div>

              <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg shadow-slate-950/40">
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Mock Interviews</span>
                <div className="text-3xl font-black text-white">{data.summary.totalInterviews}</div>
                <span className="text-[10px] text-slate-400 block font-semibold mt-1">Rounds Completed</span>
              </div>

              <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg shadow-slate-950/40">
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Placement Drives</span>
                <div className="text-3xl font-black text-violet-400">{data.summary.totalDrives}</div>
                <span className="text-[10px] text-slate-400 block font-semibold mt-1">Full Drives Completed</span>
              </div>
            </div>

            {/* Main Grid: Radar Chart + Breakdown & Quests */}
            <div className="grid md:grid-cols-2 gap-6 items-start">
              {/* SVG Radar Chart Box */}
              <div className="bg-slate-900/90 p-6 rounded-3xl shadow-lg shadow-slate-950/40 border border-slate-800 text-center">
                <div className="flex justify-between items-center mb-6">
                  <div className="text-left">
                    <h2 className="text-lg font-black text-white">Competency Skill Radar</h2>
                    <p className="text-xs text-slate-400">Multi-axis proficiency mapping</p>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-bold">
                    <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                      <span className="text-slate-200">Current</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block opacity-60" />
                      <span className="text-slate-300">Baseline</span>
                    </div>
                  </div>
                </div>

                {renderRadarSvg(data.radar)}
              </div>

              {/* Right Column: Breakdown & Active Quests */}
              <div className="space-y-6">
                {/* Category Breakdown list */}
                <div className="bg-slate-900/90 p-6 rounded-3xl shadow-lg shadow-slate-950/40 border border-slate-800">
                  <h2 className="text-lg font-black text-white mb-4">Competency Breakdown</h2>
                  <div className="space-y-3">
                    {data.radar.labels.map((lbl, idx) => {
                      const currentVal = data.radar.currentScores[idx];
                      const baselineVal = data.radar.baselineScores[idx];
                      const diff = currentVal - baselineVal;

                      return (
                        <div key={lbl} className="flex justify-between items-center border-b border-slate-800/80 pb-2.5 text-xs">
                          <span className="font-bold text-slate-200">{lbl}</span>
                          <div className="flex items-center gap-3 font-mono">
                            <span className="text-slate-500 line-through">{baselineVal}%</span>
                            <span className="font-black text-emerald-400 text-sm">{currentVal}%</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                diff >= 0
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                  : 'bg-slate-800 border-slate-700 text-slate-400'
                              }`}
                            >
                              {diff >= 0 ? `+${diff}%` : `${diff}%`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active Quests Widget */}
                <div className="bg-slate-900/90 p-6 rounded-3xl shadow-lg shadow-slate-950/40 border border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-black text-white">Active Learning Quests</h2>
                    <button
                      onClick={() => onNavigate('quests-hub')}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
                    >
                      View All →
                    </button>
                  </div>

                  {data.activeQuests.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No active quests. Take a mock interview or drive to unlock personalized quests!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.activeQuests.slice(0, 3).map((q) => (
                        <div
                          key={q.id}
                          className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex justify-between items-center text-xs"
                        >
                          <div>
                            <div className="font-black text-white">{q.title}</div>
                            <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                              Reward: +{q.xpReward} XP
                            </div>
                          </div>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                            {q.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Placement Drives History Table */}
            <div className="bg-slate-900/90 p-6 rounded-3xl shadow-lg shadow-slate-950/40 border border-slate-800">
              <h2 className="text-lg font-black text-white mb-4">Past Placement Drive Attempts</h2>
              {data.placementDrives.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No completed placement drives yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Pattern</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Overall Score</th>
                        <th className="pb-3">Verdict</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {data.placementDrives.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 font-semibold text-slate-300">
                            {new Date(d.startedAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 font-bold text-white">
                            {d.company ? d.company.name : 'Generic Placement Drive'}
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 border border-slate-700 text-slate-300">
                              {d.status}
                            </span>
                          </td>
                          <td className="py-3 font-black text-indigo-400">
                            {d.overallScore != null ? `${d.overallScore}/100` : '—'}
                          </td>
                          <td className="py-3">
                            <span className="px-2.5 py-0.5 text-[10px] font-black rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                              {d.overallVerdict || 'Needs Practice'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
export default PrepTrackerDashboard;
