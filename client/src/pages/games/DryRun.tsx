import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';
import { FullScreenShell } from '../../components/FullScreenShell';

interface Payload {
  id: string;
  payload: {
    problemTitle: string;
    language: string;
    snippet: string;
    input: string;
    expectedOutput: string;
    hint: string;
  };
}

function normalize(s: string): string {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0)
    .join('\n')
    .toLowerCase();
}

interface DryRunGameProps {
  onBack: () => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const DryRunGame: React.FC<DryRunGameProps> = ({
  onBack,
  user,
  onNavigate = () => {},
  onLogout,
}) => {
  const [round, setRound] = useState(0);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guess, setGuess] = useState('');
  const [checked, setChecked] = useState(false);
  const [hintShown, setHintShown] = useState(false);

  useEffect(() => {
    setData(null);
    setGuess('');
    setChecked(false);
    setHintShown(false);
    setError(null);
    apiClient
      .get<Payload>('/games-content/dry-run/random')
      .then(setData)
      .catch((e) => setError(e?.message || 'Could not load a puzzle. Try running the batch generator.'));
  }, [round]);

  return (
    <FullScreenShell
      title="Dry Run"
      subtitle="Predict code snippet output and trace algorithm execution"
      currentPage="game-dry-run"
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
            Loading a Dry-Run puzzle…
          </div>
        ) : (
          (() => {
            const p = data.payload;
            const isCorrect = checked && normalize(guess) === normalize(p.expectedOutput);

            return (
              <div className="bg-slate-900/90 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800">
                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1.5">
                  🧪 Dry-Run · {p.language}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white mb-2">{p.problemTitle}</h1>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Predict what this snippet prints. Trace variables step by step before answering.
                </p>

                {/* Code snippet */}
                <pre className="bg-slate-950 border border-slate-800 text-slate-200 rounded-2xl p-4 text-xs font-mono overflow-x-auto whitespace-pre mb-5 shadow-inner">
                  {p.snippet.trim()}
                </pre>

                {p.input && (
                  <div className="mb-5 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                    <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Input</div>
                    <code className="text-xs font-mono text-indigo-300">{p.input}</code>
                  </div>
                )}

                {/* Guess input */}
                <div className="mb-5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Your predicted output
                  </label>
                  <textarea
                    rows={3}
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    disabled={checked}
                    placeholder="Type the exact printed output here..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition disabled:opacity-60"
                  />
                </div>

                {/* Buttons */}
                <div className="flex flex-wrap gap-2.5 mb-4">
                  {!checked ? (
                    <button
                      onClick={() => setChecked(true)}
                      disabled={!guess.trim()}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-md shadow-indigo-500/20 disabled:opacity-40 transition"
                    >
                      Check Output
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
                      isCorrect
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <b>{isCorrect ? '🎉 Correct output!' : '❌ Incorrect.'}</b>
                    {!isCorrect && (
                      <div className="mt-2 text-slate-300">
                        <span className="font-bold text-slate-400">Expected:</span>
                        <pre className="mt-1 bg-slate-950 p-2.5 rounded border border-slate-800 text-emerald-400 font-mono text-xs whitespace-pre">
                          {p.expectedOutput.trim()}
                        </pre>
                      </div>
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
