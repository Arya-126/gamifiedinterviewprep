import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '../services/api';
import RichText from '../components/RichText';
import { FullScreenShell } from '../components/FullScreenShell';

// Standalone problem solver (outside timed assessments):
// left = statement/constraints/sample I/O, right = language picker + editor +
// Run (sample tests, full output) and Submit (hidden tests, verdict only).

interface SampleIo {
  input: string;
  output: string;
}

interface Problem {
  id: string;
  title: string;
  statement: string;
  difficulty: string;
  constraints: string | null;
  sampleIo: SampleIo[];
  starterCode: Record<string, string>;
  timeLimitMs: number;
  languages: string[];
}

interface RunCase {
  case: number;
  status: string;
  passed: boolean;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  expected: string | null;
  timeSec: number | null;
}

interface RunResponse {
  results: RunCase[];
  passed: number;
  total: number;
}

interface SubmitCase {
  case: number;
  sample: boolean;
  status: string;
  timeSec: number | null;
}

interface SubmitResponse {
  passed: number;
  total: number;
  score: number;
  allPassed: boolean;
  breakdown: SubmitCase[];
  compileOutput?: string | null;
}

const DIFF_CHIP: Record<string, string> = {
  EASY: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  MEDIUM: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  HARD: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
};

export interface ProblemSolverProps {
  slug: string;
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onBack: () => void;
  onSolved?: () => void;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const ProblemSolver: React.FC<ProblemSolverProps> = ({
  slug,
  user,
  onBack,
  onSolved,
  onNavigate,
  onLogout,
}) => {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('python');
  // user edits kept per language so switching languages never loses work
  const [code, setCode] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'run' | 'submit' | null>(null);
  const [runOut, setRunOut] = useState<RunResponse | null>(null);
  const [submitOut, setSubmitOut] = useState<SubmitResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setProblem(null);
    setError(null);
    setCode({});
    setRunOut(null);
    setSubmitOut(null);
    setActionError(null);
    apiClient
      .get<Problem>(`/code/problems/${slug}`)
      .then((p) => {
        setProblem(p);
        const langs = p.languages?.length ? p.languages : Object.keys(p.starterCode || {});
        setLanguage(langs.includes('python') ? 'python' : langs[0] || 'python');
      })
      .catch((e) => setError(e?.message || 'Failed to load the problem'));
  }, [slug]);

  const nav = onNavigate || (() => {});
  const currentCode = code[language] ?? problem?.starterCode?.[language] ?? '';

  const updateCode = (value: string) => {
    setCode((prev) => ({ ...prev, [language]: value }));
  };

  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = editorRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const value = ta.value;
      const next = value.substring(0, start) + '  ' + value.substring(end);
      updateCode(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  const run = async () => {
    if (!problem || busy) return;
    setBusy('run');
    setRunOut(null);
    setSubmitOut(null);
    setActionError(null);
    try {
      const r = await apiClient.post<RunResponse>('/code/run', {
        problemId: problem.id,
        language,
        source: currentCode,
      });
      setRunOut(r);
    } catch (e: any) {
      setActionError(e?.message || 'Run failed');
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    if (!problem || busy) return;
    setBusy('submit');
    setRunOut(null);
    setSubmitOut(null);
    setActionError(null);
    try {
      const r = await apiClient.post<SubmitResponse>('/code/submit', {
        problemId: problem.id,
        language,
        source: currentCode,
      });
      setSubmitOut(r);
      if (r.allPassed) onSolved?.();
    } catch (e: any) {
      setActionError(e?.message || 'Submit failed');
    } finally {
      setBusy(null);
    }
  };

  if (error) {
    return (
      <FullScreenShell
        title="Problem Solver"
        subtitle="Online DSA IDE"
        icon="💻"
        currentPage="problem-solver"
        user={user}
        onNavigate={nav}
        onBack={onBack}
        onLogout={onLogout}
      >
        <div className="max-w-2xl mx-auto bg-slate-900 border border-rose-500/30 p-8 rounded-3xl text-center shadow-2xl my-12">
          <p className="text-rose-400 font-bold mb-4">{error}</p>
          <button
            onClick={onBack}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-xl transition cursor-pointer"
          >
            ← Return to Tracks
          </button>
        </div>
      </FullScreenShell>
    );
  }

  if (!problem) {
    return (
      <FullScreenShell
        title="Problem Solver"
        subtitle="Online DSA IDE"
        icon="💻"
        currentPage="problem-solver"
        user={user}
        onNavigate={nav}
        onBack={onBack}
        onLogout={onLogout}
      >
        <div className="flex flex-col items-center justify-center p-16 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          <p className="text-xs text-slate-400 font-bold">Loading problem statement and editor…</p>
        </div>
      </FullScreenShell>
    );
  }

  const languages = problem.languages?.length
    ? problem.languages
    : Object.keys(problem.starterCode || { python: '' });

  return (
    <FullScreenShell
      title={problem.title}
      subtitle={`Time limit: ${problem.timeLimitMs}ms · Online Code Execution`}
      icon="💻"
      currentPage="problem-solver"
      user={user}
      onNavigate={nav}
      onBack={onBack}
      onLogout={onLogout}
    >
      <div className="flex flex-col gap-5">
        {/* TOP STATUS BAR */}
        <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg shadow-slate-950/40">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black text-white truncate">{problem.title}</h1>
            <span
              className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                DIFF_CHIP[problem.difficulty] || 'bg-slate-800 text-slate-300'
              }`}
            >
              {problem.difficulty}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
            <span>⏱ {problem.timeLimitMs} ms execution limit</span>
            <span>💾 128 MB Memory</span>
          </div>
        </div>

        {/* SOLVED BANNER */}
        {submitOut?.allPassed && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow-xl shadow-emerald-900/40 p-4 text-center font-black text-base animate-pulse">
            🎉 Solved! All {submitOut.total} hidden test cases passed · Score: {submitOut.score}%
          </div>
        )}

        {/* TWO COLUMN WORKSPACE: STATEMENT (LEFT) & EDITOR (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* LEFT: STATEMENT */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-950/50 space-y-4">
            <div>
              <h2 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span>📄</span> Problem Description
              </h2>
              <div className="text-sm text-slate-200 leading-relaxed space-y-3">
                <RichText text={problem.statement} />
              </div>
            </div>

            {problem.constraints && (
              <div className="pt-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <span>📐</span> Constraints
                </h3>
                <div className="text-xs text-slate-300 bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 leading-relaxed font-mono">
                  <RichText text={problem.constraints} />
                </div>
              </div>
            )}

            {(problem.sampleIo || []).map((io, i) => (
              <div key={i} className="pt-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <span>🧪</span> Example Test Case {i + 1}
                </h3>
                <div className="text-xs bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 font-mono space-y-2 text-slate-200">
                  <div>
                    <span className="text-indigo-400 font-bold block mb-0.5">Input:</span>
                    <pre className="whitespace-pre-wrap text-slate-300">{io.input}</pre>
                  </div>
                  <div className="pt-1 border-t border-slate-800">
                    <span className="text-emerald-400 font-bold block mb-0.5">Expected Output:</span>
                    <pre className="whitespace-pre-wrap text-slate-300">{io.output}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT: EDITOR */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-950/50 flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Language:</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {languages.map((l) => (
                    <option key={l} value={l}>
                      {l.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={busy !== null}
                  onClick={run}
                  className="px-4 py-2 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <span>▶</span> {busy === 'run' ? 'Running…' : 'Run Tests'}
                </button>
                <button
                  disabled={busy !== null}
                  onClick={submit}
                  className="px-5 py-2 rounded-xl font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs transition shadow-lg shadow-emerald-900/40 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <span>✓</span> {busy === 'submit' ? 'Judging…' : 'Submit Solution'}
                </button>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-slate-700/80">
              <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>solution.{language === 'python' ? 'py' : language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : 'js'}</span>
                <span>Tab = 2 spaces</span>
              </div>
              <textarea
                ref={editorRef}
                value={currentCode}
                onChange={(e) => updateCode(e.target.value)}
                onKeyDown={onEditorKeyDown}
                spellCheck={false}
                rows={16}
                className="w-full border-none p-4 font-mono text-xs sm:text-sm bg-slate-950 text-slate-100 resize-y focus:outline-none focus:ring-0 leading-relaxed"
              />
            </div>

            {actionError && (
              <div className="bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs rounded-xl p-3">
                {actionError}
              </div>
            )}

            {/* RUN SAMPLES OUTPUT */}
            {runOut && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono space-y-3">
                <div className="font-black text-white flex items-center justify-between">
                  <span>Sample Results: {runOut.passed}/{runOut.total} Passed</span>
                  <span className={runOut.passed === runOut.total ? 'text-emerald-400' : 'text-rose-400'}>
                    {runOut.passed === runOut.total ? 'All Passed' : 'Tests Failed'}
                  </span>
                </div>
                {runOut.results.map((r) => (
                  <div key={r.case} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className={r.passed ? 'text-emerald-400' : 'text-rose-400'}>
                        Case {r.case}: {r.status}
                      </span>
                      {r.timeSec != null && <span className="text-slate-500">{r.timeSec}s</span>}
                    </div>
                    {!r.passed && r.stdout != null && (
                      <div className="text-slate-400 text-[11px] mt-1 space-y-1">
                        <div><span className="text-slate-500">Output:</span> {JSON.stringify(r.stdout?.slice(0, 200))}</div>
                        <div><span className="text-slate-500">Expected:</span> {JSON.stringify(r.expected?.slice(0, 200))}</div>
                      </div>
                    )}
                    {r.stderr && (
                      <pre className="text-amber-400 text-[11px] whitespace-pre-wrap mt-1">
                        {r.stderr.slice(0, 400)}
                      </pre>
                    )}
                    {r.compileOutput && (
                      <pre className="text-amber-400 text-[11px] whitespace-pre-wrap mt-1">
                        {r.compileOutput.slice(0, 400)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* SUBMIT VERDICT */}
            {submitOut && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono space-y-3">
                <div className={`font-black text-sm flex items-center justify-between ${submitOut.allPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <span>{submitOut.allPassed ? '✅ Accepted' : '❌ Not Accepted'}</span>
                  <span>{submitOut.passed}/{submitOut.total} Hidden Tests Passed ({submitOut.score}%)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {submitOut.breakdown.map((b) => (
                    <div
                      key={b.case}
                      className={`p-2 rounded-lg border text-center ${
                        b.status === 'Accepted'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <div className="font-bold text-[11px]">Case {b.case}</div>
                      <div className="text-[10px] text-slate-400 truncate">{b.status}</div>
                    </div>
                  ))}
                </div>
                {submitOut.compileOutput && (
                  <pre className="text-amber-400 text-xs whitespace-pre-wrap mt-2 p-3 bg-slate-900 rounded-xl">
                    {submitOut.compileOutput.slice(0, 500)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </FullScreenShell>
  );
};
export default ProblemSolver;
