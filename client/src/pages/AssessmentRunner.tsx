import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { apiClient } from '../services/api';
import { useProctoring, enterFullscreen } from '../hooks/useProctoring';
import { SelfViewCamera } from '../components/SelfViewCamera';
import RichText from '../components/RichText';
import { FullScreenShell } from '../components/FullScreenShell';

// Student test runner: consent screen → sectioned navigator + server-synced
// countdown + debounced autosave → review grid → submit → scorecard.
// The server is authoritative for time and marks; this UI never grades.

interface Item {
  kind: 'question' | 'coding';
  id: string;
  sectionId: string;
  sectionTitle: string;
  sectionKind: string;
  marks: number;
  order: number;
  content: any;
}

interface AttemptPayload {
  attemptId: string;
  status: string;
  needsConsent?: boolean;
  test: {
    id: string;
    title: string;
    description: string | null;
    durationMinutes: number;
    mode: 'PRACTICE' | 'PROCTORED';
    negativeMarking: number;
    passScore: number | null;
  };
  remainingSec: number;
  items: Item[];
  responses: { questionId: string | null; codingProblemId: string | null; answer: any; flagged: boolean }[];
}

type AnswerMap = Record<string, any>; // itemId -> answer (MCQ: optionId[], coding: {language, code})
type FlagMap = Record<string, boolean>;

const MONACO_LANG: Record<string, string> = {
  python: 'python',
  javascript: 'javascript',
  cpp: 'cpp',
  java: 'java',
};

