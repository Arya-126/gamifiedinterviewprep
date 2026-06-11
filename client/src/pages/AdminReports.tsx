import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';

// Admin reporting: attempt list → per-attempt report (breakdown + proctoring
// timeline + integrity signal) and per-test cohort analytics + CSV export.

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000';

const authedFetch = (path: string) =>
  fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
  });

const fmtSec = (s: number | null) =>
  s == null ? '—' : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;

const INTEGRITY_COLORS: Record<string, string> = {
  CLEAN: 'bg-emerald-100 text-emerald-700',
  LOW: 'bg-lime-100 text-lime-700',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-red-100 text-red-700',
};

const Snapshot: React.FC<{ url: string }> = ({ url }) => {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let revoke: string | null = null;
    authedFetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => {
        revoke = URL.createObjectURL(b);
        setSrc(revoke);
      })
      .catch(() => setSrc(null));
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [url]);
  if (!src) return <span className="text-xs text-gray-400">(snapshot unavailable)</span>;
  return <img src={src} alt="proctoring snapshot" className="rounded-lg border w-40" />;
};

export const AdminReports: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [cohort, setCohort] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<any[]>('/admin/attempts').then(setAttempts).catch(() => setError('Failed to load attempts'));
  }, []);

  const openReport = (id: string) =>
    apiClient.get(`/admin/attempts/${id}/report`).then(setReport).catch(() => setError('Failed to load report'));

  const openCohort = (testId: string) =>
    apiClient.get(`/admin/tests/${testId}/cohort`).then(setCohort).catch(() => setError('Failed to load cohort'));

  const downloadCsv = async (testId: string) => {
    const resp = await authedFetch(`/admin/tests/${testId}/export.csv`);
    const blob = await resp.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'attempts.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ---- per-attempt report view ----
  if (report) {
    return (
      <div className="max-w-4xl mx-auto">
        <button onClick={() => setReport(null)} className="text-indigo-600 font-bold mb-4">← All attempts</button>
        <div className="bg-white p-6 rounded-2xl shadow-xl mb-4">
          <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
            <div>
              <h1 className="text-xl font-black">{report.test.title}</h1>
              <p className="text-sm text-gray-500">
                {report.user.name} ({report.user.email}) · {report.status} · score {report.score ?? '—'}%
                · {fmtSec(report.durationUsedSec)} used
              </p>
              <p className="text-xs text-gray-400">
                consent: {report.consentAt ? new Date(report.consentAt).toLocaleString() : '—'}
              </p>
            </div>
            <div className={`px-3 py-2 rounded-xl font-black text-sm ${INTEGRITY_COLORS[report.integrity.level]}`}>
              Integrity signal: {report.integrity.level} ({report.integrity.score})
              <div className="font-normal text-[10px] max-w-[200px]">{report.integrity.note}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {(report.breakdown?.sections || []).map((s: any, i: number) => (
              <div key={i} className="bg-indigo-50 rounded-lg p-2 text-sm">
                <div className="text-xs font-bold text-indigo-500">{s.title}</div>
                <div className="font-black">{s.scored} / {s.total}</div>
              </div>
            ))}
          </div>

          <h2 className="font-black mb-2">Responses</h2>
          <div className="max-h-72 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left text-xs text-gray-500">
                  <th className="p-2">Item</th><th className="p-2">Topic</th>
                  <th className="p-2">Result</th><th className="p-2">Marks</th><th className="p-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {report.responses.map((r: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.item}</td>
                    <td className="p-2 text-xs">{r.topic}</td>
                    <td className="p-2">{r.isCorrect == null ? '—' : r.isCorrect ? '✅' : '❌'}{r.flagged ? ' 🚩' : ''}</td>
                    <td className="p-2">{r.marks}</td>
                    <td className="p-2">{r.timeSpentSec}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xl">
          <h2 className="font-black mb-3">Proctoring timeline ({report.events.length} events)</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(report.eventCounts).map(([type, n]) => (
              <span key={type} className="text-xs bg-gray-100 px-2 py-1 rounded font-bold">{type}: {String(n)}</span>
            ))}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {report.events.map((e: any) => (
              <div key={e.id} className="flex items-start gap-3 text-sm border-b pb-2">
                <span className="text-xs text-gray-400 w-40 shrink-0">{new Date(e.createdAt).toLocaleString()}</span>
                <span className="font-bold w-40 shrink-0">{e.type}</span>
                {e.snapshotUrl ? <Snapshot url={e.snapshotUrl} /> : (
                  <span className="text-xs text-gray-500">{e.meta ? JSON.stringify(e.meta) : ''}</span>
                )}
              </div>
            ))}
            {report.events.length === 0 && <p className="text-gray-400 italic">No proctoring events (PRACTICE attempt).</p>}
          </div>
        </div>
      </div>
    );
  }

  // ---- cohort view ----
  if (cohort) {
    const maxBucket = Math.max(1, ...cohort.distribution.map((d: any) => d.count));
    return (
      <div className="max-w-4xl mx-auto">
        <button onClick={() => setCohort(null)} className="text-indigo-600 font-bold mb-4">← All attempts</button>
        <div className="bg-white p-6 rounded-2xl shadow-xl mb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-xl font-black">{cohort.test.title} — cohort</h1>
              <p className="text-sm text-gray-500">
                {cohort.attemptCount} attempts · {cohort.completionRate}% completed ·
                avg {cohort.avgScore ?? '—'}% · avg time {fmtSec(cohort.avgDurationSec)}
              </p>
            </div>
            <button onClick={() => downloadCsv(cohort.test.id)} className="bg-gray-800 text-white text-sm font-bold px-4 py-2 rounded-lg">
              ⬇ CSV
            </button>
          </div>

          <h2 className="font-black mb-2">Score distribution</h2>
          <div className="flex items-end gap-1 h-32 mb-6">
            {cohort.distribution.map((d: any) => (
              <div key={d.bucket} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="w-full bg-indigo-500 rounded-t" style={{ height: `${(d.count / maxBucket) * 100}%` }} />
                <div className="text-[9px] text-gray-500 mt-1">{d.bucket}</div>
                <div className="text-[10px] font-bold">{d.count}</div>
              </div>
            ))}
          </div>

          <h2 className="font-black mb-2">Topic heatmap (accuracy)</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {cohort.topicHeatmap.map((t: any) => (
              <span key={t.name}
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  t.accuracy < 40 ? 'bg-red-100 text-red-700' : t.accuracy < 70 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
                }`}>
                {t.name} {t.accuracy}% ({t.answered})
              </span>
            ))}
            {cohort.topicHeatmap.length === 0 && <span className="text-gray-400 italic text-sm">No graded responses yet.</span>}
          </div>

          <h2 className="font-black mb-2">Hardest questions</h2>
          {cohort.hardestQuestions.map((q: any, i: number) => (
            <div key={i} className="text-sm border-b py-2 flex justify-between gap-4">
              <span>{q.stem}…</span>
              <span className="font-bold shrink-0">{q.accuracy}% ({q.correct}/{q.total})</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- attempts list ----
  return (
    <div>
      <button onClick={onBack} className="text-indigo-600 font-bold mb-4">← Back to Dashboard</button>
      <h1 className="text-3xl font-black mb-6">📊 Attempt Reports</h1>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-3">{error}</div>}
      {attempts.map((a) => (
        <div key={a.id} className="bg-white p-4 rounded-xl shadow mb-2 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <div className="font-bold text-sm">{a.user.name} — {a.test.title}</div>
            <div className="text-xs text-gray-500">
              {new Date(a.startedAt).toLocaleString()} · {a.status} · score {a.score ?? '—'}%
              · {a._count.proctoringEvents} events
            </div>
          </div>
          <span className={`text-xs font-black px-2 py-1 rounded ${a.test.mode === 'PROCTORED' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {a.test.mode}
          </span>
          <button onClick={() => openReport(a.id)} className="text-sm font-bold text-indigo-600">Report</button>
          <button onClick={() => openCohort(a.testId)} className="text-sm font-bold text-purple-600">Cohort</button>
        </div>
      ))}
      {attempts.length === 0 && !error && (
        <div className="bg-white p-8 rounded-xl shadow text-center text-gray-500">No attempts yet.</div>
      )}
    </div>
  );
};
