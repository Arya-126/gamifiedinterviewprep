import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../services/api';
import { FullScreenShell } from '../components/FullScreenShell';

interface LeaderboardUser {
  id: string;
  name: string;
  level: number;
  xpTotal: number;
  streakDays: number;
  rank?: number;
  metricValue?: number;
}
interface LeaderboardData {
  leaderboard: LeaderboardUser[];
  currentUser: LeaderboardUser | null;
  scope?: string;
  metric?: string;
  needsCohort?: boolean;
}
type Scope = 'global' | 'cohort' | 'friends';
type Metric = 'xp' | 'coding' | 'aptitude';

const TABS: { key: Scope; label: string }[] = [
  { key: 'global', label: '🌍 Global Cohort' },
  { key: 'cohort', label: '🎓 My College' },
  { key: 'friends', label: '👥 Friends Circle' },
];

const METRIC_TABS: { key: Metric; label: string }[] = [
  { key: 'xp', label: '⚡ Total XP' },
  { key: 'coding', label: '💻 Coding Solved' },
  { key: 'aptitude', label: '🧮 Aptitude Accuracy' },
];

const METRIC_SUBTITLE: Record<Metric, string> = {
  xp: 'Ranked by Total Earned XP',
  coding: 'Ranked by Total Problems Solved',
  aptitude: 'Ranked by Average Test Accuracy Score',
};

const fmtMetric = (metric: Metric, value: number) =>
  metric === 'coding' ? `${value} Solved` : `${value}% Avg`;

