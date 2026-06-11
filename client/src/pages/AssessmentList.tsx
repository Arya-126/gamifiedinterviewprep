import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';

interface AvailableTest {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  mode: 'PRACTICE' | 'PROCTORED';
  negativeMarking: number;
  passScore: number | null;
  company: { name: string } | null;
  sections: { title: string; kind: string }[];
  attempts: { id: string; status: string; score: number | null; startedAt: string }[];
}

interface CompanyCard {
  id: string;
  name: string;
  rounds: { title: string; count: number }[];
  durationMinutes: number;
}

export const AssessmentList: React.FC<{
  onStart: (testId: string) => void;
  onBack: () => void;
}> = ({ onStart, onBack }) => {
  const [tests, setTests] = useState<AvailableTest[]>([]);
  const [companies, setCompanies] = useState<CompanyCard[]>([]);
  const [building, setBuilding] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<AvailableTest[]>('/assessments/available')
      .then(setTests)
      .catch(() => setError('Failed to load tests'))
      .finally(() => setLoading(false));
    apiClient.get<CompanyCard[]>('/companies').then(setCompanies).catch(() => {});
  }, []);

  const startCompanyTest = async (companyId: string) => {
    setBuilding(companyId);
    try {
      const { testId } = await apiClient.post<{ testId: string }>(`/companies/${companyId}/practice-test`, {});
      onStart(testId);
    } catch {
      setError('Could not build the company test.');
    } finally {
      setBuilding(null);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="text-indigo-600 hover:text-indigo-800 font-bold mb-4">
        ← Back to Dashboard
      </button>
      <h1 className="text-3xl font-black mb-6">📝 Mock Tests</h1>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}
      {loading && <div className="text-gray-500 italic p-8 text-center">Loading…</div>}

      {companies.length > 0 && (
        <div className="mb-8">
          <h2 className="font-black text-lg mb-3">🏢 Practice for a company</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map((c) => (
              <div key={c.id} className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5 rounded-xl shadow-lg">
                <h3 className="font-black text-lg mb-1">{c.name}</h3>
                <p className="text-xs text-slate-300 mb-3">
                  {c.rounds.map((r) => `${r.title} (${r.count})`).join(' · ')} · {c.durationMinutes} min
                </p>
                <button
                  onClick={() => startCompanyTest(c.id)}
                  disabled={building === c.id}
                  className="w-full py-2 rounded-lg font-black bg-white text-slate-900 text-sm disabled:opacity-50"
                >
                  {building === c.id ? 'Building…' : `🎯 Take the ${c.name} pattern mock (proctored)`}
                </button>
                <p className="text-[10px] text-slate-400 mt-2">
                  Built from a pattern profile (round structure + difficulty) using our own question bank.
                  For a {c.name}-styled interview, use 🤖 AI Interview and pick the company.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {!loading && tests.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
          No published tests yet. Check back soon!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tests.map((t) => {
          const inProgress = t.attempts.find((a) => a.status === 'IN_PROGRESS');
          const best = t.attempts
            .filter((a) => a.score != null)
            .reduce((m, a) => Math.max(m, a.score!), 0);
          return (
            <div key={t.id} className="bg-white p-6 rounded-xl shadow-lg flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-bold">
                  {t.title}
                  {t.company && (
                    <span className="ml-2 text-xs align-middle bg-slate-800 text-white px-2 py-1 rounded font-black">
                      {t.company.name}
                    </span>
                  )}
                </h2>
                <span
                  className={`text-xs font-black px-2 py-1 rounded ${
                    t.mode === 'PROCTORED'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {t.mode}
                </span>
              </div>
              {t.description && <p className="text-sm text-gray-600 mb-3">{t.description}</p>}
              <div className="flex flex-wrap gap-2 mb-3">
                {t.sections.map((s, i) => (
                  <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-semibold">
                    {s.title}
                  </span>
                ))}
              </div>
              <div className="text-sm text-gray-500 mb-4">
                ⏱ {t.durationMinutes} min
                {t.negativeMarking > 0 && <> · −{t.negativeMarking} per wrong answer</>}
                {t.passScore != null && <> · pass ≥ {t.passScore}%</>}
                {t.attempts.length > 0 && best > 0 && <> · best {best}%</>}
              </div>
              <button
                onClick={() => onStart(t.id)}
                className={`mt-auto font-black py-3 px-6 rounded-xl text-white transition transform hover:-translate-y-0.5 ${
                  inProgress
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                }`}
              >
                {inProgress ? '▶ Resume Attempt' : '🚀 Start Test'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
