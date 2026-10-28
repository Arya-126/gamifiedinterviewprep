import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../services/api';
import { FullScreenShell } from '../../components/FullScreenShell';

interface Payload {
  id: string;
  payload: {
    problemTitle: string;
    language: string;
    statement: string;
    buggyCode: string;
    bugLines: number[]; // 1-indexed
    bugDescriptions: string[];
    hint: string;
  };
}

interface BugHuntGameProps {
  onBack: () => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const BugHuntGame: React.FC<BugHuntGameProps> = ({
  onBack,
  user,
  onNavigate = () => {},
  onLogout,
}) => {
  const [round, setRound] = useState(0);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const [hintShown, setHintShown] = useState(false);

  useEffect(() => {
    setData(null);
    setPicked(new Set());
    setChecked(false);
    setHintShown(false);
    setError(null);
    apiClient
      .get<Payload>('/games-content/bug-hunt/random')
      .then(setData)
      .catch((e) =>
        setError(
          e?.message ||
            'Could not load a puzzle. Try running the batch generator (scripts/generate-game-content.ts).'
        )
      );
  }, [round]);

  const lines = useMemo(() => {
    if (!data) return [];
    return data.payload.buggyCode.replace(/\r\n/g, '\n').split('\n');
  }, [data]);

  const bugSet = useMemo(() => new Set(data?.payload.bugLines || []), [data]);
  const requiredCount = bugSet.size;

  const togglePick = (lineNum: number) => {
    if (checked) return;
    const next = new Set(picked);
    next.has(lineNum) ? next.delete(lineNum) : next.add(lineNum);
    setPicked(next);
  };

  const check = () => setChecked(true);

  const correctPicks = [...picked].filter((l) => bugSet.has(l)).length;
  const isPerfect = checked && correctPicks === requiredCount && picked.size === requiredCount;

  return (
    <FullScreenShell
      title="Bug Hunt"
      subtitle="Identify defect lines in code implementations"
      currentPage="game-bug-hunt"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <button
            onClick={onBack}
            className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 transition"
          >
            ← Back
          </button>
          <div className="text-xs font-black uppercase tracking-widest text-indigo-400">
            Puzzle {round + 1}
          </div>
        </div>

        {error ? (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-6 rounded-2xl text-center text-xs">
            {error}
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-slate-500 font-medium animate-pulse">
            Loading Bug Hunt puzzle…
          </div>
        ) : (
          (() => {
            const p = data.payload;

            return (
              <div className="bg-slate-900/90 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                    🐞 Bug Hunt · {p.language}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    ({requiredCount} bug{requiredCount > 1 ? 's' : ''})
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white mb-2">{p.problemTitle}</h1>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">{p.statement}</p>

                {/* Code display */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs mb-5 shadow-inner">
                  {lines.map((line, idx) => {
                    const lineNum = idx + 1;
                    const isBug = bugSet.has(lineNum);
                    const isPicked = picked.has(lineNum);

                    let rowStyle = 'hover:bg-slate-900/60 cursor-pointer';
                    if (checked) {
                      if (isBug && isPicked) rowStyle = 'bg-emerald-950/40 text-emerald-300';
                      else if (isBug && !isPicked) rowStyle = 'bg-amber-950/40 text-amber-300';
                      else if (!isBug && isPicked) rowStyle = 'bg-rose-950/40 text-rose-300';
                      else rowStyle = 'opacity-60';
                    } else if (isPicked) {
                      rowStyle = 'bg-indigo-950/50 text-indigo-300 border-l-2 border-indigo-400';
                    }

                    return (
                      <div
                        key={lineNum}
                        onClick={() => togglePick(lineNum)}
                        className={`flex items-start px-4 py-1.5 transition-colors select-none ${rowStyle}`}
                      >
                        <span className="text-slate-600 w-8 select-none font-bold text-right pr-3 shrink-0">
                          {lineNum}
                        </span>
                        <pre className="flex-1 whitespace-pre overflow-x-auto text-slate-200">
                          {line || ' '}
                        </pre>
                        {checked && isBug && (
                          <span className="text-[10px] uppercase font-bold text-emerald-400 ml-2">
                            bug
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2.5 mb-4">
                  {!checked ? (
                    <button
                      onClick={check}
                      disabled={picked.size === 0}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-md shadow-indigo-500/20 disabled:opacity-40 transition"
                    >
                      Check {picked.size} Selection{picked.size !== 1 ? 's' : ''}
                    </button>
                  ) : (
                    <button
                      onClick={() => setRound(round + 1)}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-md transition"
                    >
                      🔄 Next Puzzle
                    </button>
                  )}

                  {!checked && (
                    <button
                      onClick={() => setHintShown(true)}
                      disabled={hintShown}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition disabled:opacity-40"
                    >
                      💡 Hint
                    </button>
                  )}
                </div>

                {hintShown && (
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3.5 rounded-xl text-xs mb-4">
                    <b>Hint:</b> {p.hint}
                  </div>
                )}

                {checked && (
                  <div
                    className={`p-4 rounded-xl text-xs border ${
                      isPerfect
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <b>{isPerfect ? '🎉 Spot on!' : '⚠ Not quite.'}</b> Found {correctPicks} of{' '}
                    {requiredCount} bug line{requiredCount > 1 ? 's' : ''}.
                    {p.bugDescriptions?.length > 0 && (
                      <ul className="list-disc ml-5 mt-2 space-y-1 text-slate-300">
                        {p.bugDescriptions.map((desc, i) => (
                          <li key={i}>{desc}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>
    </FullScreenShell>
  );
};
