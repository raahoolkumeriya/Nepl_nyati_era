import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import AuctionRoom from './components/AuctionRoom';
import TeamsView from './components/TeamsView';
import PlayersPool from './components/PlayersPool';
import RulesHub from './components/RulesHub';
import ScheduleStandings from './components/ScheduleStandings';
import ProjectorView from './components/ProjectorView';
import LoginPage from './auth/LoginPage';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { DEFAULT_TEAMS, DEFAULT_PLAYERS, TOURNAMENT_RULES } from './data/initialData';
import { soundFx } from './utils/audio';
import { 
  fetchPlayers, savePlayers, 
  fetchTeams, saveTeams, 
  fetchHistory, saveHistory,
  fetchRules, saveRules,
  initializeWithDefaults,
  isMongoDB,
  checkServerHealth,
} from './services/api';

// ─── Inner App (needs Auth context) ─────────────────────────────────────────
function AppInner() {
  const { isAuthenticated, can } = useAuth();
  const [activeTab, setActiveTab] = useState('auction');
  const [isProjectorMode, setIsProjectorMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    soundFx.enabled = soundEnabled;
  }, [soundEnabled]);

  // ── Teams state ──────────────────────────────────────────────────────────
  const [teams, setTeams] = useState(() => {
    try {
      const saved = localStorage.getItem('nepl_teams');
      return saved ? JSON.parse(saved) : DEFAULT_TEAMS;
    } catch { return DEFAULT_TEAMS; }
  });

  // ── Players state ─────────────────────────────────────────────────────────
  const [players, setPlayers] = useState(() => {
    try {
      const saved = localStorage.getItem('nepl_players');
      return saved ? JSON.parse(saved) : DEFAULT_PLAYERS;
    } catch { return DEFAULT_PLAYERS; }
  });

  // ── Bid history state ─────────────────────────────────────────────────────
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('nepl_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // ── Rules state ───────────────────────────────────────────────────────────
  const [rules, setRules] = useState(() => {
    try {
      const saved = localStorage.getItem('nepl_rules');
      return saved ? JSON.parse(saved) : TOURNAMENT_RULES;
    } catch { return TOURNAMENT_RULES; }
  });

  // ── Load from MongoDB on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    async function loadFromMongoDB() {
      try {
        // Check if Express backend + MongoDB are available
        const serverUp = await checkServerHealth();
        
        if (serverUp) {
          // Seed defaults if DB is empty, then load
          await initializeWithDefaults(DEFAULT_PLAYERS, DEFAULT_TEAMS, TOURNAMENT_RULES);
          
          const [dbPlayers, dbTeams, dbHistory, dbRules] = await Promise.all([
            fetchPlayers(),
            fetchTeams(),
            fetchHistory(),
            fetchRules(),
          ]);

          if (dbPlayers?.length) setPlayers(dbPlayers);
          if (dbTeams?.length) setTeams(dbTeams);
          if (dbHistory?.length) setHistory(dbHistory);
          if (dbRules?.length) setRules(dbRules);
        }
      } catch (err) {
        console.warn('[App] MongoDB load failed, using localStorage:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadFromMongoDB();
  }, [isAuthenticated]);

  // ── Persist to localStorage (always as fallback) ──────────────────────────
  useEffect(() => {
    try { localStorage.setItem('nepl_teams', JSON.stringify(teams)); } catch {}
  }, [teams]);

  useEffect(() => {
    try { localStorage.setItem('nepl_players', JSON.stringify(players)); } catch {}
  }, [players]);

  useEffect(() => {
    try { localStorage.setItem('nepl_history', JSON.stringify(history)); } catch {}
  }, [history]);

  useEffect(() => {
    try { localStorage.setItem('nepl_rules', JSON.stringify(rules)); } catch {}
  }, [rules]);

  // ── Persist to MongoDB (debounced) ────────────────────────────────────────
  useEffect(() => {
    if (!isMongoDB || isLoading) return;
    const timer = setTimeout(() => saveTeams(teams), 800);
    return () => clearTimeout(timer);
  }, [teams, isLoading]);

  useEffect(() => {
    if (!isMongoDB || isLoading) return;
    const timer = setTimeout(() => savePlayers(players), 800);
    return () => clearTimeout(timer);
  }, [players, isLoading]);

  useEffect(() => {
    if (!isMongoDB || isLoading) return;
    const timer = setTimeout(() => saveHistory(history), 800);
    return () => clearTimeout(timer);
  }, [history, isLoading]);

  useEffect(() => {
    if (!isMongoDB || isLoading) return;
    const timer = setTimeout(() => saveRules(rules), 800);
    return () => clearTimeout(timer);
  }, [rules, isLoading]);

  // ── Reset data ────────────────────────────────────────────────────────────
  const handleResetData = useCallback(() => {
    if (window.confirm("Reset all auction data, bids, teams, and rules to default state?")) {
      setTeams(DEFAULT_TEAMS);
      setPlayers(DEFAULT_PLAYERS);
      setHistory([]);
      setRules(TOURNAMENT_RULES);
      localStorage.removeItem('nepl_teams');
      localStorage.removeItem('nepl_players');
      localStorage.removeItem('nepl_history');
      localStorage.removeItem('nepl_rules');
    }
  }, []);

  // ── Show login page if not authenticated ──────────────────────────────────
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // ── Loading state while fetching from MongoDB ─────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 via-cyan-500 to-blue-600 p-[2px] shadow-[0_0_30px_rgba(0,242,254,0.5)] animate-pulse">
          <div className="w-full h-full bg-[#070b14] rounded-[14px] flex items-center justify-center">
            <span className="text-2xl">🏏</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-slate-100 font-display font-bold text-lg">NEPL Cyber Engine</p>
          <p className="text-cyan-400/80 text-xs font-mono mt-1">
            {isMongoDB ? 'Syncing live with MongoDB Atlas…' : 'Initializing platform data…'}
          </p>
        </div>
        <div className="flex gap-2 mt-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-bounce shadow-[0_0_10px_#00f2fe]"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans pb-16">

      {/* Fullscreen Projector View */}
      {isProjectorMode ? (
        <ProjectorView
          players={players}
          setPlayers={setPlayers}
          teams={teams}
          setTeams={setTeams}
          onClose={() => setIsProjectorMode(false)}
        />
      ) : (
        <>
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isProjectorMode={isProjectorMode}
            setIsProjectorMode={setIsProjectorMode}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            onResetData={handleResetData}
          />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 animate-fade-in-up">
            {activeTab === 'auction' && (
              <AuctionRoom
                players={players}
                setPlayers={setPlayers}
                teams={teams}
                setTeams={setTeams}
                history={history}
                setHistory={setHistory}
              />
            )}
            {activeTab === 'teams' && (
              <TeamsView
                teams={teams}
                setTeams={setTeams}
                players={players}
                setPlayers={setPlayers}
              />
            )}
            {activeTab === 'players' && (
              <PlayersPool
                players={players}
                setPlayers={setPlayers}
                teams={teams}
                setTeams={setTeams}
              />
            )}
            {activeTab === 'rules' && <RulesHub rules={rules} setRules={setRules} />}
            {activeTab === 'schedule' && <ScheduleStandings teams={teams} />}
          </main>

          {/* Global Cyber Footer */}
          <footer className="mt-16 border-t border-cyan-500/15 pt-6 pb-8 text-center text-xs text-slate-400 font-mono flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div>
              © 2026 onwards Nyati Era Premier League. All rights reserved.
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-serif shadow-[0_0_12px_rgba(121,40,202,0.2)]">
              <span className="text-[10px] uppercase font-sans text-slate-400">Version:</span>
              <span className="font-bold tracking-wide">कर्मण्येवाधिकारस्ते</span>
            </div>
          </footer>

          {/* MongoDB status indicator */}
          {isMongoDB && (
            <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0b1120]/95 border border-cyan-500/30 text-[10px] text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.25)] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#00ff87]" />
              MongoDB Atlas Synced
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Root App with Provider ──────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