export interface AssessmentRunnerProps {
  testId: string;
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onExit: () => void;
  onPractice?: (testId: string) => void;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const AssessmentRunner: React.FC<AssessmentRunnerProps> = ({
  testId,
  user,
  onExit,
  onPractice,
  onNavigate,
  onLogout,
}) => {
  const [payload, setPayload] = useState<AttemptPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'consent' | 'running' | 'review-grid' | 'result'>('consent');
  const [consented, setConsented] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [flags, setFlags] = useState<FlagMap>({});
  const [remaining, setRemaining] = useState(0);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [runOutput, setRunOutput] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const enteredAt = useRef<number>(Date.now());
  const submittingRef = useRef(false);

  const nav = onNavigate || (() => {});

  const proctored = payload?.test.mode === 'PROCTORED';
  const proctoringActive = !!proctored && (phase === 'running' || phase === 'review-grid');
  const { warning: proctorWarning, cameraOn, faceStatus } = useProctoring(
    payload?.attemptId ?? null,
    proctoringActive
  );

  // ---- load / start attempt ----
  useEffect(() => {
    apiClient
      .post<AttemptPayload>(`/assessments/${testId}/start`, {})
      .then((p) => {
        setPayload(p);
        setRemaining(p.remainingSec);
        const a: AnswerMap = {};
        const f: FlagMap = {};
        for (const r of p.responses) {
          const id = r.questionId || r.codingProblemId!;
          if (r.answer != null) a[id] = r.answer;
          if (r.flagged) f[id] = true;
        }
        setAnswers(a);
        setFlags(f);
        if (p.status !== 'IN_PROGRESS') {
          apiClient
            .get(`/assessments/attempts/${p.attemptId}/review`)
            .then((r) => {
              setResult(r);
              setPhase('result');
            })
            .catch(() => setError('Failed to load past attempt review'));
        } else if (!p.needsConsent) {
          setPhase('running');
        }
      })
      .catch((e) => setError(e?.message || 'Failed to start test'));
  }, [testId]);

  // ---- countdown ticker ----
  useEffect(() => {
    if (phase !== 'running' && phase !== 'review-grid') return;
    const t = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(t);
          submit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ---- debounced autosave ----
  const queueSave = useCallback(
    (item: Item, answer: any, flagged: boolean) => {
      if (!payload) return;
      const key = item.id;
      if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
      saveTimers.current[key] = setTimeout(async () => {
        setSaving(true);
        const spentSec = Math.round((Date.now() - enteredAt.current) / 1000);
        try {
          await apiClient.post(`/assessments/attempts/${payload.attemptId}/respond`, {
            questionId: item.kind === 'question' ? item.id : undefined,
            codingProblemId: item.kind === 'coding' ? item.id : undefined,
            answer,
            flagged,
            timeSpentSec: spentSec,
          });
        } catch {
          // background retry could go here
        } finally {
          setSaving(false);
        }
      }, 600);
    },
    [payload]
  );

  const chooseOption = (item: Item, optionId: string) => {
    const prev: string[] = Array.isArray(answers[item.id]) ? answers[item.id] : [];
    const next = prev.includes(optionId)
      ? prev.filter((id) => id !== optionId)
      : [...prev, optionId];
    setAnswers((m) => ({ ...m, [item.id]: next }));
    queueSave(item, next, !!flags[item.id]);
  };

  const updateCode = (item: Item, language: string, code: string) => {
    const next = { language, code };
    setAnswers((m) => ({ ...m, [item.id]: next }));
    queueSave(item, next, !!flags[item.id]);
  };

  const toggleFlag = (item: Item) => {
    const next = !flags[item.id];
    setFlags((m) => ({ ...m, [item.id]: next }));
    queueSave(item, answers[item.id] ?? null, next);
  };

  const runCode = async (item: Item, hidden: boolean) => {
    const val = answers[item.id];
    if (!val?.code) return;
    setRunning(true);
    setRunOutput(null);
    try {
      const ep = hidden ? '/code/submit' : '/code/run';
      const out = await apiClient.post(ep, {
        problemId: item.id,
        language: val.language,
        source: val.code,
      });
      setRunOutput({ ...(out as any), hidden });
    } catch (e: any) {
      setRunOutput({ error: e?.message || 'Run failed' });
    } finally {
      setRunning(false);
    }
  };

  const submit = async () => {
    if (!payload || submittingRef.current) return;
    submittingRef.current = true;
    for (const t of Object.values(saveTimers.current)) clearTimeout(t);
    try {
      await apiClient.post(`/assessments/attempts/${payload.attemptId}/submit`, {});
      const review = await apiClient.get(`/assessments/attempts/${payload.attemptId}/review`);
      setResult(review);
      setPhase('result');
    } catch (e: any) {
      setError(e?.message || 'Failed to submit test');
    } finally {
      submittingRef.current = false;
    }
  };

  const sections = useMemo(() => {
    if (!payload) return [];
    const map = new Map<string, { title: string; items: { item: Item; index: number }[] }>();
    payload.items.forEach((item, index) => {
      if (!map.has(item.sectionTitle)) map.set(item.sectionTitle, { title: item.sectionTitle, items: [] });
      map.get(item.sectionTitle)!.items.push({ item, index });
    });
    return Array.from(map.values());
  }, [payload]);

  const answeredCount = useMemo(() => {
    if (!payload) return 0;
    return payload.items.filter((it) => {
      const a = answers[it.id];
      if (it.kind === 'question') return Array.isArray(a) && a.length > 0;
      return !!a?.code;
    }).length;
  }, [payload, answers]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  if (error && !payload) {
    return (
      <FullScreenShell
        title="Assessment Runner"
        subtitle="Error loading assessment"
        icon="📝"
        currentPage="assessment-runner"
        user={user}
        onNavigate={nav}
        onBack={onExit}
        onLogout={onLogout}
      >
        <div className="max-w-xl mx-auto bg-slate-900 border border-rose-500/30 p-8 rounded-3xl text-center shadow-xl my-12">
          <p className="text-rose-400 font-bold mb-4">{error}</p>
          <button
            onClick={onExit}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
          >
            ← Exit Test
          </button>
        </div>
      </FullScreenShell>
    );
  }

  if (!payload) {
    return (
      <FullScreenShell
        title="Assessment Runner"
        subtitle="Initializing session"
        icon="📝"
        currentPage="assessment-runner"
        user={user}
        onNavigate={nav}
        onBack={onExit}
        onLogout={onLogout}
      >
        <div className="flex flex-col items-center justify-center p-16 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          <p className="text-xs text-slate-400 font-bold">Synchronizing assessment runner…</p>
        </div>
      </FullScreenShell>
    );
  }

  // ---- consent screen ----
  if (phase === 'consent') {
    return (
      <FullScreenShell
        title={payload.test.title}
        subtitle={`${payload.test.mode} Assessment · Candidate Instructions`}
        icon="📝"
        currentPage="assessment-runner"
        user={user}
        onNavigate={nav}
        onBack={onExit}
        onLogout={onLogout}
      >
        <div className="max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {payload.test.mode} ASSESSMENT
            </span>
            <h1 className="text-2xl font-black text-white mt-2">{payload.test.title}</h1>
            {payload.test.description && (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{payload.test.description}</p>
            )}
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
            <div className="flex justify-between">
              <span>Duration:</span>
              <b className="text-white">{payload.test.durationMinutes} minutes</b>
            </div>
            <div className="flex justify-between">
              <span>Total Questions:</span>
              <b className="text-white">{payload.items.length} items</b>
            </div>
            {payload.test.negativeMarking > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Negative Marking:</span>
                <b>−{payload.test.negativeMarking} per incorrect answer</b>
              </div>
            )}
            {payload.test.passScore != null && (
              <div className="flex justify-between text-emerald-400">
                <span>Passing Mark:</span>
                <b>≥ {payload.test.passScore}%</b>
              </div>
            )}
          </div>

          {proctored && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-xs text-rose-300 space-y-2">
              <h3 className="font-bold flex items-center gap-1.5 text-rose-200">
                <span>🎥</span> Automated Proctoring Active
              </h3>
              <p className="leading-relaxed">
                This test records tab focus, copy/paste signals, and camera availability. Leaving fullscreen mode or switching tabs creates an advisory telemetry flag.
              </p>
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
            />
            <span className="text-xs text-slate-300 leading-relaxed">
              I certify that I will take this assessment independently without external assistance, and accept the session conditions.
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onExit}
              className="px-5 py-3 rounded-xl font-bold bg-slate-800 text-slate-300 border border-slate-700 text-xs hover:bg-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={!consented}
              onClick={async () => {
                if (proctored) {
                  await enterFullscreen();
                }
                enteredAt.current = Date.now();
                setPhase('running');
              }}
              className="flex-1 py-3 rounded-xl font-black text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition shadow-lg shadow-indigo-900/40 text-xs disabled:opacity-40 cursor-pointer"
            >
              Begin Test Now →
            </button>
          </div>
        </div>
      </FullScreenShell>
    );
  }

  // ---- result / scorecard ----
  if (phase === 'result' && result) {
    const b = result.breakdown || {};
    return (
      <FullScreenShell
        title="Assessment Result & Scorecard"
        subtitle={payload.test.title}
        icon="🏆"
        currentPage="assessment-runner"
        user={user}
        onNavigate={nav}
        onBack={onExit}
        onLogout={onLogout}
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-xl text-center">
            <h1 className="text-2xl font-black text-white mb-1">{payload.test.title}</h1>
            <p className="text-xs text-slate-400 mb-4">
              {result.status === 'EXPIRED' ? 'Time expired — auto-submitted' : 'Assessment Submitted Successfully'}
            </p>
            <div className="text-5xl font-black text-white mb-2">{result.score ?? 0}%</div>
            {b.passed != null && (
              <div className={`font-black text-base ${b.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                {b.passed ? '✅ PASSED ASSESSMENT' : '❌ BELOW PASS THRESHOLD'}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">
              {b.scoredMarks} / {b.totalMarks} marks earned
              {b.ungraded > 0 && <> · {b.ungraded} questions ungraded (key review pending)</>}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              {(b.sections || []).map((s: any, i: number) => (
                <div key={i} className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-indigo-300 uppercase">{s.title}</div>
                  <div className="font-black text-white text-base mt-0.5">
                    {s.scored} / {s.total}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(result.weakTopics || []).length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl">
              <h2 className="font-black text-base text-white mb-2">📉 Targeted Weak Topics</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {result.weakTopics.map((t: any) => (
                  <span
                    key={t.name}
                    className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold px-3 py-1 rounded-full"
                  >
                    {t.name} · {t.accuracy}%
                  </span>
                ))}
              </div>
              {onPractice && (
                <button
                  onClick={async () => {
                    try {
                      const p = await apiClient.post<{ testId: string }>(
                        `/assessments/attempts/${result.attemptId}/practice-weak`,
                        {}
                      );
                      onPractice(p.testId);
                    } catch {
                      setError('Could not build the practice test.');
                    }
                  }}
                  className="w-full py-3 rounded-xl font-black text-xs text-white bg-gradient-to-r from-rose-500 to-orange-500 transition shadow-lg cursor-pointer"
                >
                  🎯 Practice Weak Topics Now
                </button>
              )}
            </div>
          )}

          <h2 className="font-black text-lg text-white">Item Review</h2>
          {(result.items || [])
            .filter((i: any) => i.kind === 'coding')
            .map((i: any, n: number) => (
              <div key={`c${n}`} className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow">
                <div className="text-[10px] font-bold text-indigo-400 uppercase mb-1">
                  Coding · {i.sectionTitle}
                </div>
                <div className="font-semibold text-xs text-slate-200">
                  {i.answer?.passed != null
                    ? `Hidden tests passed: ${i.answer.passed}/${i.answer.total} · ${
                        Math.round(i.marks * 100) / 100
                      } marks earned`
                    : 'Not attempted'}
                </div>
              </div>
            ))}
          {(result.items || [])
            .filter((i: any) => i.kind === 'question')
            .map((i: any, n: number) => {
              const chosenIds: string[] = Array.isArray(i.chosen) ? i.chosen : [];
              return (
                <div key={n} className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase mb-1">
                    {i.topic} · {i.sectionTitle}
                    {i.timeSpentSec > 0 ? ` · ${i.timeSpentSec}s` : ''}
                  </div>
                  <p className="font-semibold text-xs sm:text-sm text-white mb-3 leading-relaxed">
                    <RichText text={i.stem} />
                  </p>
                  <div className="space-y-1.5">
                    {(i.options || []).map((o: any) => (
                      <div
                        key={o.id}
                        className={`px-3 py-2 rounded-xl text-xs border ${
                          o.isCorrect
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                            : chosenIds.includes(o.id)
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 line-through'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                        }`}
                      >
                        <RichText text={o.text} />
                        {o.isCorrect && ' ✓'}
                        {!o.isCorrect && chosenIds.includes(o.id) && ' ✗ (your answer)'}
                      </div>
                    ))}
                  </div>
                  {i.explanation && (
                    <details className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800">
                      <summary className="cursor-pointer font-bold text-indigo-400">
                        Worked Solution
                      </summary>
                      <p className="mt-1 leading-relaxed text-slate-300">
                        <RichText text={i.explanation} />
                      </p>
                    </details>
                  )}
                </div>
              );
            })}
          <button
            onClick={onExit}
            className="w-full py-3.5 rounded-2xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition cursor-pointer"
          >
            Done & Return
          </button>
        </div>
      </FullScreenShell>
    );
  }

