import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { InterviewRoom } from './InterviewRoom';
import { CodingInterviewRoom } from './CodingInterviewRoom';
import { FullScreenShell } from '../components/FullScreenShell';

interface Drive {
  id: string;
  status: string;
  currentStep: string;
  resumeData?: any;
  overallScore?: number;
  overallVerdict?: string;
  company?: { name: string } | null;
}

interface Interview {
  id: string;
  roundType: string;
  role: string;
  overallScore: number | null;
  rubricScores: Record<string, number> | null;
  summary: any;
}

interface PlacementDriveWizardProps {
  onExit: () => void;
  onNavigateQuests: () => void;
  user?: any;
  onNavigate?: (page: string) => void;
  onLogout?: () => void;
}

export const PlacementDriveWizard: React.FC<PlacementDriveWizardProps> = ({
  onExit,
  onNavigateQuests,
  user,
  onNavigate = () => {},
  onLogout,
}) => {
  const [drive, setDrive] = useState<Drive | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [role, setRole] = useState('SDE (Generalist)');
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [loading, setLoading] = useState(false);

  // Resume Upload State
  const [resumeParsing, setResumeParsing] = useState(false);
  const [parsedResume, setParsedResume] = useState<any | null>(null);

  // Active sub-interview ID for HR / Tech / Coding steps
  const [activeSubRound, setActiveSubRound] = useState<'hr' | 'technical' | 'coding' | null>(null);

  useEffect(() => {
    apiClient.get<{ id: string; name: string }[]>('/companies').then(setCompanies).catch(() => {});
  }, []);

  const startDrive = async () => {
    setLoading(true);
    try {
      const newDrive = await apiClient.post<Drive>('/placement-drive/start', {
        companyId: selectedCompanyId || undefined,
        role,
      });
      setDrive(newDrive);
    } catch {
      alert('Could not initialize placement drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !drive) return;
    setResumeParsing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const b64 = reader.result as string;
        const parsed = await apiClient.post<any>('/ai-interview/parse-resume', { pdfBase64: b64 });
        setParsedResume(parsed);
        const updated = await apiClient.post<Drive>(`/placement-drive/${drive.id}/resume`, { resumeData: parsed });
        setDrive(updated);
        setResumeParsing(false);
      };
      reader.readAsDataURL(file);
    } catch {
      alert('Failed to parse resume PDF.');
      setResumeParsing(false);
    }
  };

  const startRound = async (roundType: 'hr' | 'technical' | 'coding') => {
    if (!drive) return;
    setLoading(true);
    try {
      await apiClient.post(`/placement-drive/${drive.id}/start-round`, {
        roundType,
        role,
      });
      setActiveSubRound(roundType);
    } catch {
      alert(`Could not start ${roundType} round.`);
    } finally {
      setLoading(false);
    }
  };

  const finishCurrentRound = async () => {
    setActiveSubRound(null);
    if (!drive) return;
    try {
      const res = await apiClient.get<{ drive: Drive; interviews: Interview[] }>(`/placement-drive/${drive.id}`);
      setDrive(res.drive);
      setInterviews(res.interviews);
    } catch {
      /* fallback */
    }
  };

  const completeDriveAndShowReport = async () => {
    if (!drive) return;
    setLoading(true);
    try {
      const res = await apiClient.post<{ drive: Drive; interviews: Interview[] }>(`/placement-drive/${drive.id}/complete`, {});
      setDrive(res.drive);
      setInterviews(res.interviews);
    } catch {
      alert('Failed to calculate placement drive report.');
    } finally {
      setLoading(false);
    }
  };

  // Sub-round interview views
  if (activeSubRound === 'hr' || activeSubRound === 'technical') {
    return (
      <InterviewRoom
        role={role}
        roundType={activeSubRound}
        companyId={selectedCompanyId}
        resumeData={parsedResume}
        onExit={finishCurrentRound}
        onComplete={() => finishCurrentRound()}
      />
    );
  }

  if (activeSubRound === 'coding') {
    return (
      <CodingInterviewRoom
        role={role}
        companyId={selectedCompanyId}
        onExit={finishCurrentRound}
        onComplete={() => finishCurrentRound()}
      />
    );
  }

  const steps = [
    { key: 'resume', label: '1. Resume' },
    { key: 'hr', label: '2. HR Round' },
    { key: 'technical', label: '3. Technical Round' },
    { key: 'coding', label: '4. Live Coding' },
    { key: 'report', label: '5. Scorecard' },
  ];

  const getStepIndex = (stepKey: string) => steps.findIndex((s) => s.key === stepKey);
  const currentIdx = drive ? getStepIndex(drive.currentStep) : -1;

  return (
    <FullScreenShell
      title="Placement Drive Simulation"
      subtitle="Multi-round assessment: Resume → HR → Technical → Coding → Scorecard"
      currentPage="placement-drive"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>🚀</span> Campus Placement Drive
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Target Role: <span className="text-indigo-400 font-bold">{role}</span>
              {drive?.company ? ` · Pattern: ${drive.company.name}` : ''}
            </p>
          </div>
          <button
            onClick={onExit}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:text-white transition"
          >
            ← Exit Drive
          </button>
        </div>

        {/* Step Tracker Bar */}
        {drive && (
          <div className="bg-slate-900/90 p-4 rounded-2xl shadow-xl border border-slate-800 flex items-center justify-between overflow-x-auto gap-2">
            {steps.map((s, idx) => {
              const isActive = drive.currentStep === s.key;
              const isDone = currentIdx > idx || drive.status === 'COMPLETED';

              return (
                <div key={s.key} className="flex items-center gap-2 shrink-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      isDone
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : isActive
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      isActive ? 'text-indigo-400' : isDone ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Initial Setup Screen */}
        {!drive && (
          <div className="bg-slate-900/90 p-8 rounded-3xl shadow-2xl border border-slate-800 max-w-xl mx-auto">
            <h2 className="text-2xl font-black mb-2 text-white">Configure Placement Drive</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Simulate an end-to-end placement drive tailored to industry standards or your chosen company pattern.
            </p>

            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Target Role
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-semibold text-white mb-5 focus:outline-none focus:border-indigo-500 transition text-sm"
            />

            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Company Pattern (Optional)
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-semibold text-white mb-6 focus:outline-none focus:border-indigo-500 transition text-sm"
            >
              <option value="">Generic Placement Drive</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={startDrive}
              disabled={loading}
              className="w-full py-4 rounded-xl font-black text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-xl shadow-indigo-500/25 active:scale-95 transition disabled:opacity-50 text-sm"
            >
              {loading ? 'Initializing Drive…' : '🏁 Start Placement Drive'}
            </button>
          </div>
        )}

        {/* Step 1: Resume Upload */}
        {drive && drive.currentStep === 'resume' && (
          <div className="bg-slate-900/90 p-8 rounded-3xl shadow-2xl border border-slate-800 max-w-xl mx-auto text-center">
            <span className="text-5xl mb-3 block">📄</span>
            <h2 className="text-2xl font-black mb-2 text-white">Upload Resume (PDF)</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Your resume will be parsed by AI to extract skills and project details for personalized interview questions.
            </p>

            <input
              type="file"
              accept=".pdf"
              onChange={handleResumeUpload}
              className="block w-full text-xs text-slate-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 mb-4 cursor-pointer"
            />

            {resumeParsing && (
              <p className="text-xs text-indigo-400 font-bold animate-pulse my-2">
                Extracting skills and projects from PDF…
              </p>
            )}

            <div className="pt-4 border-t border-slate-800 flex gap-3">
              <button
                onClick={() => {
                  apiClient.post<Drive>(`/placement-drive/${drive.id}/resume`, { resumeData: null }).then(setDrive);
                }}
                className="flex-1 py-3 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 font-bold text-slate-300 rounded-xl text-xs transition"
              >
                Skip Resume Step
              </button>
            </div>
          </div>
        )}

        {/* Step 2: HR Round */}
        {drive && drive.currentStep === 'hr' && (
          <div className="bg-slate-900/90 p-8 rounded-3xl shadow-2xl border border-slate-800 max-w-xl mx-auto text-center">
            <span className="text-5xl mb-3 block">🗣️</span>
            <h2 className="text-2xl font-black mb-2 text-white">Round 1: HR & Behavioral Interview</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              6-question behavioral interview evaluated across STAR structure, clarity, and culture fit.
            </p>
            <button
              onClick={() => startRound('hr')}
              className="w-full py-4 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
            >
              ▶ Launch HR Round
            </button>
          </div>
        )}

        {/* Step 3: Technical Round */}
        {drive && drive.currentStep === 'technical' && (
          <div className="bg-slate-900/90 p-8 rounded-3xl shadow-2xl border border-slate-800 max-w-xl mx-auto text-center">
            <span className="text-5xl mb-3 block">💻</span>
            <h2 className="text-2xl font-black mb-2 text-white">Round 2: Resume-Aware Technical Round</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Deep technical questions probing your resume projects along with Core CS fundamentals (OS, DBMS, CN, SQL).
            </p>
            <button
              onClick={() => startRound('technical')}
              className="w-full py-4 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
            >
              ▶ Launch Technical Round
            </button>
          </div>
        )}

        {/* Step 4: Coding Round */}
        {drive && drive.currentStep === 'coding' && (
          <div className="bg-slate-900/90 p-8 rounded-3xl shadow-2xl border border-slate-800 max-w-xl mx-auto text-center">
            <span className="text-5xl mb-3 block">⚡</span>
            <h2 className="text-2xl font-black mb-2 text-white">Round 3: Live Coding Round</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Full-screen code execution environment with live test runner, timer, and AI code review.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => startRound('coding')}
                className="w-full py-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/30"
              >
                ▶ Launch Live Coding Environment
              </button>
              <button
                onClick={completeDriveAndShowReport}
                className="w-full py-3 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 font-bold text-slate-300 rounded-xl text-xs transition"
              >
                Finish Drive & Generate Scorecard Now
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Unified Placement Drive Report */}
        {drive && (drive.currentStep === 'report' || drive.status === 'COMPLETED') && (
          <div className="space-y-6">
            {/* Main Verdict Card */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl shadow-2xl border border-slate-800 flex flex-col md:flex-row items-center gap-8">
              <div className="text-center md:border-r border-slate-800 pr-8">
                <div className="text-6xl font-black text-indigo-400">
                  {drive.overallScore != null ? drive.overallScore : '—'}
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                  Overall Score / 100
                </div>
              </div>

              <div className="flex-1 space-y-1.5 text-center md:text-left">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                  Readiness Verdict
                </span>
                <h2 className="text-3xl font-black text-white">{drive.overallVerdict || 'Completed'}</h2>
                <p className="text-xs text-slate-400">
                  Target Role: <b className="text-slate-200">{role}</b>{' '}
                  {drive.company ? `· Pattern: ${drive.company.name}` : ''}
                </p>
              </div>

              <button
                onClick={onNavigateQuests}
                className="px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black rounded-2xl text-xs shadow-lg shadow-indigo-500/25 transition active:scale-95"
              >
                🎯 View Diagnostic Quests
              </button>
            </div>

            {/* Individual Round Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {interviews.map((iv) => (
                <div key={iv.id} className="bg-slate-900/90 p-6 rounded-2xl shadow-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
                      {iv.roundType} Round
                    </span>
                    <span className="text-xl font-black text-white">
                      {iv.overallScore != null ? `${iv.overallScore}/100` : '—'}
                    </span>
                  </div>

                  {iv.rubricScores && (
                    <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                      {Object.entries(iv.rubricScores).map(([k, v]) => (
                        <div key={k} className="flex justify-between font-medium">
                          <span className="capitalize">{k}</span>
                          <span className="text-slate-200 font-bold">{v}/5</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </FullScreenShell>
  );
};
