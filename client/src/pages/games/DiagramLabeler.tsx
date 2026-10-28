import React, { useEffect, useMemo, useState } from 'react';
import { DIAGRAM_PUZZLES, DiagramPuzzle, DiagramSlot } from './diagramLabelerData';
import { FullScreenShell } from '../../components/FullScreenShell';

function shuffle<T>(a: T[]): T[] {
  const c = [...a];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

const SLOT_DEFAULT_W = 130;
const SLOT_DEFAULT_H = 30;

interface DiagramLabelerGameProps {
  onBack: () => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const DiagramLabelerGame: React.FC<DiagramLabelerGameProps> = ({
  onBack,
  user,
  onNavigate = () => {},
  onLogout,
}) => {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * DIAGRAM_PUZZLES.length));
  const puzzle: DiagramPuzzle = DIAGRAM_PUZZLES[idx];

  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const labelPool = useMemo(() => {
    const correct = puzzle.slots.map((s) => s.correctLabel);
    return shuffle([...correct, ...(puzzle.decoys || [])]);
  }, [puzzle]);

  useEffect(() => {
    setAssigned({});
    setSelectedLabel(null);
    setChecked(false);
  }, [idx]);

  const usedLabels = new Set(Object.values(assigned).filter(Boolean));

  const placeInSlot = (slot: DiagramSlot) => {
    if (checked) return;
    if (!selectedLabel) {
      if (assigned[slot.id]) {
        const next = { ...assigned };
        delete next[slot.id];
        setAssigned(next);
      }
      return;
    }
    setAssigned({ ...assigned, [slot.id]: selectedLabel });
    setSelectedLabel(null);
  };

  const clickChip = (label: string) => {
    if (checked) return;
    if (usedLabels.has(label)) return;
    setSelectedLabel(selectedLabel === label ? null : label);
  };

  const check = () => setChecked(true);

  const correctCount = puzzle.slots.filter((s) => assigned[s.id] === s.correctLabel).length;
  const total = puzzle.slots.length;
  const pct = Math.round((correctCount / total) * 100);
  const allFilled = puzzle.slots.every((s) => !!assigned[s.id]);

  const nextPuzzle = () => {
    if (DIAGRAM_PUZZLES.length <= 1) {
      setIdx(idx);
      return;
    }
    let next = idx;
    while (next === idx) next = Math.floor(Math.random() * DIAGRAM_PUZZLES.length);
    setIdx(next);
  };

  return (
    <FullScreenShell
      title="Diagram Labeler"
      subtitle="Interactive architectural and system concept diagram labeling drill"
      currentPage="game-diagram-labeler"
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
          <div className="text-xs font-black uppercase tracking-widest text-indigo-400">
            📐 {puzzle.subject}
          </div>
        </div>

        <div className="bg-slate-900/90 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800">
          <h1 className="text-xl sm:text-2xl font-black text-white mb-1">{puzzle.title}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mb-4">{puzzle.description}</p>

          {!selectedLabel && !checked && (
            <div className="text-xs text-slate-400 italic mb-3">
              Tap a label chip below → then tap the diagram slot to place it.
            </div>
          )}
          {selectedLabel && !checked && (
            <div className="text-xs font-bold text-indigo-300 mb-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-3 py-2 inline-block">
              Selected: “{selectedLabel}” — tap an open slot to place
            </div>
          )}

          {/* SVG Diagram Canvas */}
          <div className="border border-slate-800 rounded-2xl bg-slate-950 p-4 overflow-x-auto shadow-inner">
            <svg
              viewBox={puzzle.svgViewBox}
              className="w-full max-w-[580px] mx-auto block"
              style={{ minHeight: 280 }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <g dangerouslySetInnerHTML={{ __html: puzzle.bgSvg }} />
              {puzzle.slots.map((s) => {
                const w = s.w ?? SLOT_DEFAULT_W;
                const h = s.h ?? SLOT_DEFAULT_H;
                const x = s.x - w / 2;
                const y = s.y - h / 2;
                const value = assigned[s.id];
                const isCorrect = checked && value === s.correctLabel;
                const isWrong = checked && !!value && value !== s.correctLabel;
                const empty = !value;
                const fill = checked
                  ? isCorrect
                    ? '#064e3b'
                    : isWrong
                    ? '#7f1d1d'
                    : '#1e293b'
                  : empty
                  ? '#090d16'
                  : '#1e1b4b';
                const stroke = checked
                  ? isCorrect
                    ? '#10b981'
                    : isWrong
                    ? '#f43f5e'
                    : '#475569'
                  : selectedLabel
                  ? '#818cf8'
                  : '#334155';

                return (
                  <g
                    key={s.id}
                    onClick={() => placeInSlot(s)}
                    style={{ cursor: checked ? 'default' : 'pointer' }}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx={8}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={selectedLabel && !checked ? 2 : 1.5}
                      strokeDasharray={empty && !checked ? '4 3' : undefined}
                    />
                    <text
                      x={s.x}
                      y={s.y + 4}
                      fontSize="12"
                      fontWeight="700"
                      textAnchor="middle"
                      fill={empty ? '#64748b' : '#f8fafc'}
                    >
                      {value || 'tap to place'}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Label Pool */}
          <div className="mt-5">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Available Labels
            </div>
            <div className="flex flex-wrap gap-2">
              {labelPool.map((lbl, i) => {
                const isUsed = usedLabels.has(lbl);
                const isSelected = selectedLabel === lbl;
                let chipStyle =
                  'bg-slate-800 text-slate-200 border-slate-700 hover:border-indigo-500 hover:bg-slate-750 cursor-pointer';
                if (isUsed) {
                  chipStyle = 'bg-slate-950/50 text-slate-600 border-slate-850 opacity-40 cursor-not-allowed';
                } else if (isSelected) {
                  chipStyle =
                    'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30';
                }

                return (
                  <button
                    key={i}
                    onClick={() => clickChip(lbl)}
                    disabled={isUsed || checked}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${chipStyle}`}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-slate-800">
            {!checked ? (
              <button
                onClick={check}
                disabled={!allFilled}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-md shadow-indigo-500/20 disabled:opacity-40 transition"
              >
                {allFilled
                  ? 'Check Labels'
                  : `Place All ${puzzle.slots.length} Labels to Check (${Object.keys(assigned).length}/${puzzle.slots.length})`}
              </button>
            ) : (
              <button
                onClick={nextPuzzle}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-md transition"
              >
                🔄 Next Diagram
              </button>
            )}
          </div>

          {checked && (
            <div
              className={`mt-4 p-4 rounded-xl text-xs border ${
                pct === 100
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
              }`}
            >
              <b>{pct === 100 ? '🎉 All labels placed correctly!' : 'Keep practicing!'}</b> You got{' '}
              {correctCount} of {total} slots right ({pct}%).
            </div>
          )}
        </div>
      </div>
    </FullScreenShell>
  );
};
