import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';

// Admin test builder: create/edit/publish tests made of rule-driven sections.

interface SectionDraft {
  title: string;
  kind: 'APTITUDE' | 'VERBAL' | 'LOGICAL' | 'CODING' | 'MIXED';
  marksPerQuestion: number;
  strategy: 'RANDOM' | 'ONE_PER_TOPIC';
  category: 'QUANTITATIVE' | 'LOGICAL' | 'VERBAL' | 'CODING';
  count: number;
  verifiedOnly: boolean;
}

interface ManagedTest {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  mode: string;
  status: string;
  negativeMarking: number;
  passScore: number | null;
  randomizeOrder: boolean;
  sections: any[];
  _count: { attempts: number };
}

const DEFAULT_SECTION: SectionDraft = {
  title: 'Quantitative Aptitude',
  kind: 'APTITUDE',
  marksPerQuestion: 1,
  strategy: 'RANDOM',
  category: 'QUANTITATIVE',
  count: 10,
  verifiedOnly: true,
};

export const TestBuilder: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [tests, setTests] = useState<ManagedTest[]>([]);
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(90);
  const [mode, setMode] = useState<'PRACTICE' | 'PROCTORED'>('PRACTICE');
  const [randomizeOrder, setRandomizeOrder] = useState(false);
  const [negativeMarking, setNegativeMarking] = useState(0);
  const [passScore, setPassScore] = useState<string>('');
  const [sections, setSections] = useState<SectionDraft[]>([{ ...DEFAULT_SECTION }]);

  const load = () =>
    apiClient.get<ManagedTest[]>('/assessments/manage').then(setTests).catch(() => setError('Failed to load tests'));
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setTitle(''); setDescription(''); setDuration(90); setMode('PRACTICE');
    setRandomizeOrder(false); setNegativeMarking(0); setPassScore('');
    setSections([{ ...DEFAULT_SECTION }]); setEditId(null);
  };

  const startEdit = (t: ManagedTest) => {
    setEditId(t.id);
    setTitle(t.title);
    setDescription(t.description || '');
    setDuration(t.durationMinutes);
    setMode(t.mode as any);
    setRandomizeOrder(t.randomizeOrder);
    setNegativeMarking(t.negativeMarking);
    setPassScore(t.passScore != null ? String(t.passScore) : '');
    setSections(
      t.sections.map((s: any) => ({
        title: s.title,
        kind: s.kind,
        marksPerQuestion: s.marksPerQuestion,
        strategy: s.selectionRule?.strategy || 'RANDOM',
        category: s.selectionRule?.category || 'QUANTITATIVE',
        count: s.selectionRule?.count ?? 10,
        verifiedOnly: s.selectionRule?.verifiedOnly ?? true,
      }))
    );
    setEditing(true);
  };

  const save = async () => {
    setError(null);
    const body = {
      title,
      description,
      durationMinutes: duration,
      mode,
      randomizeOrder,
      negativeMarking,
      passScore: passScore === '' ? null : passScore,
      sections: sections.map((s) => ({
        title: s.title,
        kind: s.kind,
        marksPerQuestion: s.marksPerQuestion,
        selectionRule: {
          strategy: s.strategy,
          category: s.category,
          ...(s.strategy === 'RANDOM' ? { count: s.count } : {}),
          verifiedOnly: s.verifiedOnly,
        },
      })),
    };
    try {
      if (editId) await apiClient.put(`/assessments/${editId}`, body);
      else await apiClient.post('/assessments', body);
      setEditing(false);
      resetForm();
      load();
    } catch {
      setError('Save failed — check the fields.');
    }
  };

  const publish = async (id: string) => { await apiClient.post(`/assessments/${id}/publish`, {}); load(); };
  const archive = async (id: string) => { await apiClient.post(`/assessments/${id}/archive`, {}); load(); };

  const setSec = (i: number, patch: Partial<SectionDraft>) =>
    setSections((ss) => ss.map((s, n) => (n === i ? { ...s, ...patch } : s)));

  if (editing) {
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => { setEditing(false); resetForm(); }} className="text-indigo-600 font-bold mb-4">← Back to tests</button>
        <div className="bg-white p-6 rounded-2xl shadow-xl">
          <h1 className="text-2xl font-black mb-4">{editId ? 'Edit Test' : 'New Test'}</h1>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-3">{error}</div>}

          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Test title"
            className="w-full border rounded-lg px-4 py-3 mb-3 font-bold" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description"
            className="w-full border rounded-lg px-4 py-2 mb-3 text-sm" rows={2} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-xs font-bold text-gray-500">Duration (min)</label>
              <div className="flex gap-1 items-center">
                <input type="number" min={5} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 90)}
                  className="w-20 border rounded-lg px-2 py-2" />
                <button onClick={() => setDuration(90)} className={`text-xs px-2 py-1 rounded ${duration === 90 ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>90</button>
                <button onClick={() => setDuration(180)} className={`text-xs px-2 py-1 rounded ${duration === 180 ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>180</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="w-full border rounded-lg px-2 py-2">
                <option value="PRACTICE">PRACTICE</option>
                <option value="PROCTORED">PROCTORED</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">Negative marking</label>
              <input type="number" step={0.25} min={0} value={negativeMarking}
                onChange={(e) => setNegativeMarking(parseFloat(e.target.value) || 0)}
                className="w-full border rounded-lg px-2 py-2" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">Pass score %</label>
              <input type="number" min={0} max={100} value={passScore} placeholder="—"
                onChange={(e) => setPassScore(e.target.value)} className="w-full border rounded-lg px-2 py-2" />
            </div>
          </div>
          <label className="flex items-center gap-2 mb-4 text-sm font-semibold">
            <input type="checkbox" checked={randomizeOrder} onChange={(e) => setRandomizeOrder(e.target.checked)} />
            Randomize question order within sections
          </label>

          <h2 className="font-black mb-2">Sections</h2>
          {sections.map((s, i) => (
            <div key={i} className="border rounded-xl p-4 mb-3 bg-gray-50">
              <div className="flex gap-2 mb-2">
                <input value={s.title} onChange={(e) => setSec(i, { title: e.target.value })}
                  className="flex-1 border rounded-lg px-3 py-2 font-bold text-sm" placeholder="Section title" />
                <button onClick={() => setSections((ss) => ss.filter((_, n) => n !== i))}
                  className="text-red-500 font-bold px-2">✕</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                <select value={s.kind} onChange={(e) => setSec(i, { kind: e.target.value as any })} className="border rounded-lg px-2 py-1">
                  {['APTITUDE', 'LOGICAL', 'VERBAL', 'CODING', 'MIXED'].map((k) => <option key={k}>{k}</option>)}
                </select>
                <select value={s.category} onChange={(e) => setSec(i, { category: e.target.value as any })} className="border rounded-lg px-2 py-1">
                  {['QUANTITATIVE', 'LOGICAL', 'VERBAL', 'CODING'].map((k) => <option key={k}>{k}</option>)}
                </select>
                <select value={s.strategy} onChange={(e) => setSec(i, { strategy: e.target.value as any })} className="border rounded-lg px-2 py-1">
                  <option value="RANDOM">RANDOM</option>
                  <option value="ONE_PER_TOPIC">ONE PER TOPIC</option>
                </select>
                {s.strategy === 'RANDOM' && (
                  <input type="number" min={1} value={s.count} onChange={(e) => setSec(i, { count: parseInt(e.target.value) || 1 })}
                    className="border rounded-lg px-2 py-1" title="Question count" />
                )}
                <input type="number" min={0.5} step={0.5} value={s.marksPerQuestion}
                  onChange={(e) => setSec(i, { marksPerQuestion: parseFloat(e.target.value) || 1 })}
                  className="border rounded-lg px-2 py-1" title="Marks per question" />
              </div>
              <label className="flex items-center gap-2 mt-2 text-xs font-semibold text-gray-600">
                <input type="checkbox" checked={s.verifiedOnly} onChange={(e) => setSec(i, { verifiedOnly: e.target.checked })} />
                Verified questions only (always enforced for PROCTORED)
              </label>
            </div>
          ))}
          <button onClick={() => setSections((ss) => [...ss, { ...DEFAULT_SECTION }])}
            className="text-indigo-600 font-bold text-sm mb-4">+ Add section</button>

          <button onClick={save} disabled={!title || sections.length === 0}
            className="w-full py-3 rounded-xl font-black text-white bg-gradient-to-r from-indigo-500 to-purple-600 disabled:opacity-40">
            {editId ? 'Save changes' : 'Create test (draft)'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} className="text-indigo-600 font-bold mb-4">← Back to Dashboard</button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black">🛠 Test Builder</h1>
        <button onClick={() => { resetForm(); setEditing(true); }}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black py-2 px-5 rounded-xl">
          + New Test
        </button>
      </div>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-3">{error}</div>}
      {tests.map((t) => (
        <div key={t.id} className="bg-white p-5 rounded-xl shadow mb-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="font-bold">{t.title}</div>
            <div className="text-xs text-gray-500">
              {t.durationMinutes} min · {t.mode} · {t.sections.length} sections · {t._count.attempts} attempts
            </div>
          </div>
          <span className={`text-xs font-black px-2 py-1 rounded ${
            t.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700'
              : t.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'
          }`}>{t.status}</span>
          <button onClick={() => startEdit(t)} className="text-sm font-bold text-indigo-600">Edit</button>
          {t.status !== 'PUBLISHED' && (
            <button onClick={() => publish(t.id)} className="text-sm font-bold text-emerald-600">Publish</button>
          )}
          {t.status === 'PUBLISHED' && (
            <button onClick={() => archive(t.id)} className="text-sm font-bold text-gray-500">Archive</button>
          )}
        </div>
      ))}
      {tests.length === 0 && (
        <div className="bg-white p-8 rounded-xl shadow text-center text-gray-500">No tests yet — create one!</div>
      )}
    </div>
  );
};
