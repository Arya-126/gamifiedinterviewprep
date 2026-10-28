import React, { useMemo, useState } from 'react';
import { FullScreenShell } from '../../components/FullScreenShell';

// Complexity Sort — drag/click to arrange algorithm names in Big-O order.
// Static data, no server call. Presents 5 shuffled algorithms per round.

interface Algo {
  name: string;
  complexity: string;
  rank: number; // canonical order (lower = faster growth = "smaller")
}

const BANK: Algo[] = [
  { name: 'Binary Search', complexity: 'O(log n)', rank: 2 },
  { name: 'Access array by index', complexity: 'O(1)', rank: 1 },
  { name: 'Linear Search', complexity: 'O(n)', rank: 3 },
  { name: 'Merge Sort', complexity: 'O(n log n)', rank: 4 },
  { name: 'Quick Sort (avg)', complexity: 'O(n log n)', rank: 4 },
  { name: 'Heap Sort', complexity: 'O(n log n)', rank: 4 },
  { name: 'Bubble Sort', complexity: 'O(n²)', rank: 5 },
  { name: 'Insertion Sort (worst)', complexity: 'O(n²)', rank: 5 },
  { name: 'Selection Sort', complexity: 'O(n²)', rank: 5 },
  { name: 'Naive DFS on adjacency matrix', complexity: 'O(V²)', rank: 5 },
  { name: 'BFS on adjacency list', complexity: 'O(V + E)', rank: 3 },
  { name: 'Dijkstra (min-heap)', complexity: 'O((V+E) log V)', rank: 4 },
  { name: 'Floyd-Warshall (all pairs)', complexity: 'O(V³)', rank: 6 },
  { name: 'Bellman-Ford', complexity: 'O(V·E)', rank: 5 },
  { name: 'Naive Fibonacci (recursive)', complexity: 'O(2ⁿ)', rank: 7 },
  { name: 'DP Fibonacci', complexity: 'O(n)', rank: 3 },
  { name: 'Traveling Salesman (brute)', complexity: 'O(n!)', rank: 8 },
  { name: 'HashMap lookup (avg)', complexity: 'O(1)', rank: 1 },
  { name: 'BST search (balanced)', complexity: 'O(log n)', rank: 2 },
  { name: 'Coin change DP', complexity: 'O(n·amount)', rank: 4 },
];

function sampleFive(): Algo[] {
  const copy = [...BANK];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, 5);
}

function isSortedAscending(list: Algo[]): boolean {
  for (let i = 1; i < list.length; i++) if (list[i - 1].rank > list[i].rank) return false;
  return true;
}

interface ComplexitySortGameProps {
  onBack: () => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const ComplexitySortGame: React.FC<ComplexitySortGameProps> = ({
  onBack,
  user,
  onNavigate = () => {},
  onLogout,
}) => {
  const [round, setRound] = useState(0);
  const initial = useMemo(() => sampleFive(), [round]);
  const [order, setOrder] = useState<Algo[]>(initial);
  const [result, setResult] = useState<null | { correct: boolean; score: number }>(null);

  React.useEffect(() => {
    setOrder(initial);
    setResult(null);
  }, [initial]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    setOrder(next);
  };

  const check = () => {
    const correct = isSortedAscending(order);
    let goodPairs = 0;
    for (let i = 1; i < order.length; i++) if (order[i - 1].rank <= order[i].rank) goodPairs++;
    const score = Math.round((goodPairs / (order.length - 1)) * 100);
    setResult({ correct, score });
  };

  return (
    <FullScreenShell
      title="Complexity Sort"
      subtitle="Arrange algorithms from fastest to slowest growth order"
      currentPage="game-complexity-sort"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <button
            onClick={onBack}
            className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 transition"
          >
            ← Back
          </button>
          <div className="text-xs font-black uppercase tracking-widest text-indigo-400">
            Round {round + 1}
          </div>
        </div>

        <div className="bg-slate-900/90 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800">
          <h1 className="text-2xl font-black text-white mb-1">📊 Complexity Sort</h1>
          <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
            Arrange these algorithms from <b className="text-emerald-400">fastest growth</b> (O(1) at top) to{' '}
            <b className="text-rose-400">slowest</b> (O(n!) at bottom).
          </p>

          <div className="space-y-2.5">
            {order.map((a, idx) => (
              <div
                key={a.name + idx}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                  result
                    ? isSortedAscending(order.slice(0, idx + 1)) &&
                      (idx === 0 || order[idx - 1].rank <= a.rank)
                      ? 'border-emerald-500/40 bg-emerald-950/20'
                      : 'border-rose-500/40 bg-rose-950/20'
                    : 'border-slate-800 bg-slate-950/60'
                }`}
              >
                <div className="text-xs font-black text-slate-500 w-6">{idx + 1}</div>
                <div className="flex-1 font-bold text-sm text-white">{a.name}</div>
                {result && (
                  <span className="text-xs font-black text-indigo-400 font-mono bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                    {a.complexity}
                  </span>
                )}
                {!result && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => move(idx, idx - 1)}
                      disabled={idx === 0}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 font-black text-sm border border-slate-700 flex items-center justify-center transition"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => move(idx, idx + 1)}
                      disabled={idx === order.length - 1}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 font-black text-sm border border-slate-700 flex items-center justify-center transition"
                    >
                      ↓
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {result ? (
            <div
              className={`mt-6 p-5 rounded-2xl text-center border ${
                result.correct
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="text-4xl font-black">{result.score}%</div>
              <div className="text-xs font-bold mt-1">
                {result.correct ? '🎉 Perfect order!' : 'Nice try — check the complexities above.'}
              </div>
            </div>
          ) : (
            <button
              onClick={check}
              className="w-full mt-6 py-3.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-500/25 active:scale-95 transition"
            >
              Check My Order
            </button>
          )}

          {result && (
            <button
              onClick={() => setRound(round + 1)}
              className="w-full mt-3 py-3 rounded-xl font-bold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            >
              🔄 Play Again
            </button>
          )}
        </div>
      </div>
    </FullScreenShell>
  );
};
