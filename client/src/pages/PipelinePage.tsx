import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

// Personalized learning pipeline dashboard. The current stage sits front-and-
// center with a big CTA; upcoming stages are dimmed and locked; completed
// stages compress into a strip at the top. Clicking a CTA deep-links into
// the target page (quiz / coding / interview) with the right context.

interface Stage {
  id: string;
  order: number;
  pillar: string;      // "aptitude" | "coreCS" | "coding" | "comm"
  level: number;
  title: string;
  description: string;
  gateType: string;    // "quiz" | "coding-solve" | "interview" | "theory-read"
  gateMeta: any;
  isUnlocked: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  skippedAt: string | null;
  completedAt: string | null;
}

interface Pipeline {
  id: string;
  status: string;
  focus: string;
  targetCompany: string | null;
  stages: Stage[];
  createdAt: string;
}

const PILLAR_ICON: Record<string, string> = {
  aptitude: '🧮',
  coreCS: '🖥️',
  coding: '⚡',
  comm: '🗣️',
};
const PILLAR_LABEL: Record<string, string> = {
  aptitude: 'Aptitude',
  coreCS: 'Core CS',
  coding: 'Coding',
  comm: 'Interview',
};

// Map gateType + meta → { label, targetPage } so the CTA does the right thing
function ctaFor(stage: Stage): { label: string; targetPage: string; extra?: Record<string, string> } {
  const m = stage.gateMeta || {};
  if (stage.gateType === 'quiz') {
    if (m.source === 'core-subject') {
      return {
        label: `Take ${m.subject} quiz →`,
        targetPage: 'core-cs-hub',
        extra: { subject: m.subject },
      };
    }
    return {
      label: `Take ${m.subtopic || 'aptitude'} quiz →`,
      targetPage: 'interview-hub',
      extra: { categorySlug: m.categorySlug || '' },
    };
  }
  if (stage.gateType === 'coding-solve') {
    return {
      label: `Solve ${m.topicSlug || 'DSA'} problems →`,
      targetPage: 'coding-tracks',
      extra: { topicSlug: m.topicSlug || '' },
    };
  }
  if (stage.gateType === 'interview') {
    return {
      label: `Start ${m.roundType || ''} mock →`,
      targetPage: 'ai-interview',
      extra: { roundType: m.roundType || 'technical' },
    };
  }
  return { label: 'Open →', targetPage: 'dashboard' };
}

const gateReqText = (stage: Stage): string => {
  const m = stage.gateMeta || {};
  if (stage.gateType === 'quiz') return `Score ≥ ${m.minScore ?? 70}% on the quiz`;
  if (stage.gateType === 'coding-solve') return `Solve ${m.minSolved ?? 1} problem(s)`;
  if (stage.gateType === 'interview') return `Score ≥ ${m.minOverallScore ?? 60}/100`;
  return '';
};

export interface PipelinePageProps {
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onNavigate: (page: string, ctx?: Record<string, string>) => void;
  onNoDiagnostic: () => void;
  onLogout?: () => void;
}