  // ---- review grid before submit ----
  if (phase === 'review-grid') {
    return (
      <FullScreenShell
        title="Submit Confirmation"
        subtitle="Review answered and flagged questions"
        icon="📝"
        currentPage="assessment-runner"
        user={user}
        onNavigate={nav}
        onBack={() => setPhase('running')}
        onLogout={onLogout}
      >
        <div className="max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <h2 className="text-xl font-black text-white mb-1">Ready to Submit Assessment?</h2>
          <p className="text-xs text-slate-400 mb-6">
            {answeredCount} of {payload.items.length} answered · ⏱ {fmt(remaining)} left
          </p>
          {sections.map((s) => (
            <div key={s.title} className="mb-5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {s.title}
              </div>
              <div className="flex flex-wrap gap-2">
                {s.items.map(({ item: it, index }) => {
                  const a = answers[it.id];
                  const answered = Array.isArray(a) ? a.length > 0 : !!a?.code;
                  return (
                    <button
                      key={it.id}
                      onClick={() => {
                        setCurrent(index);
                        setPhase('running');
                      }}
                      className={`w-9 h-9 rounded-xl text-xs font-black transition cursor-pointer ${
                        flags[it.id]
                          ? 'bg-amber-400 text-slate-950'
                          : answered
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => setPhase('running')}
              className="flex-1 py-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              ← Keep Working
            </button>
            <button
              onClick={submit}
              className="flex-1 py-3 rounded-xl font-black text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition shadow-lg shadow-emerald-900/40 cursor-pointer"
            >
              Submit Final Answers
            </button>
          </div>
        </div>
      </FullScreenShell>
    );
  }

  // ---- running phase ----
  const item = payload.items[current];
  const isCoding = item.kind === 'coding';
  const codingAns = isCoding
    ? answers[item.id] || { language: 'python', code: item.content?.starterCode?.python || '' }
    : null;

  return (
    <FullScreenShell
      title={payload.test.title}
      subtitle={`Question ${current + 1} of ${payload.items.length} · ⏱ ${fmt(remaining)} left`}
      icon="📝"
      currentPage="assessment-runner"
      user={user}
      onNavigate={nav}
      onBack={() => setPhase('review-grid')}
      onLogout={onLogout}
    >
      <div className="flex flex-col lg:flex-row gap-5">
        {proctorWarning && (
          <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-black px-5 py-2 rounded-full shadow-2xl text-xs">
            ⚠️ {proctorWarning} (Advisory flag noted in telemetry)
          </div>
        )}
        <SelfViewCamera active={proctoringActive} proctoring={proctoringActive} faceStatus={faceStatus} />

        {/* NAVIGATOR (LEFT) */}
        <div className="lg:w-60 shrink-0 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl p-5 h-fit lg:sticky lg:top-20">
          <div
            className={`text-2xl font-black text-center mb-2 font-mono ${
              remaining < 300 ? 'text-rose-400 animate-pulse' : 'text-white'
            }`}
          >
            ⏱ {fmt(remaining)}
          </div>
          <div className="text-[11px] text-center text-slate-400 mb-4 font-semibold">
            {saving ? 'saving response…' : 'all saved'}
            {proctored && <span className="ml-2">{cameraOn ? '🎥 Active' : '🚫 No cam'}</span>}
          </div>

          <div className="space-y-3.5 max-h-[50vh] overflow-y-auto scrollbar-none pr-1">
            {sections.map((s) => (
              <div key={s.title}>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {s.title}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {s.items.map(({ item: it, index }) => {
                    const a = answers[it.id];
                    const answered = Array.isArray(a) ? a.length > 0 : !!a?.code;
                    return (
                      <button
                        key={it.id}
                        onClick={() => {
                          setCurrent(index);
                          setRunOutput(null);
                          enteredAt.current = Date.now();
                        }}
                        className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer ${
                          index === current
                            ? 'ring-2 ring-indigo-500 bg-indigo-600 text-white'
                            : flags[it.id]
                              ? 'bg-amber-400 text-slate-950'
                              : answered
                                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setPhase('review-grid')}
            className="w-full mt-5 py-2.5 rounded-xl font-black text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-xs shadow-md transition cursor-pointer"
          >
            Review & Submit
          </button>
        </div>

        {/* QUESTION AREA (RIGHT) */}
        <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                {item.sectionTitle} · Question {current + 1} / {payload.items.length} · {item.marks} Mark
                {item.marks !== 1 ? 's' : ''}
              </div>
              <button
                onClick={() => toggleFlag(item)}
                className={`text-xs font-bold px-3 py-1 rounded-xl transition cursor-pointer ${
                  flags[item.id]
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                🚩 {flags[item.id] ? 'Flagged' : 'Flag'}
              </button>
            </div>

            {!isCoding && item.content && (
              <>
                {item.content.assets?.context && (
                  <div className="text-xs text-slate-300 bg-slate-800/80 border border-slate-700/60 p-4 rounded-2xl mb-4 max-h-56 overflow-y-auto leading-relaxed">
                    <RichText text={item.content.assets.context} />
                  </div>
                )}
                <p className="font-semibold text-sm sm:text-base text-white mb-6 leading-relaxed">
                  <RichText text={item.content.stem} />
                </p>
                <div className="space-y-2.5">
                  {item.content.options.map((o: any, i: number) => {
                    const chosen = Array.isArray(answers[item.id]) && answers[item.id].includes(o.id);
                    return (
                      <button
                        key={o.id}
                        onClick={() => chooseOption(item, o.id)}
                        className={`w-full text-left px-4 py-3.5 rounded-2xl border text-xs sm:text-sm font-medium transition flex items-center gap-3 cursor-pointer ${
                          chosen
                            ? 'border-indigo-500 bg-indigo-600/30 text-white font-bold shadow-lg shadow-indigo-950/50'
                            : 'border-slate-800 bg-slate-800/60 text-slate-200 hover:border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-lg bg-slate-850 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-400 shrink-0">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <div className="flex-1">
                          <RichText text={o.text} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {isCoding && item.content && (
              <>
                <h2 className="text-lg font-black text-white mb-2">{item.content.title}</h2>
                <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap mb-4 leading-relaxed">
                  {item.content.statement}
                </p>
                {item.content.constraints && (
                  <p className="text-xs text-slate-400 mb-3 bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl font-mono">
                    Constraints: {item.content.constraints}
                  </p>
                )}
                <div className="flex items-center gap-3 my-4">
                  <select
                    value={codingAns.language}
                    onChange={(e) => {
                      const lang = e.target.value;
                      updateCode(item, lang, item.content.starterCode?.[lang] || '');
                    }}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 font-bold text-xs text-white focus:outline-none"
                  >
                    {Object.keys(item.content.starterCode || { python: 1 }).map((l) => (
                      <option key={l} value={l}>
                        {l.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={running}
                    onClick={() => runCode(item, false)}
                    className="px-4 py-2 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs disabled:opacity-50 cursor-pointer"
                  >
                    {running ? 'Running…' : '▶ Run Samples'}
                  </button>
                  <button
                    disabled={running}
                    onClick={() => runCode(item, true)}
                    className="px-4 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white text-xs disabled:opacity-50 cursor-pointer"
                  >
                    ✓ Submit Code
                  </button>
                </div>
                <div className="border border-slate-700/80 rounded-2xl overflow-hidden mb-4">
                  <Editor
                    height="320px"
                    theme="vs-dark"
                    language={MONACO_LANG[codingAns.language] || 'python'}
                    value={codingAns.code}
                    onChange={(v) => updateCode(item, codingAns.language, v || '')}
                    options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
                  />
                </div>
                {runOutput && (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono space-y-2 text-slate-300">
                    {runOutput.error && <div className="text-rose-400">{runOutput.error}</div>}
                    {!runOutput.error && (
                      <>
                        <div className="font-black text-white mb-2">
                          {runOutput.hidden ? 'Hidden Tests' : 'Sample Tests'}: {runOutput.passed}/
                          {runOutput.total} passed
                          {runOutput.hidden && runOutput.score != null && <> · score {runOutput.score}%</>}
                        </div>
                        {(runOutput.results || runOutput.breakdown || []).map((r: any, i: number) => (
                          <div
                            key={i}
                            className={r.passed || r.status === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'}
                          >
                            case {r.case}: {r.status}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-800">
            <button
              disabled={current === 0}
              onClick={() => {
                setCurrent(current - 1);
                setRunOutput(null);
                enteredAt.current = Date.now();
              }}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer"
            >
              ← Previous
            </button>
            {current < payload.items.length - 1 ? (
              <button
                onClick={() => {
                  setCurrent(current + 1);
                  setRunOutput(null);
                  enteredAt.current = Date.now();
                }}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition shadow cursor-pointer"
              >
                Next Question →
              </button>
            ) : (
              <button
                onClick={() => setPhase('review-grid')}
                className="px-6 py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-white transition shadow cursor-pointer"
              >
                Review & Submit ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </FullScreenShell>
  );
};
export default AssessmentRunner;
