import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MobileNav from './components/MobileNav';
import AuctionRoom from './components/AuctionRoom';
import TeamsView from './components/TeamsView';
import PlayersPool from './components/PlayersPool';
import RulesHub from './components/RulesHub';
import ScheduleStandings from './components/ScheduleStandings';
import ProjectorView from './components/ProjectorView';
import GeminiChatBot from './components/GeminiChatBot';
import LoginPage from './auth/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { TournamentProvider, useTournament } from './context/TournamentContext';
import { TOURNAMENT_RULES } from './data/initialData';
import { soundFx } from './utils/audio';
import { useTheme } from './utils/theme';
import {
  fetchPlayers, savePlayers,
  fetchTeams, saveTeams,
  fetchHistory, saveHistory,
  fetchRules, saveRules,
  fetchMatches, saveMatches,
  isMongoDB,
  checkServerHealth,
} from './services/api';
import { getSocket, liveBroadcastReset } from './services/socket';

// ─── Inner App (needs Auth context) ─────────────────────────────────────────
function AppInner() {
  const { user, isAuthenticated, can } = useAuth();
  const { theme } = useTheme();
  const { tournamentSettings } = useTournament();
  const [activeTab, setActiveTab] = useState('auction');
  const [isProjectorMode, setIsProjectorMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [viewerCount, setViewerCount] = useState(1);
  const [liveSocketConnected, setLiveSocketConnected] = useState(false);

  useEffect(() => {
    soundFx.enabled = soundEnabled;
  }, [soundEnabled]);

  // Modern View Transitions API for seamless tab switching
  const handleTabChange = useCallback((newTab) => {
    if (newTab === activeTab) return;
    if (typeof document !== 'undefined' && document.startViewTransition) {
      document.startViewTransition(() => {
        setActiveTab(newTab);
      });
    } else {
      setActiveTab(newTab);
    }
  }, [activeTab]);

  // Fallback for browsers without native CSS animation-timeline: scroll()
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()')) return;

    const progressEl = document.getElementById('scroll-progress');
    if (!progressEl) return;

    const handleScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const progress = window.scrollY / scrollable;
      progressEl.style.transform = `scaleX(${progress})`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Ensure active tab matches current user permissions
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'auction' && !can('canViewAuction')) {
      setActiveTab('teams');
    } else if (activeTab === 'schedule' && !can('canViewSchedule')) {
      setActiveTab(can('canViewAuction') ? 'auction' : 'teams');
    }
  }, [isAuthenticated, activeTab, can]);

  // ── Teams state ──────────────────────────────────────────────────────────
  const [teams, setTeams] = useState(() => {
    try {
      const saved = localStorage.getItem('nepl_teams');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // ── Players state ─────────────────────────────────────────────────────────
  const [players, setPlayers] = useState(() => {
    try {
      const saved = localStorage.getItem('nepl_players');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
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

  // ── Matches & Schedule state ──────────────────────────────────────────────
  const [matches, setMatches] = useState(() => {
    try {
      const saved = localStorage.getItem('nepl_matches');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // ── Load from MongoDB on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    async function loadFromMongoDB() {
      setIsLoading(true);
      try {
        const serverUp = await checkServerHealth();
        setIsDbConnected(serverUp);

        if (serverUp) {
          const [dbPlayers, dbTeams, dbHistory, dbRules, dbMatches] = await Promise.all([
            fetchPlayers(),
            fetchTeams(),
            fetchHistory(),
            fetchRules(),
            fetchMatches().catch(() => []),
          ]);

          setPlayers(Array.isArray(dbPlayers) ? dbPlayers : []);
          setTeams(Array.isArray(dbTeams) ? dbTeams : []);
          setHistory(Array.isArray(dbHistory) ? dbHistory : []);
          setRules(Array.isArray(dbRules) && dbRules.length ? dbRules : TOURNAMENT_RULES);
          if (Array.isArray(dbMatches) && dbMatches.length > 0) {
            setMatches(dbMatches);
          }
        }
      } catch (err) {
        console.warn('[App] MongoDB load failed:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadFromMongoDB();
  }, [isAuthenticated]);

  // ── Real-time Socket.io Live Streaming Auction Sync ────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();

    const handleConnect = () => setLiveSocketConnected(true);
    const handleDisconnect = () => setLiveSocketConnected(false);

    const handleViewerCount = ({ count }) => {
      if (typeof count === 'number') setViewerCount(count);
    };

    const handleStateSync = (state) => {
      if (state && typeof state.viewerCount === 'number') {
        setViewerCount(state.viewerCount);
      }
    };

    // When any device marks a player as SOLD
    const handlePlayerSold = (data) => {
      const { playerId, buyerTeamId, soldPrice, player, team, logItem } = data || {};
      if (playerId) {
        setPlayers(prev => prev.map(p => p.id === playerId ? (player || { ...p, status: 'sold', soldPrice, soldTo: buyerTeamId }) : p));
      }
      if (buyerTeamId && team) {
        setTeams(prev => prev.map(t => t.id === buyerTeamId ? team : t));
      }
      if (logItem) {
        setHistory(prev => {
          if (prev.some(h => h.id === logItem.id)) return prev;
          return [logItem, ...prev];
        });
      }
    };

    // When any device marks a player as UNSOLD
    const handlePlayerUnsold = (data) => {
      const { playerId, player, logItem } = data || {};
      if (playerId) {
        setPlayers(prev => prev.map(p => p.id === playerId ? (player || { ...p, status: 'unsold' }) : p));
      }
      if (logItem) {
        setHistory(prev => {
          if (prev.some(h => h.id === logItem.id)) return prev;
          return [logItem, ...prev];
        });
      }
    };

    // When a live bid is placed on any device
    const handleBidPlaced = (data) => {
      const { logItem } = data || {};
      if (logItem) {
        setHistory(prev => {
          if (prev.some(h => h.id === logItem.id)) return prev;
          return [logItem, ...prev];
        });
      }
    };

    // When admin revokes or reduces bid
    const handleBidRevoked = (data) => {
      if (data?.logItem) {
        setHistory(prev => [data.logItem, ...prev]);
      }
    };

    const handleBidReduced = (data) => {
      if (data?.logItem) {
        setHistory(prev => [data.logItem, ...prev]);
      }
    };

    // Global reset
    const handleDataReset = () => {
      setTeams([]);
      setPlayers([]);
      setHistory([]);
      setRules(TOURNAMENT_RULES);
      setMatches([]);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('auction:viewerCount', handleViewerCount);
    socket.on('auction:stateSync', handleStateSync);
    socket.on('auction:playerSold', handlePlayerSold);
    socket.on('auction:playerUnsold', handlePlayerUnsold);
    socket.on('auction:bidPlaced', handleBidPlaced);
    socket.on('auction:bidRevoked', handleBidRevoked);
    socket.on('auction:bidReduced', handleBidReduced);
    socket.on('auction:dataReset', handleDataReset);

    if (socket.connected) {
      setLiveSocketConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('auction:viewerCount', handleViewerCount);
      socket.off('auction:stateSync', handleStateSync);
      socket.off('auction:playerSold', handlePlayerSold);
      socket.off('auction:playerUnsold', handlePlayerUnsold);
      socket.off('auction:bidPlaced', handleBidPlaced);
      socket.off('auction:bidRevoked', handleBidRevoked);
      socket.off('auction:bidReduced', handleBidReduced);
      socket.off('auction:dataReset', handleDataReset);
    };
  }, [isAuthenticated]);

  // ── Persist to localStorage (always as fallback) ──────────────────────────
  useEffect(() => {
    try { localStorage.setItem('nepl_teams', JSON.stringify(teams)); } catch { }
  }, [teams]);

  useEffect(() => {
    try { localStorage.setItem('nepl_players', JSON.stringify(players)); } catch { }
  }, [players]);

  useEffect(() => {
    try { localStorage.setItem('nepl_history', JSON.stringify(history)); } catch { }
  }, [history]);

  useEffect(() => {
    try { localStorage.setItem('nepl_rules', JSON.stringify(rules)); } catch { }
  }, [rules]);

  useEffect(() => {
    try { localStorage.setItem('nepl_matches', JSON.stringify(matches)); } catch { }
  }, [matches]);

  // ── Persist to MongoDB Atlas (debounced) ──────────────────────────────────
  useEffect(() => {
    if (!isDbConnected || isLoading) return;
    const timer = setTimeout(() => {
      saveTeams(teams).catch(err => console.warn('Save teams to MongoDB failed:', err));
    }, 500);
    return () => clearTimeout(timer);
  }, [teams, isDbConnected, isLoading]);

  useEffect(() => {
    if (!isDbConnected || isLoading) return;
    const timer = setTimeout(() => {
      savePlayers(players).catch(err => console.warn('Save players to MongoDB failed:', err));
    }, 500);
    return () => clearTimeout(timer);
  }, [players, isDbConnected, isLoading]);

  useEffect(() => {
    if (!isDbConnected || isLoading) return;
    const timer = setTimeout(() => {
      saveHistory(history).catch(err => console.warn('Save history to MongoDB failed:', err));
    }, 500);
    return () => clearTimeout(timer);
  }, [history, isDbConnected, isLoading]);

  useEffect(() => {
    if (!isDbConnected || isLoading) return;
    const timer = setTimeout(() => {
      saveRules(rules).catch(err => console.warn('Save rules to MongoDB failed:', err));
    }, 500);
    return () => clearTimeout(timer);
  }, [rules, isDbConnected, isLoading]);

  useEffect(() => {
    if (!isDbConnected || isLoading) return;
    const timer = setTimeout(() => {
      saveMatches(matches).catch(err => console.warn('Save matches to MongoDB failed:', err));
    }, 500);
    return () => clearTimeout(timer);
  }, [matches, isDbConnected, isLoading]);

  // ── Reset data (Restricted Exclusively to Supreme Master) ─────────────────────
  const handleResetData = useCallback(async () => {
    if (!user || user.role !== 'suprememaster') {
      alert("⛔ ACCESS DENIED: Only Supreme Master (App Developer) profile can clear live auction data from MongoDB Atlas!");
      return;
    }

    const input = window.prompt(
      "👑 SUPREME MASTER AUCTION CONTROL\n\n" +
      "Select an option by typing 1 or 2:\n\n" +
      "1: WIPE BIDDING HISTORY & START FRESH AUCTION SETUP\n" +
      "   • Purges all live bid logs and auction history\n" +
      "   • Resets all players back to 'Available' (unsold)\n" +
      "   • Restores 100% purse to all teams (spent = 0)\n" +
      "   • Cleans live auction room session\n\n" +
      "2: COMPLETE FACTORY PURGE\n" +
      "   • Purges all players, teams, matches, and history\n\n" +
      "Type '1' to Wipe Bids & Start Fresh, or '2' for Full Purge:"
    );

    if (!input) return;
    const clean = input.trim().toLowerCase();

    if (clean === '1' || clean.includes('wipe') || clean.includes('fresh') || clean === 'yes' || clean === 'ok') {
      if (window.confirm("🔴 Confirm: Wipe all bidding history and reset all players and team purses to start a clean new auction setup?")) {
        const freshPlayers = (players || []).map(p => ({
          ...p,
          status: 'available',
          soldPrice: 0,
          soldTo: null,
          currentBid: p.basePrice || 100,
          bidHistory: []
        }));

        const startupPurse = Number(tournamentSettings?.startupPurse) || 10000;

        const OFFICIAL_6_TEAMS = [
          { id: 'team-1', name: 'Team A', shortName: 'TMA', owner: 'Team A owner', color: '#3b82f6', logo: '🦁', totalPurse: startupPurse, spentPurse: 0, maxSquadSize: 10, playersCount: 0, squad: [] },
          { id: 'team-2', name: 'Team B', shortName: 'TMB', owner: 'Team B owner', color: '#ef4444', logo: '🔥', totalPurse: startupPurse, spentPurse: 0, maxSquadSize: 10, playersCount: 0, squad: [] },
          { id: 'team-3', name: 'Team C', shortName: 'TMC', owner: 'Team C owner', color: '#06b6d4', logo: '⚡', totalPurse: startupPurse, spentPurse: 0, maxSquadSize: 10, playersCount: 0, squad: [] },
          { id: 'team-4', name: 'Team D', shortName: 'TMD', owner: 'Team D owner', color: '#10b981', logo: '🛡️', totalPurse: startupPurse, spentPurse: 0, maxSquadSize: 10, playersCount: 0, squad: [] },
          { id: 'team-5', name: 'Team E', shortName: 'TME', owner: 'Team E owner', color: '#f59e0b', logo: '👑', totalPurse: startupPurse, spentPurse: 0, maxSquadSize: 10, playersCount: 0, squad: [] },
          { id: 'team-6', name: 'Team F', shortName: 'TMF', owner: 'Team F owner', color: '#a855f7', logo: '🦅', totalPurse: startupPurse, spentPurse: 0, maxSquadSize: 10, playersCount: 0, squad: [] },
        ];

        const baseTeams = (teams && teams.length > 0) ? teams : OFFICIAL_6_TEAMS;
        const freshTeams = baseTeams.map(t => ({
          ...t,
          totalPurse: t.totalPurse || startupPurse,
          spentPurse: 0,
          playersCount: 0,
          squad: []
        }));

        setPlayers(freshPlayers);
        setTeams(freshTeams);
        setHistory([]);
        localStorage.setItem('nepl_players', JSON.stringify(freshPlayers));
        localStorage.setItem('nepl_teams', JSON.stringify(freshTeams));
        localStorage.removeItem('nepl_history');

        if (isMongoDB) {
          try {
            await Promise.all([
              savePlayers(freshPlayers),
              saveTeams(freshTeams),
              saveHistory([])
            ]);
            liveBroadcastReset();
            alert("✅ Bidding history wiped! All players are Available and team purses restored to 100% for a fresh auction setup.");
          } catch (err) {
            console.warn('Reset MongoDB error:', err);
            alert("⚠️ Saved locally, backend sync warning: " + err.message);
          }
        } else {
          liveBroadcastReset();
          alert("✅ Bidding history wiped and reset for fresh auction setup!");
        }
      }
    } else if (clean === '2' || clean.includes('reset') || clean.includes('purge')) {
      if (window.confirm("🔴 FINAL WARNING: Confirm permanent deletion of all live auction & team data from MongoDB Atlas?")) {
        setTeams([]);
        setPlayers([]);
        setHistory([]);
        setRules(TOURNAMENT_RULES);
        setMatches([]);
        localStorage.removeItem('nepl_teams');
        localStorage.removeItem('nepl_players');
        localStorage.removeItem('nepl_history');
        localStorage.removeItem('nepl_rules');
        localStorage.removeItem('nepl_matches');
        if (isMongoDB) {
          try {
            await Promise.all([savePlayers([]), saveTeams([]), saveHistory([]), saveMatches([])]);
            liveBroadcastReset();
            alert("✅ MongoDB Atlas database successfully cleared by Supreme Master.");
          } catch (err) {
            console.warn('Reset MongoDB error:', err);
            alert("⚠️ Failed to reset MongoDB database: " + err.message);
          }
        } else {
          liveBroadcastReset();
          alert("✅ Local storage database successfully cleared by Supreme Master.");
        }
      }
    }
  }, [user, players, teams, isMongoDB]);

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
    <div className="min-h-screen bg-[#141413] text-[#f3f1eb] font-sans pb-28 lg:pb-16 theme-root-container transition-colors duration-300">
      {/* Modern CSS Scroll Progress Indicator */}
      <div id="scroll-progress" aria-hidden="true" />

      {/* Fullscreen Projector View */}
      {isProjectorMode ? (
        <ProjectorView
          players={players}
          setPlayers={setPlayers}
          teams={teams}
          setTeams={setTeams}
          history={history}
          onClose={() => setIsProjectorMode(false)}
          viewerCount={viewerCount}
          liveSocketConnected={liveSocketConnected}
        />
      ) : (
        <>
          <Header
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            isProjectorMode={isProjectorMode}
            setIsProjectorMode={setIsProjectorMode}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            onResetData={handleResetData}
            players={players}
            setPlayers={setPlayers}
            teams={teams}
            setTeams={setTeams}
            onOpenAiChat={() => setIsAiChatOpen(true)}
            viewerCount={viewerCount}
            liveSocketConnected={liveSocketConnected}
          />

          <main className="max-w-[1920px] 3xl:max-w-[2400px] w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-3 sm:pt-6">
            {activeTab === 'auction' && (
              <AuctionRoom
                players={players}
                setPlayers={setPlayers}
                teams={teams}
                setTeams={setTeams}
                history={history}
                setHistory={setHistory}
                viewerCount={viewerCount}
                liveSocketConnected={liveSocketConnected}
              />
            )}
            {activeTab === 'teams' && (
              <TeamsView
                teams={teams}
                setTeams={setTeams}
                players={players}
                setPlayers={setPlayers}
                onOpenAiChat={() => setIsAiChatOpen(true)}
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
            {activeTab === 'rules' && (
              <RulesHub
                rules={rules}
                setRules={setRules}
                onOpenAiChat={() => setIsAiChatOpen(true)}
              />
            )}
            {activeTab === 'schedule' && can('canViewSchedule') && (
              <ScheduleStandings
                teams={teams}
                matches={matches}
                setMatches={setMatches}
              />
            )}
          </main>

          {/* Gemini-Powered AI Tournament Strategist & Team Balancer */}
          <GeminiChatBot
            players={players}
            setPlayers={setPlayers}
            teams={teams}
            setTeams={setTeams}
            isOpen={isAiChatOpen}
            setIsOpen={setIsAiChatOpen}
          />

          {/* Mobile App-like Bottom Navigation Dock */}
          <MobileNav
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            onOpenAiChat={() => setIsAiChatOpen(true)}
          />

          {/* Global Cyber Footer */}
          <footer className="mt-12 lg:mt-16 border-t border-cyan-500/15 pt-6 pb-8 text-center text-xs text-slate-400 font-mono flex flex-col sm:flex-row items-center justify-between gap-3 max-w-[1920px] 3xl:max-w-[2400px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
            <div>
              © {new Date().getFullYear()} onwards {tournamentSettings?.tournamentName || 'Nyati Era'} {tournamentSettings?.subtitle || 'Box Cricket League'}. All rights reserved.
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-serif shadow-[0_0_12px_rgba(121,40,202,0.2)]">
              <span className="text-[10px] uppercase font-sans text-slate-400">Version:</span>
              <span className="font-bold tracking-wide">कर्मण्येवाधिकारस्ते</span>
            </div>
          </footer>

          {/* MongoDB status indicator */}
          {isMongoDB && (
            <div className="fixed bottom-20 lg:bottom-4 right-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0b1120]/95 border border-cyan-500/30 text-[10px] text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.25)] font-mono backdrop-blur-md">
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
    <ErrorBoundary>
      <TournamentProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </TournamentProvider>
    </ErrorBoundary>
  );
}

