import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';
import { FullScreenShell } from '../../components/FullScreenShell';

interface Answer {
  text: string;
  quality: 'strong' | 'weak-vague' | 'weak-blame' | 'weak-generic';
  why: string;
}
interface Payload {
  id: string;
  payload: {
    question: string;
    category: string;
    answers: Answer[];
    correctIndex: number;
  };
}

const QUALITY_LABEL: Record<string, { label: string; color: string }> = {
  strong: {
    label: '✓ Strong STAR answer',
    color: 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300',
  },
  'weak-vague': {
    label: 'Vague — missing specific actions',
    color: 'bg-amber-950/30 border-amber-500/40 text-amber-300',
  },
  'weak-blame': {
    label: 'Blaming others / red flag',
    color: 'bg-rose-950/30 border-rose-500/40 text-rose-300',
  },
  'weak-generic': {
    label: 'Generic / textbook cliché',
    color: 'bg-slate-800 border-slate-700 text-slate-300',
  },
};

interface StarRoleplayGameProps {
  onBack: () => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const StarRoleplayGame: React.FC<StarRoleplayGameProps> = ({
  onBack,
  user,
  onNavigate = () => {},
  onLogout,
}) => {
  const [round, setRound] = useState(0);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    setData(null);
    setPicked(null);
    setError(null);
    apiClient
      .get<Payload>('/games-content/star-roleplay/random')
      .then(setData)
      .catch(() => setError('Could not load a scenario — try again.'));
  }, [round]);

  return (
    <FullScreenShell
      title="STAR Roleplay"
      subtitle="Identify high-impact behavioral answers following the STAR framework"
      currentPage="game-star-roleplay"
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
            Scenario {round + 1}
          </div>
        </div>

        {error ? (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-6 rounded-2xl text-center text-xs">
            {error}
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-slate-500 font-medium animate-pulse">
            Loading scenario…
          </div>
        ) : (
          (() => {
            const p = data.payload;
            const correctIndex = p.correctIndex;
            const isCorrect = picked === correctIndex;

            return (
              <div className="bg-slate-900/90 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800">
                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1.5">
                  🗣 HR Roleplay · {p.category}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white mb-2 leading-relaxed">
                  {p.question}
                </h1>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Which candidate response best demonstrates the Situation-Task-Action-Result format?
                </p>

                <div className="space-y-3 mb-6">
                  {p.answers.map((a, idx) => {
                    const isSelected = picked === idx;
                    const meta = QUALITY_LABEL[a.quality] || QUALITY_LABEL['weak-generic'];

                    return (
                      <div
                        key={idx}
                        onClick={() => picked === null && setPicked(idx)}
                        className={`p-4 rounded-2xl border transition-all ${
                          picked === null
                            ? 'cursor-pointer border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/60'
                            : isSelected
                            ? idx === correctIndex
                              ? 'border-emerald-500/40 bg-emerald-950/30'
                              : 'border-rose-500/40 bg-rose-950/30'
                            : idx === correctIndex
                            ? 'border-emerald-500/40 bg-emerald-950/20'
                            : 'border-slate-800 bg-slate-950/30 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="text-xs font-black text-slate-500">Candidate {idx + 1}</span>
                          {picked !== null && (
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${meta.color}`}>
                              {meta.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{a.text}</p>
                        {picked !== null && (
                          <div className="mt-3 text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
                            <b className="text-indigo-400">Why:</b> {a.why}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {picked !== null && (
                  <div className="space-y-3">
                    <div
                      className={`p-4 rounded-2xl text-center border ${
                        isCorrect
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <span className="font-black text-sm">
                        {isCorrect ? '🎯 Excellent Pick!' : '❌ Missed the Mark'}
                      </span>
                      <p className="text-xs mt-1 opacity-80">
                        {isCorrect
                          ? 'You picked the response that clearly highlights quantifiable individual contribution.'
                          : 'Review the candidate feedback above to see why other responses were penalized.'}
                      </p>
                    </div>

                    <button
                      onClick={() => setRound(round + 1)}
                      className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/25 active:scale-95 transition"
                    >
                      🔄 Next Scenario
                    </button>
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