export const PipelinePage: React.FC<PipelinePageProps> = ({
  user,
  onNavigate,
  onNoDiagnostic,
  onLogout,
}) => {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    apiClient
      .get<Pipeline | null>('/pipeline/current')
      .then((p) => {
        setPipeline(p);
        setError(null);
      })
      .catch(() => setError('Failed to load pipeline.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const createFresh = async (focus: string) => {
    setBusy(true);
    try {
      await apiClient.post('/pipeline/create', { focus });
      load();
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.toLowerCase().includes('diagnostic')) {
        onNoDiagnostic();
      } else {
        setError(msg || 'Failed to generate pipeline.');
      }
    } finally {
      setBusy(false);
    }
  };

  const skipStage = async (stageId: string) => {
    if (!pipeline) return;
    if (
      !confirm(
        'This stage will be marked as MISSED — not completed. It stays on your pipeline and you can come back to complete it any time. Skip for now?'
      )
    )
      return;
    try {
      await apiClient.post(`/pipeline/${pipeline.id}/skip-stage/${stageId}`, {});
      load();
    } catch {
      setError('Failed to skip stage.');
    }
  };

  if (loading) {
    return (
      <FullScreenShell
        title="My Learning Pipeline"
        subtitle="Adaptive milestone progression"
        icon="🎯"
        currentPage="pipeline"
        user={user}
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
          <p className="text-xs text-slate-400 font-bold">Loading your personalized roadmap…</p>
        </div>
      </FullScreenShell>
    );
  }

  // No pipeline yet — offer to generate one or point to the diagnostic
  if (!pipeline) {
    return (
      <FullScreenShell
        title="My Learning Pipeline"
        subtitle="Adaptive milestone progression"
        icon="🎯"
        currentPage="pipeline"
        user={user}
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        <div className="max-w-2xl mx-auto py-10">
          <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-2xl text-center">
            <div className="text-5xl mb-3">🎯</div>
            <h1 className="text-2xl font-black text-white mb-2">No Active Pipeline Found</h1>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Generate a personalized placement roadmap based on your skill profile, or select a preset focus below:
            </p>
            {error && (
              <div className="bg-rose-500/20 border border-rose-500/30 text-rose-300 p-3 rounded-xl mb-4 text-xs font-bold">
                {error}
              </div>
            )}
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { focus: 'balanced', title: 'Balanced Path', desc: 'Touches all pillars — ~4 weeks' },
                { focus: 'placement-6w', title: 'Placement 6-Week', desc: 'Frontloads CS + Coding' },
                { focus: 'coding-only', title: 'Coding Only', desc: 'Intensive DSA ladder' },
              ].map((preset) => (
                <button
                  key={preset.focus}
                  onClick={() => createFresh(preset.focus)}
                  disabled={busy}
                  className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 text-left transition disabled:opacity-40 cursor-pointer group"
                >
                  <div className="font-black text-white group-hover:text-indigo-300 text-sm">
                    {preset.title}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </FullScreenShell>
    );
  }

  const completed = pipeline.stages.filter((s) => s.isCompleted);
  const missed = pipeline.stages.filter((s) => s.isSkipped && !s.isCompleted);
  const pending = pipeline.stages.filter((s) => !s.isCompleted && !s.isSkipped);
  const current = pending.find((s) => s.isUnlocked) || null;
  const locked = pending.filter((s) => !s.isUnlocked);
  const pct = Math.round((completed.length / pipeline.stages.length) * 100);

  return (
    <FullScreenShell
      title="My Learning Pipeline"
      subtitle="Adaptive diagnostic milestones & skill ladder"
      icon="🎯"
      currentPage="pipeline"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* PIPELINE PROGRESS HEADER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/70 via-teal-900/50 to-slate-900/90 border border-emerald-500/30 text-white p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-wider mb-2">
                <span>🎯</span> Pipeline Focus: {pipeline.focus}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {completed.length} / {pipeline.stages.length} Stages Complete ({pct}%)
              </h1>
              {missed.length > 0 && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
                  ⚠ {missed.length} missed — review and complete
                </div>
              )}
            </div>
            <button
              onClick={() => createFresh(pipeline.focus)}
              disabled={busy}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition cursor-pointer self-start sm:self-auto"
            >
              ↻ Regenerate
            </button>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-400 to-teal-400 h-3 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/20 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs font-bold">
            {error}
          </div>
        )}

        {/* COMPLETED STRIP */}
        {completed.length > 0 && (
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Completed Stages ({completed.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {completed.map((s) => (
                <div
                  key={s.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold"
                  title={s.title}
                >
                  <span>{PILLAR_ICON[s.pillar]}</span>
                  <span className="truncate max-w-[200px]">{s.title}</span>
                  <span className="opacity-80">✓</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CURRENT ACTIVE STAGE CARD */}
        {current ? (
          <div className="bg-slate-900/95 border-2 border-indigo-500/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/60 relative overflow-hidden">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400 mb-3">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              Active Target · Stage {current.order}
            </div>

            <div className="flex items-start gap-4 mb-4">
              <div className="text-4xl p-3 bg-slate-800 border border-slate-700/60 rounded-2xl shrink-0">
                {PILLAR_ICON[current.pillar]}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-black text-white">{current.title}</h2>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {PILLAR_LABEL[current.pillar]} · Target Level {current.level}
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-4 leading-relaxed">{current.description}</p>

            {current.gateMeta?.synopsisBullet && (
              <div className="bg-indigo-500/15 border border-indigo-500/30 rounded-xl p-3 text-xs text-indigo-300 mb-4">
                💡 <b>Key Concept:</b> {current.gateMeta.synopsisBullet}
              </div>
            )}

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 text-xs font-bold text-slate-300 mb-6 flex items-center gap-2">
              <span>🎯</span>
              <span>Gate Requirement: {gateReqText(current)}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const cta = ctaFor(current);
                  onNavigate(cta.targetPage, cta.extra);
                }}
                className="flex-1 py-3.5 rounded-xl font-black text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition shadow-lg shadow-indigo-900/50 active:scale-95 cursor-pointer text-sm"
              >
                {ctaFor(current).label}
              </button>
              <button
                onClick={() => skipStage(current.id)}
                className="px-5 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition text-xs active:scale-95 cursor-pointer"
              >
                Skip For Now
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-3xl p-8 text-center">
            <div className="text-5xl mb-2">🎉</div>
            <div className="text-2xl font-black text-emerald-400">Pipeline Complete!</div>
            <div className="text-sm text-slate-300 mt-1">
              You have walked every milestone stage. Retake the diagnostic for a fresh, advanced ladder.
            </div>
          </div>
        )}

        {/* MISSED STAGES */}
        {missed.length > 0 && (
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
              <span>⚠ Missed ({missed.length})</span>
              <span className="text-[10px] font-semibold text-slate-400 normal-case tracking-normal">
                These don't count as complete — revisit to finish them
              </span>
            </div>
            <div className="space-y-2">
              {missed.map((s) => {
                const cta = ctaFor(s);
                return (
                  <div
                    key={s.id}
                    className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/30 flex items-center gap-3"
                  >
                    <div className="text-2xl">{PILLAR_ICON[s.pillar]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-white text-sm truncate">
                        Stage {s.order} · {s.title}
                      </div>
                      <div className="text-xs text-amber-300 mt-0.5">{gateReqText(s)}</div>
                    </div>
                    <button
                      onClick={() => onNavigate(cta.targetPage, cta.extra)}
                      className="px-4 py-2 rounded-xl font-black text-slate-950 bg-amber-400 hover:bg-amber-300 transition text-xs whitespace-nowrap cursor-pointer active:scale-95"
                    >
                      Complete Now →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* UPCOMING LOCKED STAGES */}
        {locked.length > 0 && (
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
              Upcoming Milestones ({locked.length})
            </div>
            <div className="space-y-2">
              {locked.slice(0, 6).map((s) => (
                <div
                  key={s.id}
                  className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 opacity-60 flex items-center gap-3"
                >
                  <div className="text-2xl grayscale">{PILLAR_ICON[s.pillar]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-300 text-sm truncate">
                      Stage {s.order} · {s.title}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{gateReqText(s)}</div>
                  </div>
                  <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <span>🔒</span> Locked
                  </div>
                </div>
              ))}
              {locked.length > 6 && (
                <div className="text-center text-xs text-slate-500 pt-2 font-medium">
                  + {locked.length - 6} more stages ahead in your pipeline
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
export default PipelinePage;
