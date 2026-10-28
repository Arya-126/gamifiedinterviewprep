import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';

// Per-company prep hub: pattern overview + an explainable Placement Readiness
// Index + the three ways to raise it (proctored pattern mock, targeted round
// drill, company-styled AI interview). Built on the existing /companies,
// /assessments and /ai-interview endpoints.

interface ReadinessComponent {
  key: string;
  label: string;
  value: number;
  weight: number;
  present: boolean;
}
interface NextAction {
  label: string;
  action: 'mock' | 'round-practice' | 'interview';
  target?: string[];
}
interface Readiness {
  score: number;
  confidence: number;
  components: ReadinessComponent[];
  nextActions: NextAction[];
  weakTopics: string[];
}
interface PrepPayload {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  notes: string | null;
  durationMinutes: number | null;
  negativeMarking: number;
  passScore: number | null;
  rounds: { title: string; kind: string; category?: string; count: number; difficultyMix: any }[];
  tracks: { role: string }[];
  attempts: { id: string; status: string; score: number | null; startedAt: string }[];
  interviews: { id: string; status: string; overallScore: number | null; role: string; startedAt: string }[];
  readiness: Readiness;
}

const ringColor = (score: number) =>
  score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : score >= 25 ? '#f97316' : '#ef4444';

export const CompanyPrep: React.FC<{
  slug: string;
  onBack: () => void;
  onStartTest: (testId: string) => void;
  onStartInterview: (role: string, companyId: string) => void;
}> = ({ slug, onBack, onStartTest, onStartInterview }) => {
  const [prep, setPrep] = useState<PrepPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [track, setTrack] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiClient
      .get<PrepPayload>(`/companies/${slug}/prep`)
      .then((p) => {
        setPrep(p);
        if (!track && p.tracks.length > 0) setTrack(p.tracks[0].role);
      })
      .catch(() => setError('Failed to load company prep'))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [slug]);

  const role = track || 'Software Engineer';

  const takeMock = async () => {
    if (!prep) return;
    setBusy('mock');
    try {
      const { testId } = await apiClient.post<{ testId: string }>(
        `/companies/${prep.id}/practice-test`,
        track ? { track } : {}
      );
      onStartTest(testId);
    } catch {
      setError('Could not build the pattern mock.');
    } finally {
      setBusy(null);
    }
  };

  const drill = async (action: NextAction) => {
    if (!prep) return;
    setBusy('drill');
    try {
      const body = action.target?.length
        ? { topicNames: action.target }
        : { category: prep.rounds[0]?.category || 'QUANTITATIVE' };
      const { testId } = await apiClient.post<{ testId: string }>(
        `/companies/${prep.id}/round-practice`,
        body
      );
      onStartTest(testId);
    } catch {
      setError('Could not build the practice drill.');
    } finally {
      setBusy(null);
    }
  };

  const runAction = (a: NextAction) => {
    if (!prep) return;
    if (a.action === 'mock') takeMock();
    else if (a.action === 'interview') onStartInterview(role, prep.id);
    else drill(a);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
        <p className="text-xs text-slate-400 font-bold">Loading company readiness…</p>
      </div>
    );
  }
  if (error && !prep) {
    return <div className="bg-rose-500/20 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-xs font-bold">{error}</div>;
  }
  if (!prep) return null;

  const r = prep.readiness;
  const C = 2 * Math.PI * 52; // ring circumference

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-rose-500/20 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs font-bold">
          {error}
        </div>
      )}

      {/* HEADER + READINESS */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/50 to-slate-900/80 border border-indigo-500/30 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-center shadow-2xl">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {prep.logoUrl && (
              <img src={prep.logoUrl} alt="" className="w-10 h-10 rounded-xl bg-slate-800 p-1 border border-slate-700" />
            )}
            <h1 className="text-2xl sm:text-3xl font-black">{prep.name}</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {prep.rounds.map((r) => `${r.title} (${r.count})`).join(' · ')}
            {prep.durationMinutes ? ` · ${prep.durationMinutes} min` : ''}
            {prep.negativeMarking > 0 ? ` · −${prep.negativeMarking}/wrong` : ''}
            {prep.passScore != null ? ` · pass ≥ ${prep.passScore}%` : ''}
          </p>
          {prep.tracks.length > 0 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-bold">Role track:</span>
              {prep.tracks.map((t) => (
                <button
                  key={t.role}
                  onClick={() => setTrack(t.role)}
                  className={`text-xs font-bold px-3 py-1 rounded-xl transition cursor-pointer ${
                    track === t.role
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                      : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {t.role}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Readiness Ring */}
        <div className="flex flex-col items-center bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shrink-0">
          <svg viewBox="0 0 120 120" className="w-28 h-28">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#1e293b" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={ringColor(r.score)}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C - (C * r.score) / 100}
              transform="rotate(-90 60 60)"
            />
            <text x="60" y="56" textAnchor="middle" className="fill-white" fontSize="24" fontWeight="900">
              {r.score}
            </text>
            <text x="60" y="74" textAnchor="middle" className="fill-slate-400 text-[9px] uppercase tracking-wider font-bold">
              READINESS
            </text>
          </svg>
          <span className="text-[10px] font-bold text-slate-400 mt-1">Confidence {r.confidence}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Components + Next Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="font-black text-lg text-white mb-4">Readiness Breakdown</h2>
            <div className="space-y-3.5">
              {r.components.map((c) => (
                <div key={c.key}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-300">
                      {c.label} <span className="text-slate-500 text-[10px]">· {Math.round(c.weight * 100)}% Weight</span>
                    </span>
                    <span className={c.present ? 'font-bold text-emerald-400' : 'text-slate-500 italic'}>
                      {c.present ? `${c.value}%` : 'not attempted'}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${c.present ? c.value : 0}%`,
                        background: c.present ? ringColor(c.value) : '#334155',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              Missing signals lower confidence, never your score — complete rounds to firm up your company readiness index.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="font-black text-lg text-white mb-4">🎯 Targeted Next Steps</h2>
            <div className="space-y-2.5">
              {r.nextActions.map((a, i) => (
                <button
                  key={i}
                  onClick={() => runAction(a)}
                  disabled={!!busy}
                  className="w-full text-left flex items-center justify-between bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 rounded-2xl px-4 py-3 font-semibold text-xs text-white disabled:opacity-50 transition cursor-pointer group"
                >
                  <span>{a.label}</span>
                  <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CTAs + History */}
        <div className="space-y-4">
          <button
            onClick={takeMock}
            disabled={!!busy}
            className="w-full py-3.5 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition shadow-lg shadow-indigo-900/40 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {busy === 'mock' ? 'Generating Test…' : '▶ Take Proctored Pattern Mock'}
          </button>
          <button
            onClick={() => onStartInterview(role, prep.id)}
            className="w-full py-3.5 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition shadow-lg shadow-emerald-900/40 active:scale-95 cursor-pointer"
          >
            🤖 {prep.name}-Style AI Interview{track ? ` · ${track}` : ''}
          </button>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg shadow-slate-950/40">
            <h3 className="font-black text-sm text-white mb-3">Attempt History</h3>
            {prep.attempts.length === 0 && prep.interviews.length === 0 && (
              <p className="text-xs text-slate-500 italic py-2">No attempts recorded yet.</p>
            )}
            <div className="space-y-2">
              {prep.attempts.map((a) => (
                <div key={a.id} className="flex justify-between text-xs py-1.5 border-b border-slate-800 text-slate-300">
                  <span>Mock · {new Date(a.startedAt).toLocaleDateString()}</span>
                  <span className="font-bold text-indigo-400">{a.score != null ? `${a.score}%` : a.status}</span>
                </div>
              ))}
              {prep.interviews.map((iv) => (
                <div key={iv.id} className="flex justify-between text-xs py-1.5 border-b border-slate-800 text-slate-300">
                  <span>Interview ({iv.role})</span>
                  <span className="font-bold text-emerald-400">{iv.overallScore != null ? `${iv.overallScore}%` : iv.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CompanyPrep;
