import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface TutorialData {
  title: string;
  introduction: string;
  keyConcepts: { term: string; explanation: string }[];
  examples: { description: string; code?: string }[];
  summary: string;
  readyMessage: string;
}

interface ConceptTutorialProps {
  topicId: string;
  onReadyToPlay: () => void;
  onBack: () => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const ConceptTutorial: React.FC<ConceptTutorialProps> = ({
  topicId,
  onReadyToPlay,
  onBack,
  user,
  onNavigate = () => {},
  onLogout,
}) => {
  const [data, setData] = useState<TutorialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTutorial = async () => {
      try {
        const response = await apiClient.get<TutorialData>(`/domains/tutorial/${topicId}`);
        setData(response);
      } catch (error) {
        console.error('Failed to load tutorial', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTutorial();
  }, [topicId]);

  return (
    <FullScreenShell
      title={data?.title || 'Concept Tutorial'}
      subtitle="Master fundamental intuition and key patterns before jumping into challenges"
      currentPage="concept-tutorial"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={onBack}
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition"
        >
          ← Back to Journey
        </button>

        {loading || !data ? (
          <div className="flex flex-col justify-center items-center py-24 text-center">
            <div className="text-6xl mb-6 animate-bounce">🤖</div>
            <h2 className="text-xl font-bold text-white mb-2">AI is generating your lesson...</h2>
            <p className="text-xs text-slate-400">Synthesizing key patterns, intuition, and runnable code examples.</p>
          </div>
        ) : (
          <div className="bg-slate-900/90 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
            {/* Hero Banner */}
            <div className="bg-gradient-to-r from-indigo-900/80 via-violet-900/80 to-purple-900/80 p-8 sm:p-10 border-b border-indigo-500/20 text-white">
              <div className="inline-block px-3 py-1 bg-indigo-500/20 border border-indigo-500/40 rounded-full text-xs font-bold uppercase tracking-widest text-indigo-300 mb-3">
                Concept Tutorial
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-3">{data.title}</h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                {data.introduction}
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              {/* Key Concepts */}
              <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-indigo-400">🔑</span> Key Concepts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.keyConcepts.map((c, i) => (
                    <div
                      key={i}
                      className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition"
                    >
                      <h3 className="font-bold text-indigo-400 mb-1.5 text-sm">{c.term}</h3>
                      <p className="text-slate-300 leading-relaxed text-xs">{c.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Examples */}
              {data.examples && data.examples.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-indigo-400">💡</span> Practical Examples
                  </h2>
                  <div className="space-y-4">
                    {data.examples.map((ex, i) => (
                      <div
                        key={i}
                        className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800"
                      >
                        <p className="font-medium text-slate-200 text-xs mb-3">{ex.description}</p>
                        {ex.code && (
                          <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl overflow-x-auto font-mono text-xs border border-slate-800 shadow-inner">
                            <code>{ex.code}</code>
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl">
                <h3 className="font-bold text-amber-300 mb-1 text-sm">Summary</h3>
                <p className="text-slate-300 text-xs leading-relaxed">{data.summary}</p>
              </div>

              {/* Ready CTA */}
              <div className="text-center pt-4">
                <p className="text-slate-400 italic text-xs mb-5">{data.readyMessage}</p>
                <button
                  onClick={onReadyToPlay}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-base py-4 px-10 rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition"
                >
                  🎮 I'm Ready, Let's Play!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