export interface LeaderboardPageProps {
  user?: {
    id?: string;
    name?: string;
    role?: string;
    level?: number;
    xpTotal?: number;
    streakDays?: number;
  } | null;
  onNavigate?: (page: string) => void;
  onBack?: () => void;
  onLogout?: () => void;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  user,
  onNavigate,
  onBack,
  onLogout,
}) => {
  const [scope, setScope] = useState<Scope>('global');
  const [metric, setMetric] = useState<Metric>('xp');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const nav = onNavigate || (() => {});

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .get<LeaderboardData>(`/leaderboard?scope=${scope}&metric=${metric}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [scope, metric]);
  useEffect(load, [load]);

  return (
    <FullScreenShell
      title="Global Leaderboard"
      subtitle={METRIC_SUBTITLE[metric]}
      icon="📊"
      currentPage="leaderboard"
      user={user}
      onNavigate={nav}
      onBack={onBack}
      onLogout={onLogout}
    >
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600/30 via-orange-600/20 to-slate-900/90 border border-amber-500/30 p-6 sm:p-8 backdrop-blur-md shadow-2xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-black mb-3">
            <span>🏆</span> COHORT COMPETITION LEAGUE
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
            Placement Prep Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            {METRIC_SUBTITLE[metric]}
          </p>
        </div>

        {/* SCOPE & METRIC TABS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Scope Tabs */}
          <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl shadow">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setScope(t.key)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                  scope === t.key
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Metric Tabs */}
          <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl shadow">
            {METRIC_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setMetric(t.key)}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                  metric === t.key
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {scope === 'cohort' && data?.needsCohort && <JoinCohort onJoined={load} />}
        {scope === 'friends' && <FriendsPanel onChanged={load} />}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            <p className="text-xs text-slate-400 font-bold">Calculating rankings and percentiles…</p>
          </div>
        ) : !data ? (
          <div className="text-center py-12 text-rose-400 font-bold text-sm">Failed to load leaderboard</div>
        ) : (
          <>
            {data.currentUser && (
              <div className="bg-indigo-500/15 border border-indigo-500/30 p-5 rounded-2xl shadow-lg shadow-indigo-950/40 flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-violet-600 text-white rounded-2xl flex items-center justify-center font-black text-lg shrink-0">
                  #{data.currentUser.rank}
                </div>
                <div>
                  <p className="font-black text-sm text-white">Your Rank Standing</p>
                  <p className="text-xs text-indigo-300 mt-0.5">
                    Level {data.currentUser.level} • {data.currentUser.xpTotal.toLocaleString()} XP • 🔥 {data.currentUser.streakDays} Day Streak
                    {metric !== 'xp' && ` • ${fmtMetric(metric, data.currentUser.metricValue ?? 0)}`}
                  </p>
                </div>
              </div>
            )}

            {data.leaderboard.length === 0 ? (
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow p-10 text-center text-slate-400 text-sm">
                {scope === 'cohort'
                  ? 'Join a college to compare against classmates.'
                  : scope === 'friends'
                    ? 'Connect with friends to compare your progress.'
                    : 'No candidates on the leaderboard yet.'}
              </div>
            ) : (
              <div className="bg-slate-900/90 rounded-3xl border border-slate-800 shadow-xl shadow-slate-950/50 overflow-hidden">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-6 py-4">Rank</th>
                      <th className="px-6 py-4">Student Candidate</th>
                      <th className="px-6 py-4 text-right">Daily Streak</th>
                      <th className="px-6 py-4 text-right">
                        {metric === 'xp' ? 'Total XP' : metric === 'coding' ? 'Problems' : 'Accuracy'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {data.leaderboard.map((u, idx) => {
                      const rank = idx + 1;
                      const isMe = data.currentUser?.id === u.id;
                      let badge: React.ReactNode = (
                        <span className="text-slate-400 font-bold">#{rank}</span>
                      );
                      if (rank === 1) badge = <span className="text-xl">🥇</span>;
                      if (rank === 2) badge = <span className="text-xl">🥈</span>;
                      if (rank === 3) badge = <span className="text-xl">🥉</span>;

                      return (
                        <tr
                          key={u.id}
                          className={`transition ${
                            isMe ? 'bg-indigo-600/20 text-indigo-200' : 'hover:bg-slate-800/40 text-slate-200'
                          }`}
                        >
                          <td className="px-6 py-4 w-20 text-center">{badge}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className={`font-bold text-xs sm:text-sm truncate ${isMe ? 'text-indigo-300' : 'text-white'}`}>
                                  {u.name} {isMe && '(You)'}
                                </p>
                                <p className="text-[10px] text-slate-400 uppercase font-semibold">
                                  Level {u.level}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-bold">
                            {u.streakDays > 0 ? (
                              <span className="text-amber-400">🔥 {u.streakDays}d</span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-emerald-400">
                            {metric === 'xp'
                              ? u.xpTotal.toLocaleString()
                              : fmtMetric(metric, u.metricValue ?? 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </FullScreenShell>
  );
};

// ---- join-college widget ----
const JoinCohort: React.FC<{ onJoined: () => void }> = ({ onJoined }) => {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const join = async () => {
    setMsg(null);
    try {
      const r = await apiClient.post<{ cohort: { name: string } }>('/cohorts/join', { joinCode: code });
      setMsg(`Joined ${r.cohort.name}!`);
      onJoined();
    } catch {
      setMsg('Invalid join code.');
    }
  };
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow p-5">
      <h3 className="font-black text-white text-sm mb-1">🎓 Join Your College Placement Cohort</h3>
      <p className="text-xs text-slate-400 mb-3">
        Enter the join code distributed by your university or placement office.
      </p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ENTER JOIN CODE"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 font-mono tracking-widest text-white text-xs placeholder-slate-500 focus:outline-none"
        />
        <button
          onClick={join}
          disabled={!code.trim()}
          className="px-5 rounded-xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition cursor-pointer"
        >
          Join Cohort
        </button>
      </div>
      {msg && <p className="text-xs mt-2 font-semibold text-indigo-400">{msg}</p>}
    </div>
  );
};

// ---- friends management ----
interface FriendLite {
  id: string;
  name: string;
  friendshipId: string;
}
const FriendsPanel: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [incoming, setIncoming] = useState<FriendLite[]>([]);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    apiClient
      .get<{ incoming: FriendLite[] }>('/friends')
      .then((d) => setIncoming(d.incoming))
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  const request = async () => {
    setMsg(null);
    try {
      const r = await apiClient.post<{ status: string }>('/friends/request', { email });
      setMsg(r.status === 'ACCEPTED' ? 'Connected!' : 'Friend request sent.');
      setEmail('');
      load();
      onChanged();
    } catch {
      setMsg('No user found with that email.');
    }
  };
  const accept = async (id: string) => {
    await apiClient.post(`/friends/${id}/accept`, {});
    load();
    onChanged();
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow p-5">
      <h3 className="font-black text-white text-sm mb-1">👥 Connect with Peers</h3>
      <div className="flex gap-2 mt-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Friend's registered email"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
        />
        <button
          onClick={request}
          disabled={!email.trim()}
          className="px-5 rounded-xl font-black text-xs text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition cursor-pointer"
        >
          Send Invite
        </button>
      </div>
      {msg && <p className="text-xs mt-2 font-semibold text-indigo-400">{msg}</p>}
      {incoming.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pending Requests</p>
          {incoming.map((f) => (
            <div key={f.friendshipId} className="flex items-center justify-between py-1.5 text-xs">
              <span className="font-semibold text-slate-200">{f.name}</span>
              <button
                onClick={() => accept(f.friendshipId)}
                className="text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded-lg transition cursor-pointer"
              >
                Accept
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default LeaderboardPage;
