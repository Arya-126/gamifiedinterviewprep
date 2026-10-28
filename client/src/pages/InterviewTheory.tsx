import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface TheoryData {
  id: string;
  topicId: string;
  rawTheory: string;
  keyPoints: string[];
  formulas: string[];
  tutorialSections: { heading: string; content: string | string[] }[];
}

export interface InterviewTheoryProps {
  topicId: string;
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onReadyToPractice: () => void;
  onStudyGames?: () => void;
  onBack: () => void;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const InterviewTheory: React.FC<InterviewTheoryProps> = ({
  topicId,
  user,
  onReadyToPractice,
  onStudyGames,
  onBack,
  onNavigate,
  onLogout,
}) => {
  const [theory, setTheory] = useState<TheoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTheory = async () => {
      try {
        const data = await apiClient.get<TheoryData>(`/interview/topics/${topicId}/theory`);
        setTheory(data);
      } catch (e: any) {
        setError('Theory notes are not available for this topic yet.');
      } finally {
        setLoading(false);
      }
    };
    fetchTheory();
  }, [topicId]);

  const nav = onNavigate || (() => {});

  const handleRefreshNotes = async () => {
    setCleaning(true);
    try {
      const data = await apiClient.post<any>('/interview/admin/cleanup-theory', { topicId });
      setTheory((prev) =>
        prev
          ? {
              ...prev,
              keyPoints: data.keyPoints,
              formulas: data.formulas,
              tutorialSections: data.tutorialSections,
            }
          : null
      );
    } catch (e: any) {
      alert('Failed to clean up notes: ' + (e.error || e.message));
    } finally {
      setCleaning(false);
    }
  };

  if (loading) {
    return (
      <FullScreenShell
        title="Loading Notes…"
        subtitle="Preparing topic theory"
        icon="📖"
        currentPage="interview-theory"
        user={user}
        onNavigate={nav}
        onBack={onBack}
        onLogout={onLogout}
      >
        <div className="flex flex-col items-center justify-center p-16 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          <p className="text-xs text-slate-400 font-bold">Loading comprehensive theory notes…</p>
        </div>
      </FullScreenShell>
    );
  }

  if (error || !theory) {
    return (
      <FullScreenShell
        title="Theory Notes"
        subtitle="Topic study notes"
        icon="📖"
        currentPage="interview-theory"
        user={user}
        onNavigate={nav}
        onBack={onBack}
        onLogout={onLogout}
      >
        <div className="max-w-xl mx-auto text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl my-8">
          <div className="text-4xl mb-3">📚</div>
          <div className="text-slate-300 text-sm font-semibold mb-6">
            {error || 'Theory not available for this topic yet.'}
          </div>
          <button
            onClick={onBack}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
          >
            ← Back to Topics
          </button>
        </div>
      </FullScreenShell>
    );
  }

  return (
    <FullScreenShell
      title="Study Notes & Theory"
      subtitle="Formulas, key concepts & solved examples"
      icon="📖"
      currentPage="interview-theory"
      user={user}
      onNavigate={nav}
      onBack={onBack}
      onLogout={onLogout}
    >
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* TOP BAR WITH AI REFRESH */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg shadow-slate-950/40">
          <div>
            <h2 className="text-xl font-black text-white">Comprehensive Theory Drill</h2>
            <p className="text-xs text-slate-400 mt-0.5">High-yield revision notes & formulas for written rounds</p>
          </div>
          <button
            onClick={handleRefreshNotes}
            disabled={cleaning}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {cleaning ? (
              <>
                <div className="animate-spin h-3.5 w-3.5 border-2 border-indigo-400 border-t-transparent rounded-full"></div>
                <span>Regenerating Notes…</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>AI Enhance Notes</span>
              </>
            )}
          </button>
        </div>

        {/* CONTENT CARD */}
        <div className="bg-slate-900/90 rounded-3xl shadow-xl shadow-slate-950/50 border border-slate-800 p-6 sm:p-8 space-y-8">
          {/* Key Points */}
          {theory.keyPoints && theory.keyPoints.length > 0 && (
            <div>
              <h3 className="text-lg font-black text-indigo-400 mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                <span>⚡</span> Key Placement Concepts
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-slate-300 text-sm leading-relaxed">
                {theory.keyPoints.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Formulas */}
          {theory.formulas && theory.formulas.length > 0 && (
            <div>
              <h3 className="text-lg font-black text-emerald-400 mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                <span>📐</span> High-Frequency Formulas
              </h3>
              <div className="bg-emerald-500/10 rounded-2xl p-5 border border-emerald-500/30">
                <ul className="list-disc pl-5 space-y-2 text-emerald-200 text-sm font-mono leading-relaxed">
                  {theory.formulas.map((formula, idx) => (
                    <li key={idx}>{formula}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Tutorial Sections */}
          {theory.tutorialSections &&
            theory.tutorialSections.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-lg font-black text-white mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <span>📌</span> {section.heading}
                </h3>
                {Array.isArray(section.content) ? (
                  <ul className="list-disc pl-5 space-y-2 text-slate-300 text-sm leading-relaxed">
                    {section.content.map((item, itemIdx) => (
                      <li key={itemIdx}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                    {section.content}
                  </p>
                )}
              </div>
            ))}
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex flex-wrap justify-center gap-4 py-4">
          <button
            onClick={onReadyToPractice}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm sm:text-base py-3.5 px-8 rounded-2xl shadow-xl shadow-emerald-900/40 transition active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span>🎮</span> Ready to Practice (Quiz)
          </button>
          {onStudyGames && (
            <button
              onClick={onStudyGames}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-sm sm:text-base py-3.5 px-8 rounded-2xl transition active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <span>⚡</span> Study with Mini-Games
            </button>
          )}
        </div>
      </div>
    </FullScreenShell>
  );
};
export default InterviewTheory;
