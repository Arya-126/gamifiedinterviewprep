import React, { useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { SQL_PUZZLES, SqlPuzzle } from './sqlPuzzleData';
import { FullScreenShell } from '../../components/FullScreenShell';

type SqlDb = { exec: (q: string) => any[]; close: () => void };

// @ts-ignore
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let SqlLibPromise: Promise<any> | null = null;
async function loadSql() {
  if (!SqlLibPromise) {
    SqlLibPromise = (async () => {
      const initSqlJs = (await import('sql.js')).default;
      return initSqlJs({ locateFile: () => wasmUrl });
    })();
  }
  return SqlLibPromise;
}

function toCell(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  return String(v).trim();
}

function compareResult(
  actual: { columns: string[]; values: any[][] } | null,
  expected: { columns: string[]; values: any[][] },
  mustBeOrdered: boolean
): { ok: boolean; reason?: string } {
  if (!actual) return { ok: false, reason: 'Query returned no rows.' };
  if (actual.columns.length !== expected.columns.length) {
    return {
      ok: false,
      reason: `Wrong column count — got ${actual.columns.length}, expected ${expected.columns.length}.`,
    };
  }
  const actCols = actual.columns.map((c) => c.toLowerCase());
  const expCols = expected.columns.map((c) => c.toLowerCase());
  for (let i = 0; i < actCols.length; i++) {
    if (actCols[i] !== expCols[i]) {
      return {
        ok: false,
        reason: `Column ${i + 1} should be "${expected.columns[i]}", got "${actual.columns[i]}".`,
      };
    }
  }
  if (actual.values.length !== expected.values.length) {
    return {
      ok: false,
      reason: `Row count mismatch — got ${actual.values.length}, expected ${expected.values.length}.`,
    };
  }
  const norm = (rows: any[][]) => rows.map((r) => r.map(toCell));
  const A = norm(actual.values);
  const E = norm(expected.values);

  if (!mustBeOrdered) {
    const key = (r: string[]) => r.join('|||');
    const sortRows = (arr: string[][]) => [...arr].sort((a, b) => key(a).localeCompare(key(b)));
    const sortedA = sortRows(A);
    const sortedE = sortRows(E);
    for (let r = 0; r < sortedA.length; r++) {
      for (let c = 0; c < sortedA[r].length; c++) {
        if (sortedA[r][c] !== sortedE[r][c]) {
          return { ok: false, reason: `Value mismatch at row ${r + 1}, column "${expected.columns[c]}".` };
        }
      }
    }
    return { ok: true };
  }

  for (let r = 0; r < A.length; r++) {
    for (let c = 0; c < A[r].length; c++) {
      if (A[r][c] !== E[r][c]) {
        return {
          ok: false,
          reason: `Row ${r + 1}, column "${expected.columns[c]}" has "${A[r][c]}", expected "${E[r][c]}".`,
        };
      }
    }
  }
  return { ok: true };
}

const ResultTable: React.FC<{
  columns: string[];
  values: any[][];
  emptyText?: string;
  highlight?: 'ok' | 'err' | null;
}> = ({ columns, values, emptyText = 'No rows', highlight = null }) => {
  if (columns.length === 0 || values.length === 0) {
    return <div className="text-xs text-slate-500 italic py-2">{emptyText}</div>;
  }
  const borderCol =
    highlight === 'ok'
      ? 'border-emerald-500/40 bg-emerald-950/20'
      : highlight === 'err'
      ? 'border-rose-500/40 bg-rose-950/20'
      : 'border-slate-800 bg-slate-950/60';

  return (
    <div className={`overflow-x-auto rounded-xl border ${borderCol}`}>
      <table className="w-full text-left text-xs font-mono">
        <thead className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
          <tr>
            {columns.map((c, i) => (
              <th key={i} className="px-3 py-2">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80 text-slate-300">
          {values.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-850">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap">
                  {toCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface SqlPuzzleGameProps {
  onBack: () => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const SqlPuzzleGame: React.FC<SqlPuzzleGameProps> = ({
  onBack,
  user,
  onNavigate = () => {},
  onLogout,
}) => {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * SQL_PUZZLES.length));
  const puzzle: SqlPuzzle = SQL_PUZZLES[idx];

  const [sqlReady, setSqlReady] = useState(false);
  const [wasmError, setWasmError] = useState<string | null>(null);
  const sqlLibRef = useRef<any>(null);

  const [query, setQuery] = useState('');
  const [actual, setActual] = useState<{ columns: string[]; values: any[][] } | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [check, setCheck] = useState<{ ok: boolean; reason?: string } | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const [solutionShown, setSolutionShown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSql()
      .then((lib) => {
        if (!cancelled) {
          sqlLibRef.current = lib;
          setSqlReady(true);
        }
      })
      .catch((e) => {
        if (!cancelled) setWasmError(e?.message || 'Failed to load SQL engine');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setQuery('');
    setActual(null);
    setRunError(null);
    setCheck(null);
    setHintShown(false);
    setSolutionShown(false);
  }, [idx]);

  const runQuery = () => {
    if (!sqlReady || !sqlLibRef.current) return;
    setRunError(null);
    setCheck(null);
    let db: SqlDb | null = null;
    try {
      db = new sqlLibRef.current.Database();
      db!.exec(puzzle.schemaSql);
      const results = db!.exec(query);
      if (!results || results.length === 0) {
        setActual({ columns: [], values: [] });
      } else {
        const last = results[results.length - 1];
        setActual({ columns: last.columns as string[], values: last.values as any[][] });
      }
    } catch (e: any) {
      setRunError(e?.message || 'Query execution error');
      setActual(null);
    } finally {
      db?.close();
    }
  };

  const checkAnswer = () => {
    if (!actual) return;
    setCheck(compareResult(actual, puzzle.expectedResult, !!puzzle.mustBeOrdered));
  };

  const nextPuzzle = () => {
    if (SQL_PUZZLES.length <= 1) return;
    let next = idx;
    while (next === idx) next = Math.floor(Math.random() * SQL_PUZZLES.length);
    setIdx(next);
  };

  const diffColor =
    puzzle.difficulty === 'easy'
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
      : puzzle.difficulty === 'medium'
      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30';

  return (
    <FullScreenShell
      title="SQL Puzzle"
      subtitle="In-browser SQLite query sandbox with instant test verification"
      currentPage="game-sql-puzzle"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <button
            onClick={onBack}
            className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 transition"
          >
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md ${diffColor}`}>
              {puzzle.difficulty}
            </span>
            <span className="text-xs font-black uppercase text-indigo-400">{puzzle.subject}</span>
          </div>
        </div>

        {/* Puzzle prompt & schema */}
        <div className="bg-slate-900/90 p-6 rounded-3xl shadow-xl border border-slate-800">
          <h1 className="text-xl font-black text-white mb-2">{puzzle.title}</h1>
          <p className="text-xs sm:text-sm text-slate-300 mb-4 leading-relaxed">{puzzle.prompt}</p>

          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              Schema & Fixtures
            </div>
            <pre className="bg-slate-950 text-slate-300 rounded-xl p-3 text-xs font-mono overflow-x-auto whitespace-pre border border-slate-800/80 shadow-inner">
              {puzzle.schemaSql.trim()}
            </pre>
          </div>
        </div>

        {/* Editor & actions */}
        <div className="bg-slate-900/90 p-6 rounded-3xl shadow-xl border border-slate-800">
          <div className="flex justify-between items-center mb-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Your SQL Query
            </div>
            {!sqlReady && !wasmError && (
              <div className="text-xs text-amber-400 animate-pulse font-medium">
                Booting SQLite WASM engine…
              </div>
            )}
            {wasmError && <div className="text-xs text-rose-400">{wasmError}</div>}
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden" style={{ height: 200 }}>
            <Editor
              language="sql"
              value={query}
              theme="vs-dark"
              onChange={(v) => setQuery(v ?? '')}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              onClick={runQuery}
              disabled={!sqlReady || !query.trim()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 disabled:opacity-40 transition"
            >
              ▶ Run Query
            </button>
            <button
              onClick={checkAnswer}
              disabled={!actual || !!runError}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20 disabled:opacity-40 transition"
            >
              Check Answer
            </button>
            <button
              onClick={() => setHintShown(true)}
              disabled={hintShown}
              className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold disabled:opacity-40 transition"
            >
              💡 Hint
            </button>
            <button
              onClick={() => setSolutionShown(true)}
              disabled={solutionShown}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 text-xs font-bold disabled:opacity-40 transition"
            >
              Give up
            </button>
            <div className="flex-1" />
            <button
              onClick={nextPuzzle}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold shadow-md transition"
            >
              🔄 Next Puzzle
            </button>
          </div>

          {hintShown && (
            <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
              💡 <b>Hint:</b> {puzzle.hint}
            </div>
          )}
          {solutionShown && (
            <div className="mt-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] font-black uppercase text-indigo-400 mb-1">Reference solution</div>
              <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">{puzzle.solution.trim()}</pre>
            </div>
          )}
        </div>

        {/* Results display */}
        {(actual || runError) && (
          <div className="bg-slate-900/90 p-6 rounded-3xl shadow-xl border border-slate-800 space-y-3">
            {runError ? (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 font-mono whitespace-pre-wrap">
                {runError}
              </div>
            ) : (
              <>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Execution Output
                </div>
                <ResultTable
                  columns={actual!.columns}
                  values={actual!.values}
                  emptyText="(query executed successfully with 0 rows)"
                  highlight={check?.ok ? 'ok' : check?.ok === false ? 'err' : null}
                />
                {check && (
                  <div
                    className={`p-3.5 rounded-xl text-xs border ${
                      check.ok
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    <b>{check.ok ? '🎉 Correct!' : '❌ Output mismatch.'}</b> {check.reason || ''}
                  </div>
                )}
                {check && !check.ok && (
                  <div className="mt-3">
                    <div className="text-[10px] font-black uppercase text-emerald-400 mb-1.5">
                      Expected Output
                    </div>
                    <ResultTable columns={puzzle.expectedResult.columns} values={puzzle.expectedResult.values} />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
