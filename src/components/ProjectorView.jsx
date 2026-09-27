import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Gavel, 
  Tv, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle,
  RotateCcw,
  Tag, 
  Award,
  Sparkles,
  Lock,
  Crown,
  Flame,
  Zap,
  Target,
  Shield,
  Activity,
  BarChart3,
  TrendingUp,
  Radio,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { updatePlayer as apiUpdatePlayer } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { useTournament } from '../context/TournamentContext';
import { getBidIncrement, getBidSlabInfo, getPlayerStartingBid } from '../utils/bidding';
import { calculatePlayerPerformance } from '../utils/playerScore';
import { 
  getSocket, 
  liveSelectPlayer, 
  livePlaceBid, 
  liveMarkSold, 
  liveMarkUnsold 
} from '../services/socket';

export default function ProjectorView({ 
  players = [], 
  setPlayers, 
  teams = [], 
  setTeams, 
  history = [],
  onClose,
  viewerCount = 1,
  liveSocketConnected = false,
}) {
  const { user, can } = useAuth();
  const { tournamentSettings } = useTournament();
  const isSuperAdmin = user?.role === 'superuser';
  const canBid = can('canBid');
  const canSell = can('canSellPlayer') || can('canUnsellPlayer');

  // ── Live Bid Stream State ──────────────────────────────────────────────────
  const [liveBidFeed, setLiveBidFeed] = useState(() => {
    return (history || [])
      .filter(h => h.type === 'BID' || h.type === 'SOLD')
      .slice(0, 15);
  });
  const [latestBidAlert, setLatestBidAlert] = useState(null);

  // Auto dismiss latest bid banner after 6s
  useEffect(() => {
    if (!latestBidAlert) return;
    const timer = setTimeout(() => {
      setLatestBidAlert(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [latestBidAlert]);
  // ── Player Priority Logic ──────────────────────────────────────────────────
  // Priority: 1. Available -> 2. Unsold -> 3. Sold (Filtered by Playing in NEPL)
  const playingPool = players.filter(p => p.isPlayingNEPL !== false);
  const availablePlayers = playingPool.filter(p => p.status === 'available');
  const unsoldPlayers = playingPool.filter(p => p.status === 'unsold');
  const soldPlayers = playingPool.filter(p => p.status === 'sold');

  const defaultPriorityPlayer = 
    availablePlayers[0] || 
    unsoldPlayers[0] || 
    playingPool[0] || 
    players[0] || 
    null;

  const [selectedId, setSelectedId] = useState(defaultPriorityPlayer?.id || null);
  const [liveCurrentBid, setLiveCurrentBid] = useState(null);
  const [liveHighBidder, setLiveHighBidder] = useState(null);

  // Sync selected player if list updates or if selectedId is invalid
  useEffect(() => {
    if (!selectedId || !players.some(p => p.id === selectedId)) {
      if (defaultPriorityPlayer) {
        setSelectedId(defaultPriorityPlayer.id);
      }
    }
  }, [players, selectedId]);

  // ── Multi-Device Real-Time Live Streaming Socket Listeners ────────────────
  useEffect(() => {
    const socket = getSocket();
    socket.emit('auction:getState');

    const handleStateSync = (state) => {
      if (state && state.activePlayerId) {
        setSelectedId(state.activePlayerId);
        if (state.currentBid) setLiveCurrentBid(state.currentBid);
        if (state.highBidder) setLiveHighBidder(state.highBidder);
      }
    };

    const handlePlayerSelected = (data) => {
      if (data && data.activePlayerId) {
        setSelectedId(data.activePlayerId);
        setLiveCurrentBid(data.currentBid || tournamentSettings?.defaultBasePrice || 100);
        setLiveHighBidder(null);
      }
    };

    const handleBidPlaced = (data) => {
      if (data) {
        if (data.playerId) setSelectedId(data.playerId);
        setLiveCurrentBid(data.currentBid);
        setLiveHighBidder(data.highBidder);
        soundFx.playBid();

        const pName = data.logItem?.playerName || players.find(p => p.id === data.playerId)?.name || 'Player';
        const tName = data.highBidder?.name || data.logItem?.teamName || 'Franchise';
        const tColor = data.highBidder?.color || data.logItem?.teamColor || '#00f2fe';
        const amt = data.currentBid;
        const time = data.logItem?.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const streamEntry = {
          id: data.logItem?.id || `${Date.now()}-${Math.random()}`,
          type: 'BID',
          playerId: data.playerId,
          playerName: pName,
          teamName: tName,
          teamColor: tColor,
          amount: amt,
          timestamp: time,
        };

        setLiveBidFeed(prev => [streamEntry, ...prev.filter(item => item.id !== streamEntry.id).slice(0, 19)]);
        setLatestBidAlert(streamEntry);
      }
    };

    const handlePlayerSold = (data) => {
      soundFx.playSold();
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 }
      });

      if (data) {
        const pName = data.player?.name || data.logItem?.playerName || 'Player';
        const tName = data.team?.name || data.logItem?.teamName || 'Franchise';
        const tColor = data.team?.color || '#10b981';
        const amt = data.soldPrice;
        const time = data.logItem?.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const soldEntry = {
          id: `${Date.now()}-sold`,
          type: 'SOLD',
          playerId: data.playerId,
          playerName: pName,
          teamName: tName,
          teamColor: tColor,
          amount: amt,
          timestamp: time,
        };

        setLiveBidFeed(prev => [soldEntry, ...prev.slice(0, 19)]);
        setLatestBidAlert(soldEntry);
      }
    };

    const handlePlayerUnsold = (data) => {
      soundFx.playUnsold();
      setLiveHighBidder(null);
      const unsoldEntry = data?.logItem || {
        id: Date.now().toString(),
        type: 'UNSOLD',
        playerName: data?.player?.name || 'Player',
        timestamp: new Date().toLocaleTimeString(),
      };
      setLiveBidFeed(prev => [unsoldEntry, ...prev.slice(0, 19)]);
      setLatestBidAlert(unsoldEntry);
    };

    const handleBidRevoked = (data) => {
      if (data) {
        setLiveCurrentBid(data.currentBid);
        setLiveHighBidder(null);
      }
    };

    const handleBidReduced = (data) => {
      if (data) {
        setLiveCurrentBid(data.currentBid);
      }
    };

    socket.on('auction:stateSync', handleStateSync);
    socket.on('auction:playerSelected', handlePlayerSelected);
    socket.on('auction:bidPlaced', handleBidPlaced);
    socket.on('auction:playerSold', handlePlayerSold);
    socket.on('auction:playerUnsold', handlePlayerUnsold);
    socket.on('auction:bidRevoked', handleBidRevoked);
    socket.on('auction:bidReduced', handleBidReduced);

    return () => {
      socket.off('auction:stateSync', handleStateSync);
      socket.off('auction:playerSelected', handlePlayerSelected);
      socket.off('auction:bidPlaced', handleBidPlaced);
      socket.off('auction:playerSold', handlePlayerSold);
      socket.off('auction:playerUnsold', handlePlayerUnsold);
      socket.off('auction:bidRevoked', handleBidRevoked);
      socket.off('auction:bidReduced', handleBidReduced);
    };
  }, []);

  const activePlayer = players.find(p => p.id === selectedId) || defaultPriorityPlayer;
  const isSoldOut = activePlayer?.status === 'sold';
  const isUnsold = activePlayer?.status === 'unsold';
  const perf = calculatePlayerPerformance(activePlayer);

  // Helper to extract captain initials (e.g. Rahul Kumeriya -> RK)
  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper to resolve Captain information (name, avatar, initials) for any team
  const getCaptainInfo = (team) => {
    if (!team) return null;

    // 1. Check squad for isCaptain
    const squadCap = (team.squad || []).find(p => p.isCaptain);
    if (squadCap) {
      const full = players.find(p => p.id === squadCap.id) || squadCap;
      return {
        name: full.name,
        avatarUrl: full.avatarUrl || '/avatars/male.png',
        initials: getInitials(full.name),
      };
    }

    // 2. Check team.captainId
    if (team.captainId) {
      const full = players.find(p => p.id === team.captainId);
      if (full) {
        return {
          name: full.name,
          avatarUrl: full.avatarUrl || '/avatars/male.png',
          initials: getInitials(full.name),
        };
      }
    }

    // 3. Check players pool for captainOfTeamId or soldTo with isCaptain
    const taggedPlayer = players.find(p => 
      p.captainOfTeamId === team.id || (p.isCaptain && p.soldTo === team.id)
    );
    if (taggedPlayer) {
      return {
        name: taggedPlayer.name,
        avatarUrl: taggedPlayer.avatarUrl || '/avatars/male.png',
        initials: getInitials(taggedPlayer.name),
      };
    }

    // 4. Fallback from team.captainName or team.owner
    const name = team.captainName || team.owner || 'Team Captain';
    return {
      name,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=f59e0b&bold=true`,
      initials: getInitials(name),
    };
  };

  // Buyer team if sold, or current leading team if bidding
  const buyerTeamObj = activePlayer && isSoldOut ? teams.find(t => t.id === activePlayer.soldTo) : null;
  const leadingTeamObj = activePlayer ? teams.find(t => t.id === (liveHighBidder?.id || activePlayer.leadingTeam)) : null;
  const displayedTeamObj = buyerTeamObj || (liveHighBidder ? (teams.find(t => t.id === liveHighBidder.id) || liveHighBidder) : leadingTeamObj);

  const effectiveBasePrice = getPlayerStartingBid(activePlayer, tournamentSettings?.defaultBasePrice);
  const currentBid = activePlayer ? (
    isSoldOut 
      ? (activePlayer.soldPrice || effectiveBasePrice) 
      : (liveCurrentBid !== null ? liveCurrentBid : (activePlayer.currentBid || effectiveBasePrice))
  ) : effectiveBasePrice;

  // ── Navigation Handlers ───────────────────────────────────────────────────
  const [navPoolMode, setNavPoolMode] = useState('available'); // 'available' | 'all'
  const activeNavPool = navPoolMode === 'available'
    ? (availablePlayers.length > 0 ? availablePlayers : (playingPool.length > 0 ? playingPool : players))
    : (playingPool.length > 0 ? playingPool : players);

  const currentNavIdx = activeNavPool.findIndex(p => p.id === activePlayer?.id);

  const handlePrevNav = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (activeNavPool.length === 0) return;
    const newIdx = currentNavIdx > 0 ? currentNavIdx - 1 : activeNavPool.length - 1;
    const target = activeNavPool[newIdx];
    if (target) {
      setSelectedId(target.id);
      const startBid = getPlayerStartingBid(target, tournamentSettings?.defaultBasePrice);
      setLiveCurrentBid(startBid);
      setLiveHighBidder(null);
      liveSelectPlayer(target.id, startBid);
    }
  };

  const handleNextNav = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (activeNavPool.length === 0) return;
    const newIdx = currentNavIdx < activeNavPool.length - 1 ? currentNavIdx + 1 : 0;
    const target = activeNavPool[newIdx];
    if (target) {
      setSelectedId(target.id);
      const startBid = getPlayerStartingBid(target, tournamentSettings?.defaultBasePrice);
      setLiveCurrentBid(startBid);
      setLiveHighBidder(null);
      liveSelectPlayer(target.id, startBid);
    }
  };

  // Keyboard navigation for TV presentation clickers & remotes (← and →)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevNav();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextNav();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentNavIdx, activeNavPool]);

  // ── Header Player Switcher Handlers ───────────────────────────────────────
  const currentIndex = players.findIndex(p => p.id === activePlayer?.id);

  const handlePrevPlayer = () => {
    if (players.length === 0) return;
    const newIdx = currentIndex > 0 ? currentIndex - 1 : players.length - 1;
    const target = players[newIdx];
    if (target) {
      setSelectedId(target.id);
      const startBid = getPlayerStartingBid(target, tournamentSettings?.defaultBasePrice);
      setLiveCurrentBid(startBid);
      setLiveHighBidder(null);
      liveSelectPlayer(target.id, startBid);
    }
  };

  const handleNextPlayer = () => {
    if (players.length === 0) return;
    const newIdx = currentIndex < players.length - 1 ? currentIndex + 1 : 0;
    const target = players[newIdx];
    if (target) {
      setSelectedId(target.id);
      const startBid = getPlayerStartingBid(target, tournamentSettings?.defaultBasePrice);
      setLiveCurrentBid(startBid);
      setLiveHighBidder(null);
      liveSelectPlayer(target.id, startBid);
    }
  };

  // Backward compatibility alias for side navigation
  const handlePrevAvailablePlayer = handlePrevNav;
  const handleNextAvailablePlayer = handleNextNav;

  // ── Quick Bid Handler ─────────────────────────────────────────────────────
  const handleQuickBid = (team, customIncrement) => {
    if (!activePlayer || isSoldOut) return;

    // 🛑 Round-Robin Rule: No team can successively bid on the player against themselves!
    if (activePlayer.leadingTeam === team.id) {
      alert(`⚠️ Alternating Bid Rule: ${team.name} is ALREADY the leading bidder! Another team must place a counter-bid before ${team.name} can bid again.`);
      return;
    }

    const effectiveBase = getPlayerStartingBid(activePlayer, tournamentSettings?.defaultBasePrice);
    const hasBids = Boolean(liveHighBidder || (activePlayer.leadingTeam && (activePlayer.currentBid > effectiveBase || (liveCurrentBid && liveCurrentBid > effectiveBase))));
    const curBid = liveCurrentBid || activePlayer.currentBid || effectiveBase;
    const increment = getBidIncrement(curBid, tournamentSettings?.bidIncrementStep, effectiveBase);
    if (!increment || isNaN(increment) || increment <= 0) return;

    // First bid starts strictly at Base Price (e.g. 10,000); subsequent bids increment by custom step
    const nextBid = hasBids ? (curBid + increment) : effectiveBase;

    if (nextBid <= 0) {
      alert("⚠️ Invalid Bid: Bidding amount must be a positive number greater than 0!");
      return;
    }

    const remainingPurse = team.totalPurse - team.spentPurse;
    const maxSquad = team.maxSquadSize || 10;

    if (nextBid > remainingPurse) {
      alert(`⚠️ Insufficient Purse: ${team.name} only has ₹${remainingPurse} PTS remaining budget. Cannot place bid of ₹${nextBid} PTS!`);
      return;
    }
    if ((team.squad?.length || 0) >= maxSquad) {
      alert(`⚠️ Squad Limit Reached: ${team.name} has reached its ${maxSquad}-player capacity!`);
      return;
    }

    soundFx.playBid();
    setLiveCurrentBid(nextBid);
    setLiveHighBidder(team);

    setPlayers(prev => prev.map(p => {
      if (p.id === activePlayer.id) {
        return { ...p, currentBid: nextBid, leadingTeam: team.id };
      }
      return p;
    }));

    const logItem = {
      id: Date.now().toString(),
      type: 'BID',
      playerId: activePlayer.id,
      playerName: activePlayer.name,
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      amount: nextBid,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    livePlaceBid(activePlayer.id, team, nextBid, logItem);
    setLiveBidFeed(prev => [logItem, ...prev.slice(0, 19)]);
    setLatestBidAlert(logItem);
  };

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setIsProcessing(false);
  }, [selectedId]);

  // ── Mark Sold Handler ─────────────────────────────────────────────────────
  const handleSold = () => {
    if (isProcessing) return;
    if (!activePlayer || isSoldOut || !activePlayer.leadingTeam) return;

    const buyerTeam = teams.find(t => t.id === activePlayer.leadingTeam);
    if (!buyerTeam) return;

    const alreadyInSquad = (buyerTeam.squad || []).some(p => p.id === activePlayer.id);
    if (alreadyInSquad) {
      alert(`⚠️ ${activePlayer.name} has already been sold to ${buyerTeam.name}!`);
      return;
    }

    setIsProcessing(true);
    soundFx.playSold();
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5 }
    });

    const finalPrice = liveCurrentBid || activePlayer.currentBid || activePlayer.basePrice || tournamentSettings?.defaultBasePrice || 100;

    const updatedPlayer = {
      ...activePlayer,
      status: 'sold',
      soldPrice: finalPrice,
      soldTo: buyerTeam.id
    };

    const updatedSquad = [...(buyerTeam.squad || []), { ...activePlayer, soldPrice: finalPrice }];
    const updatedTeam = {
      ...buyerTeam,
      spentPurse: buyerTeam.spentPurse + finalPrice,
      playersCount: updatedSquad.length,
      squad: updatedSquad
    };

    // Update React State
    setPlayers(prev => prev.map(p => p.id === activePlayer.id ? updatedPlayer : p));
    setTeams(prev => prev.map(t => t.id === buyerTeam.id ? updatedTeam : t));

    // Persist directly to MongoDB Atlas
    apiUpdatePlayer(activePlayer.id, updatedPlayer).catch(err => console.warn('MongoDB sold player update err:', err));
    apiUpdateTeam(buyerTeam.id, updatedTeam).catch(err => console.warn('MongoDB sold team update err:', err));

    const soldLogItem = {
      id: Date.now().toString(),
      type: 'SOLD',
      playerName: activePlayer.name,
      teamName: buyerTeam.name,
      amount: finalPrice,
      timestamp: new Date().toLocaleTimeString()
    };
    liveMarkSold(activePlayer.id, buyerTeam.id, finalPrice, updatedPlayer, updatedTeam, soldLogItem);

    setTimeout(() => {
      const nextAvailable = playingPool.find(p => p.id !== activePlayer.id && p.status === 'available');
      const nextUnsold = playingPool.find(p => p.id !== activePlayer.id && p.status === 'unsold');
      const nextTarget = nextAvailable || nextUnsold;

      setLiveHighBidder(null);
      if (nextTarget) {
        setSelectedId(nextTarget.id);
        const nextPrice = getPlayerStartingBid(nextTarget, tournamentSettings?.defaultBasePrice);
        setLiveCurrentBid(nextPrice);
        liveSelectPlayer(nextTarget.id, nextPrice);
      }
      setIsProcessing(false);
    }, 1200);
  };

  // ── Mark Unsold Handler ───────────────────────────────────────────────────
  const handleMarkUnsold = () => {
    if (!activePlayer || isSoldOut) return;
    
    try {
      soundFx.playUnsold();
    } catch (e) {
      console.warn('Audio play error:', e);
    }

    const startPrice = getPlayerStartingBid(activePlayer, tournamentSettings?.defaultBasePrice);
    const updated = {
      ...activePlayer,
      status: 'unsold',
      soldPrice: 0,
      soldTo: null,
      currentBid: startPrice,
      leadingTeam: null
    };

    if (typeof setPlayers === 'function') {
      setPlayers(prev => prev.map(p => p.id === activePlayer.id ? updated : p));
    }
    apiUpdatePlayer(activePlayer.id, updated).catch(err => console.warn('MongoDB unsold update error:', err));
    
    const unsoldLogItem = {
      id: Date.now().toString(),
      type: 'UNSOLD',
      playerName: activePlayer.name,
      timestamp: new Date().toLocaleTimeString()
    };
    liveMarkUnsold(activePlayer.id, updated, unsoldLogItem);

    setLiveHighBidder(null);

    // Auto advance to next available/unsold player in pool
    const pool = playingPool.length > 0 ? playingPool : players;
    const nextAvailable = pool.find(p => p.id !== activePlayer.id && p.status === 'available');
    const nextUnsold = pool.find(p => p.id !== activePlayer.id && p.status === 'unsold');
    const nextTarget = nextAvailable || nextUnsold;

    if (nextTarget) {
      setSelectedId(nextTarget.id);
      const nextPrice = getPlayerStartingBid(nextTarget, tournamentSettings?.defaultBasePrice);
      setLiveCurrentBid(nextPrice);
      liveSelectPlayer(nextTarget.id, nextPrice);
    } else {
      setLiveCurrentBid(startPrice);
    }
  };

  // ── Revoke Bid Handler ───────────────────────────────────────────────────
  const handleRevokeBid = () => {
    if (!activePlayer || isSoldOut || !activePlayer.leadingTeam) return;
    const baseVal = getPlayerStartingBid(activePlayer, tournamentSettings?.defaultBasePrice);
    if (!window.confirm(`Revoke current high bid on "${activePlayer.name}" and reset to Base Price ₹${baseVal.toLocaleString()} PTS?`)) return;
    
    const updated = {
      ...activePlayer,
      currentBid: baseVal,
      leadingTeam: null
    };
    setPlayers(prev => prev.map(p => p.id === activePlayer.id ? updated : p));
    setLiveCurrentBid(baseVal);
    setLiveHighBidder(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070b14] text-white flex flex-col justify-between p-4 sm:p-8 select-none overflow-hidden font-sans">
      
      {/* Background Neon Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-tr from-cyan-500/10 via-purple-600/10 to-rose-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* ⚡ High-Impact Live Bid Pop-in Broadcast Alert */}
      {latestBidAlert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 backdrop-blur-2xl px-6 py-3.5 rounded-2xl border-2 border-cyan-400 shadow-[0_0_50px_rgba(0,242,254,0.65)] flex items-center gap-3.5 animate-fade-in">
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500"></span>
          </span>
          <span className="text-[11px] font-black uppercase tracking-widest text-cyan-300 font-mono">
            {latestBidAlert.type === 'SOLD' ? '🔨 SOLD OUT' : '⚡ LIVE BID APPLIED'}
          </span>
          <span className="text-white font-black text-base sm:text-xl">
            {latestBidAlert.teamName}
          </span>
          <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 drop-shadow-[0_0_15px_#00ff87]">
            ₹{latestBidAlert.amount} PTS
          </span>
          <span className="text-xs text-slate-300 font-sans hidden sm:inline">
            for <strong className="text-amber-300">{latestBidAlert.playerName}</strong>
          </span>
        </div>
      )}

      {/* ── Top TV Header Controls ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 z-10 border-b border-cyan-500/20 pb-4 max-w-[1800px] 3xl:max-w-[2100px] w-full mx-auto">
        
        {/* Branding */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white p-1 border border-cyan-500/40 shadow-[0_0_20px_rgba(0,242,254,0.4)] shrink-0 flex items-center justify-center">
            <img
              src={tournamentSettings?.logoUrl || '/nyati_era_logo.png'}
              alt={tournamentSettings?.tournamentName || 'Tournament Logo'}
              className="w-full h-full object-contain"
              onError={(e) => { e.target.src = '/nyati_era_logo.png'; }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight gradient-text-brand font-sans">
                {tournamentSettings?.tournamentName || 'Nyati Era'} {tournamentSettings?.subtitle || 'Premier League'} {tournamentSettings?.edition || new Date().getFullYear()}
              </h1>
              <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-serif font-bold shadow-[0_0_12px_rgba(121,40,202,0.3)]">
                कर्मण्येवाधिकारस्ते
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-0.5">
              <p className="text-xs text-cyan-400 font-mono font-bold flex items-center gap-2">
                <span>Live TV Projector Screen</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#00ff87]" />
              </p>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-[10px] font-bold text-red-400 font-mono tracking-tight animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                <span>STREAM SYNCED • {viewerCount || 1} {viewerCount === 1 ? 'DEVICE' : 'DEVICES'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Navigation & Status Pills */}
        <div className="flex items-center space-x-3">
          {/* Status Counter Badge */}
          <div className="flex items-center space-x-2 bg-slate-900/90 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-emerald-400 font-bold">{availablePlayers.length} Available</span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-400 font-bold">{soldPlayers.length} Sold Out</span>
          </div>

          {/* Player Switcher Prev/Next */}
          {players.length > 1 && (
            <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                onClick={handlePrevPlayer}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition"
                title="Previous Player"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-400 px-2">
                {currentIndex + 1} / {players.length}
              </span>
              <button
                onClick={handleNextPlayer}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition"
                title="Next Player"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Exit TV Button */}
          <button
            onClick={onClose}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider transition shadow-sm"
          >
            <Tv className="w-4 h-4 text-rose-400" />
            <span>Exit TV</span>
          </button>
        </div>

      </div>

      {/* ── Real-Time Live Bid Stream Broadcast Strip ── */}
      <div className="z-10 w-full max-w-[1800px] 3xl:max-w-[2100px] mx-auto mt-2 mb-1 bg-slate-950/85 backdrop-blur-xl border border-cyan-500/30 rounded-2xl py-2 px-4 flex items-center justify-between gap-4 shadow-[0_4px_25px_rgba(0,242,254,0.15)] overflow-hidden">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </span>
          <span className="text-xs font-black font-mono tracking-widest uppercase text-rose-400 flex items-center gap-1.5">
            <span>LIVE BID STREAM</span>
          </span>
        </div>

        {/* Stream Content Ticker */}
        <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-3">
          {liveBidFeed.length > 0 ? (
            liveBidFeed.slice(0, 8).map((item, idx) => (
              <div 
                key={item.id || idx}
                className={`flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-mono shrink-0 transition-all border ${
                  idx === 0 
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.3)] font-bold scale-[1.02]' 
                    : 'bg-slate-900/80 text-slate-300 border-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.teamColor || '#00f2fe' }} />
                <span className="font-extrabold text-white truncate max-w-[130px]">{item.teamName}</span>
                <span className="font-black text-emerald-400">₹{item.amount} PTS</span>
                {item.playerName && (
                  <span className="text-slate-400 text-[10px] hidden sm:inline">for {item.playerName}</span>
                )}
                <span className="text-[10px] text-slate-500">({item.timestamp})</span>
              </div>
            ))
          ) : (
            <span className="text-xs font-mono text-slate-500 flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-slate-600 animate-pulse" />
              <span>Waiting for live franchise bids to stream across devices…</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Main Theater Bidding Display ── */}
      {activePlayer ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-center z-10 max-w-[1800px] 3xl:max-w-[2100px] mx-auto w-full my-auto py-2">
          
          {/* Left Column: Unified Enlarged Player Photo with Side Navigation Arrows */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            
            {/* Unified Showcase Card with Side Floating Navigation Arrows */}
            <div className="relative w-full max-w-[340px] sm:max-w-[400px] xl:max-w-[460px] 2xl:max-w-[500px] 3xl:max-w-[540px] flex items-center justify-center">
              
              {/* ⬅️ Previous Player Arrow (Around Picture Left) */}
              {activeNavPool.length > 1 && (
                <button
                  onClick={handlePrevAvailablePlayer}
                  className="absolute -left-4 sm:-left-6 top-1/3 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-2xl bg-[#070b14]/90 hover:bg-cyan-400 text-cyan-300 hover:text-slate-950 border border-cyan-500/50 hover:border-cyan-300 shadow-[0_0_25px_rgba(0,0,0,0.9)] hover:shadow-[0_0_30px_rgba(0,242,254,0.8)] transition-all transform hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md group"
                  title="Previous Available Player (←)"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:-translate-x-0.5" />
                </button>
              )}

              {/* Showcase Card Frame */}
              <div className={`w-full rounded-3xl overflow-hidden border-4 transition-all duration-500 bg-slate-900 shadow-2xl relative ${
                isSoldOut 
                  ? 'border-rose-500/80 shadow-[0_0_60px_rgba(244,63,94,0.45)]' 
                  : isUnsold
                    ? 'border-amber-500/80 shadow-[0_0_60px_rgba(245,158,11,0.35)]'
                    : 'border-cyan-500/50 shadow-[0_0_50px_rgba(0,242,254,0.35)]'
              }`}>
                
                {/* Photo Area with Direct On-Image Pagination Controls */}
                <div className="h-72 sm:h-80 xl:h-[380px] 2xl:h-[420px] 3xl:h-[460px] w-full relative overflow-hidden bg-slate-950 select-none group/photo">
                  <img
                    key={activePlayer.id}
                    src={activePlayer.avatarUrl}
                    alt={activePlayer.name}
                    className={`w-full h-full object-cover object-[center_15%] scale-105 transition-all duration-500 animate-fade-in ${
                      isSoldOut ? 'grayscale-[30%] brightness-75' : isUnsold ? 'grayscale-[20%] brightness-85' : ''
                    }`}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                    }}
                  />

                  {/* 🔴 PROMINENT SOLD OUT STAMP OVERLAY */}
                  {isSoldOut && (
                    <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 pointer-events-none z-20">
                      <div className="transform -rotate-12 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white font-black text-2xl sm:text-3xl uppercase tracking-widest px-6 py-2 rounded-2xl shadow-[0_0_25px_rgba(244,63,94,0.8)] border-2 border-white/40 animate-pulse flex items-center gap-2">
                        <Tag className="w-5 h-5" />
                        <span>SOLD OUT</span>
                      </div>

                      <div className="mt-3 text-center space-y-0.5">
                        <span className="text-[10px] uppercase text-slate-400 font-bold block tracking-wider">Final Sold Price</span>
                        <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono drop-shadow-[0_0_12px_rgba(0,255,135,0.5)]">
                          ₹{activePlayer.soldPrice || currentBid} PTS
                        </span>
                      </div>

                      {buyerTeamObj && (
                        <div className="mt-2 bg-slate-900/90 px-3 py-1 rounded-xl border border-rose-500/40 flex items-center space-x-1.5 shadow-md">
                          <span className="font-bold text-white text-xs">{buyerTeamObj.name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 🟡 PROMINENT UNSOLD / PASSED STAMP OVERLAY */}
                  {isUnsold && !isSoldOut && (
                    <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 pointer-events-none z-20">
                      <div className="transform -rotate-12 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 text-white font-black text-2xl sm:text-3xl uppercase tracking-widest px-6 py-2.5 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.8)] border-2 border-white/40 animate-pulse flex items-center gap-2">
                        <XCircle className="w-6 h-6 text-white" />
                        <span>UNSOLD / PASSED</span>
                      </div>
                      <span className="mt-3 text-xs font-mono font-bold text-amber-200 bg-slate-950/90 px-3.5 py-1 rounded-full border border-amber-500/50 shadow-md">
                        Available in subsequent rounds
                      </span>
                    </div>
                  )}

                  {/* Category Pill Badge (Top Left) */}
                  <div className="absolute top-3 left-3 z-30 bg-slate-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-cyan-500/50 text-cyan-300 font-black text-xs uppercase tracking-wider shadow-lg">
                    {activePlayer.category}
                  </div>

                  {/* Counter & Pool Toggle Badge (Top Right) */}
                  <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300 shadow-md">
                    <span>{currentNavIdx >= 0 ? currentNavIdx + 1 : 1}</span>
                    <span className="text-slate-600">/</span>
                    <span>{activeNavPool.length}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNavPoolMode(prev => prev === 'available' ? 'all' : 'available');
                      }}
                      className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 uppercase tracking-wider transition cursor-pointer border border-cyan-500/30"
                      title={`Toggle pool filter (Current: ${navPoolMode === 'available' ? 'Available Only' : 'All Players'})`}
                    >
                      {navPoolMode === 'available' ? 'Avail' : 'All'}
                    </button>
                  </div>

                  {/* 🔘 Bottom Pagination Pill Bar on Image */}
                  {activeNavPool.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 shadow-[0_4px_25px_rgba(0,0,0,0.9)] max-w-[92%]">
                      <button
                        type="button"
                        onClick={handlePrevNav}
                        className="p-1 rounded-full text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/20 transition cursor-pointer"
                        title="Previous Player"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-300 whitespace-nowrap">
                        <span className="text-cyan-400 font-extrabold">{currentNavIdx >= 0 ? currentNavIdx + 1 : 1}</span>
                        <span className="text-slate-600">/</span>
                        <span>{activeNavPool.length}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold tracking-wider hidden sm:inline ml-1">
                          {navPoolMode === 'available' ? 'Available' : 'Players'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleNextNav}
                        className="p-1 rounded-full text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/20 transition cursor-pointer"
                        title="Next Player"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* ⚡ Combined Performance Score Bottom Bar */}
                <div className="bg-[#070b14]/95 backdrop-blur-xl border-t border-cyan-500/30 p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span 
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xl font-bold shadow-md shrink-0"
                        style={{ backgroundColor: `${perf.tierColor}25`, border: `1px solid ${perf.tierColor}60` }}
                      >
                        {perf.badge}
                      </span>
                      <div title="OPR: Overall Performance Rating (60-99)">
                        <span className="text-[10px] font-bold text-slate-400 block tracking-wider font-sans">Overall Performance Rating</span>
                        <span className="text-xs font-black uppercase font-sans tracking-wide" style={{ color: perf.tierColor }}>{perf.tier}</span>
                      </div>
                    </div>
                    <div className="text-right" title="OPR (Overall Performance Rating): Composite score based on Runs, Strike Rate, Wickets, Economy & Match Impact">
                      <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight" style={{ color: perf.tierColor }}>
                        {perf.ovr} <span className="text-xs text-slate-400 font-bold font-sans">OPR</span>
                      </span>
                    </div>
                  </div>

                  {/* Performance Rating Sub-Gauges */}
                  <div className="space-y-1.5 pt-0.5 text-[11px] font-mono">
                    <div>
                      <div className="flex justify-between text-slate-300 text-[10px] mb-0.5">
                        <span className="flex items-center gap-1 font-bold text-amber-300 font-sans">
                          <Flame className="w-3 h-3 text-amber-400" /> Bat Power
                        </span>
                        <span className="text-amber-300 font-bold">{perf.battingRating} / 100</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-700 rounded-full" 
                          style={{ width: `${perf.battingRating}%` }} 
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-300 text-[10px] mb-0.5">
                        <span className="flex items-center gap-1 font-bold text-cyan-300 font-sans">
                          <Target className="w-3 h-3 text-cyan-400" /> Bowl Accuracy
                        </span>
                        <span className="text-cyan-300 font-bold">{perf.bowlingRating} / 100</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-700 rounded-full" 
                          style={{ width: `${perf.bowlingRating}%` }} 
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-300 text-[10px] mb-0.5">
                        <span className="flex items-center gap-1 font-bold text-emerald-300 font-sans">
                          <Zap className="w-3 h-3 text-emerald-400" /> Match Impact
                        </span>
                        <span className="text-emerald-300 font-bold">
                          {perf.impactRating}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700 rounded-full" 
                          style={{ width: `${perf.impactRating}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ➡️ Next Player Arrow (Around Picture Right) */}
              {activeNavPool.length > 1 && (
                <button
                  onClick={handleNextAvailablePlayer}
                  className="absolute -right-4 sm:-right-6 top-1/3 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-2xl bg-[#070b14]/90 hover:bg-cyan-400 text-cyan-300 hover:text-slate-950 border border-cyan-500/50 hover:border-cyan-300 shadow-[0_0_25px_rgba(0,0,0,0.9)] hover:shadow-[0_0_30px_rgba(0,242,254,0.8)] transition-all transform hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md group"
                  title="Next Available Player (→)"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </div>
            
            {/* CricHeroes Link */}
            {activePlayer.cricHeroesUrl && (
              <a
                href={activePlayer.cricHeroesUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full max-w-[340px] sm:max-w-[400px] xl:max-w-[460px] 2xl:max-w-[500px] 3xl:max-w-[540px] mt-2 flex items-center justify-center space-x-1.5 text-xs text-amber-300 hover:text-amber-200 font-bold bg-slate-900/90 px-3 py-1.5 rounded-xl border border-amber-500/30 transition shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>CricHeroes Profile</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Right Column: Player Stats, Bidding Box & Controls */}
          <div className="lg:col-span-7 space-y-3">
            
            {/* ── Justified Player Name & Badges Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
              <h2 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-white tracking-tight font-sans">
                {activePlayer.name}
              </h2>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Role Badge */}
                <span className="px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 font-bold text-xs border border-cyan-500/30 font-sans">
                  {activePlayer.role}
                </span>

                {Boolean(activePlayer.isCaptain || activePlayer.captainOfTeamId || teams.some(t => t.captainId === activePlayer.id || t.squad?.some(s => s.id === activePlayer.id && s.isCaptain))) && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/40 flex items-center gap-1 font-sans shadow-sm">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Captain (0 PTS)</span>
                  </span>
                )}
                
                {/* Live vs Sold Status Tag */}
                {isSoldOut ? (
                  <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-black text-xs border border-rose-500/40 uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Lock className="w-3 h-3" />
                    <span>SOLD OUT</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,255,135,0.3)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>LIVE ON AUCTION</span>
                  </span>
                )}
              </div>
            </div>

            {/* Tournament Match Statistics Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 text-center font-mono shadow-md">
              <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-sans font-bold block">Matches</span>
                <span className="text-lg sm:text-xl font-black text-slate-100">{activePlayer.matches || 0}</span>
              </div>
              <div className="p-2 bg-slate-950/60 rounded-xl border border-emerald-500/20">
                <span className="text-[11px] text-emerald-400/90 font-sans font-bold block">Runs</span>
                <span className="text-lg sm:text-xl font-black text-emerald-400">{activePlayer.runs || 0}</span>
              </div>
              <div className="p-2 bg-slate-950/60 rounded-xl border border-amber-500/20">
                <span className="text-[11px] text-amber-400/90 font-sans font-bold block">Strike Rate</span>
                <span className="text-lg sm:text-xl font-black text-amber-400">{activePlayer.strikeRate || 0}</span>
              </div>
              <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-sans font-bold block">Average</span>
                <span className="text-lg sm:text-xl font-black text-slate-200">{activePlayer.avg || 0}</span>
              </div>
              <div className="p-2 bg-slate-950/60 rounded-xl border border-cyan-500/20">
                <span className="text-[11px] text-cyan-400/90 font-sans font-bold block">Wickets</span>
                <span className="text-lg sm:text-xl font-black text-cyan-400">{activePlayer.wickets || 0}</span>
              </div>
              <div className="p-2 bg-slate-950/60 rounded-xl border border-purple-500/20">
                <span className="text-[11px] text-purple-300 font-sans font-bold block">Economy</span>
                <span className="text-lg sm:text-xl font-black text-purple-300 block">
                  {activePlayer.economy || '—'}
                </span>
              </div>
            </div>

            {/* Price Box */}
            <div className={`p-4 sm:p-5 rounded-2xl backdrop-blur-xl border shadow-xl flex items-center justify-between transition-all duration-300 ${
              isSoldOut 
                ? 'bg-rose-950/40 border-rose-500/40 shadow-rose-950/50' 
                : isUnsold
                  ? 'bg-amber-950/30 border-amber-500/40 shadow-amber-950/40'
                  : 'bg-slate-900/90 border-cyan-500/30 shadow-cyan-950/50'
            }`}>
              <div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Base Price</span>
                <span className="text-xl sm:text-2xl font-bold text-slate-200 font-mono">₹{effectiveBasePrice.toLocaleString()} PTS</span>
              </div>

              <div className="text-right">
                <span className={`text-[11px] font-extrabold uppercase tracking-widest block ${
                  isSoldOut ? 'text-rose-400' : isUnsold ? 'text-amber-400' : 'text-cyan-400'
                }`}>
                  {isSoldOut ? 'FINAL SOLD PRICE' : isUnsold ? 'STATUS: UNSOLD' : (leadingTeamObj ? 'CURRENT HIGH BID' : 'CURRENT BID')}
                </span>
                <span className={`text-3xl sm:text-5xl font-black font-mono drop-shadow-md ${
                  isSoldOut ? 'text-emerald-400' : isUnsold ? 'text-amber-300' : 'text-cyan-300 drop-shadow-[0_0_20px_rgba(0,242,254,0.4)]'
                }`}>
                  ₹{currentBid.toLocaleString()} PTS
                </span>
              </div>
            </div>

            {/* Leading Team Display */}
            {leadingTeamObj ? (
              <div 
                className="p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between shadow-md"
                style={{
                  backgroundColor: `${leadingTeamObj.color || '#00f2fe'}18`,
                  borderColor: `${leadingTeamObj.color || '#00f2fe'}60`,
                }}
              >
                {(() => {
                  const cap = getCaptainInfo(leadingTeamObj);
                  return (
                    <div className="flex items-center space-x-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {isSoldOut ? 'Sold To Franchise' : 'Leading High Bidder'}
                        </span>
                        <h4 className="text-base sm:text-lg font-black text-white font-sans">
                          {leadingTeamObj.name}
                        </h4>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center gap-3">
                  <div className="text-right font-mono">
                    <span className="text-[9px] uppercase font-bold text-cyan-300 tracking-wider block">
                      {isSoldOut ? 'Sold For' : 'Current High Bid'}
                    </span>
                    <span className="text-base sm:text-xl font-black text-cyan-200">
                      ₹{currentBid.toLocaleString()} PTS
                    </span>
                  </div>

                  {isSoldOut && (
                    <span className="px-3 py-1 rounded-xl bg-rose-500/30 text-rose-200 font-bold text-xs uppercase tracking-wider border border-rose-400/40 shrink-0">
                      SQUAD CONFIRMED
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 text-center rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-slate-500 text-xs font-mono">
                Waiting for opening bid from teams below…
              </div>
            )}

            {/* ── Live Bid Stream Activity Box (Who & How Much Bid Applied) ── */}
            <div className="bg-slate-900/90 rounded-2xl border border-cyan-500/25 p-3 space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  <span>Real-Time Live Bid Stream</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {liveBidFeed.filter(b => b.playerId === activePlayer?.id).length} Bids on Player
                </span>
              </div>

              {/* Feed List */}
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 font-mono text-xs">
                {liveBidFeed.filter(b => b.playerId === activePlayer?.id).length > 0 ? (
                  liveBidFeed.filter(b => b.playerId === activePlayer?.id).slice(0, 4).map((bid, bIdx) => (
                    <div 
                      key={bid.id || bIdx} 
                      className={`flex items-center justify-between p-2 rounded-xl border transition ${
                        bIdx === 0 
                          ? 'bg-cyan-500/15 border-cyan-400/50 shadow-sm text-white font-bold' 
                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: bid.teamColor || '#00f2fe' }} />
                        <span className="text-sand-100 font-extrabold truncate max-w-[150px]">
                          {bid.teamName}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">applied bid</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-black text-emerald-400">
                          ₹{bid.amount} PTS
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {bid.timestamp}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-slate-500 text-xs italic">
                    Waiting for franchise auctioneers to apply bids on <strong className="text-slate-300 not-italic">{activePlayer?.name}</strong>…
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Bidding Tier Indicator */}
            {!isSoldOut && (
              <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex items-center justify-between text-xs font-mono shadow-sm">
                <div className="flex items-center space-x-2 text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f2fe]" />
                  <span className="font-bold uppercase tracking-wider text-[10px]">
                    {getBidSlabInfo(currentBid, tournamentSettings?.bidIncrementStep, activePlayer?.basePrice).label} ({getBidSlabInfo(currentBid, tournamentSettings?.bidIncrementStep, activePlayer?.basePrice).rangeText})
                  </span>
                </div>
                <span className="text-emerald-400 font-extrabold text-xs">
                  Min Step: +₹{getBidIncrement(currentBid, tournamentSettings?.bidIncrementStep, activePlayer?.basePrice).toLocaleString()} PTS
                </span>
              </div>
            )}

            {/* Team Bidding Control Suite */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
              {teams.map((t) => {
                const isCurrentLeading = activePlayer?.leadingTeam === t.id || (liveHighBidder?.id === t.id);
                const isDisabled = isSoldOut || !canBid || isCurrentLeading;
                const effectiveBase = getPlayerStartingBid(activePlayer, tournamentSettings?.defaultBasePrice);
                const hasBids = Boolean(liveHighBidder || (activePlayer?.leadingTeam && (activePlayer?.currentBid > effectiveBase || (liveCurrentBid && liveCurrentBid > effectiveBase))));
                const currentInc = getBidIncrement(currentBid, tournamentSettings?.bidIncrementStep, effectiveBase);
                const nextBidAmount = hasBids ? (currentBid + currentInc) : effectiveBase;
                const remainingPurse = t.totalPurse - t.spentPurse;
                const canAfford = remainingPurse >= nextBidAmount;

                return (
                  <button
                    key={t.id}
                    disabled={isDisabled || (!isCurrentLeading && !canAfford)}
                    onClick={() => handleQuickBid(t, currentInc)}
                    className={`p-2.5 pl-3 rounded-xl text-left transition border relative overflow-hidden ${
                      isCurrentLeading
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100 ring-2 ring-cyan-400/60 scale-[1.02] shadow-[0_0_25px_rgba(0,242,254,0.35)]'
                        : isDisabled || !canAfford
                          ? 'bg-slate-950/50 border-slate-800 opacity-40 cursor-not-allowed'
                          : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-white active:scale-95 cursor-pointer'
                    }`}
                    style={{
                      boxShadow: isCurrentLeading
                        ? `0 0 25px ${t.color || '#00f2fe'}40, 0 4px 15px ${t.color || '#00f2fe'}25`
                        : !isDisabled && canAfford
                          ? `0 6px 20px -4px ${t.color || '#00f2fe'}20`
                          : undefined
                    }}
                  >
                    {/* Vertical Team Color Ribbon Accent */}
                    <div 
                      className="absolute top-0 bottom-0 left-0 w-1.5 transition-all duration-300" 
                      style={{ 
                        backgroundColor: t.color || '#00f2fe',
                        boxShadow: `0 0 12px ${t.color || '#00f2fe'}` 
                      }} 
                    />
                    
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-white text-xs block truncate font-sans">{t.shortName || t.name}</span>
                      <span className={`text-[10px] font-mono font-bold ${isCurrentLeading ? 'text-cyan-300 font-black' : 'text-emerald-400'}`}>
                        {isSoldOut 
                          ? 'SOLD' 
                          : isCurrentLeading 
                            ? '👑 HIGH BID' 
                            : hasBids
                              ? `+₹${currentInc.toLocaleString()}`
                              : 'Base Price'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                      <span className={isCurrentLeading ? 'text-cyan-300 font-extrabold' : 'text-amber-300 font-bold'}>
                        {isCurrentLeading ? `₹${currentBid.toLocaleString()} PTS` : hasBids ? `Bid ₹${nextBidAmount.toLocaleString()}` : `Opening ₹${nextBidAmount.toLocaleString()}`}
                      </span>
                      <span className="text-slate-400 truncate">
                        Purse: ₹{remainingPurse.toLocaleString()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Hammer Auction Management Bar */}
            {isSoldOut ? (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 shadow-lg">
                <div className="flex items-center space-x-2 text-rose-300 font-bold text-sm sm:text-base">
                  <CheckCircle2 className="w-6 h-6 text-rose-400 shrink-0" />
                  <span>Sold Out to {buyerTeamObj?.name || 'Team'} (₹{activePlayer.soldPrice || currentBid} PTS)</span>
                </div>
                {canSell && (
                  <button
                    onClick={() => {
                      if (!window.confirm(`Reopen auction for "${activePlayer.name}" and return to available pool?`)) return;
                      const updated = { ...activePlayer, status: 'available', soldPrice: null, soldTo: null, leadingTeam: null, currentBid: getPlayerStartingBid(activePlayer, tournamentSettings?.defaultBasePrice) };
                      setPlayers(prev => prev.map(p => p.id === activePlayer.id ? updated : p));
                      apiUpdatePlayer(activePlayer.id, updated).catch(console.warn);
                      if (buyerTeamObj) {
                        const newSquad = (buyerTeamObj.squad || []).filter(p => p.id !== activePlayer.id);
                        const newTeam = { ...buyerTeamObj, spentPurse: Math.max(0, buyerTeamObj.spentPurse - (activePlayer.soldPrice || currentBid)), squad: newSquad, playersCount: newSquad.length };
                        setTeams(prev => prev.map(t => t.id === buyerTeamObj.id ? newTeam : t));
                        apiUpdateTeam(buyerTeamObj.id, newTeam).catch(console.warn);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono font-bold border border-slate-700 transition cursor-pointer"
                  >
                    ↺ Reopen Auction
                  </button>
                )}
              </div>
            ) : canSell ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleMarkUnsold}
                  disabled={isProcessing}
                  className={`flex items-center justify-center space-x-2 px-5 py-4 rounded-2xl font-bold text-sm border transition cursor-pointer shrink-0 shadow-md ${
                    isUnsold 
                      ? 'bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]' 
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title={isUnsold ? 'Player is already unsold — Advance to next player (→)' : 'Pass player / Mark as Unsold'}
                >
                  <XCircle className={`w-5 h-5 ${isUnsold ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">{isUnsold ? 'Marked Unsold (Next →)' : 'Pass / Unsold'}</span>
                </button>

                {leadingTeamObj && (
                  <button
                    onClick={handleRevokeBid}
                    disabled={isProcessing}
                    className="flex items-center justify-center space-x-1.5 px-4 py-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/40 transition cursor-pointer shrink-0 shadow-md"
                    title="Revoke current high bid and reset to base price"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-400" />
                    <span className="hidden sm:inline">Revoke Bid</span>
                  </button>
                )}

                <button
                  onClick={handleSold}
                  disabled={isProcessing || !leadingTeamObj}
                  className={`flex-1 py-4 sm:py-5 px-6 rounded-2xl font-black text-lg sm:text-xl uppercase tracking-wider transition flex items-center justify-center space-x-3 shadow-2xl cursor-pointer ${
                    leadingTeamObj
                      ? 'bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-slate-950 hover:scale-[1.02] shadow-[0_0_30px_rgba(0,242,254,0.45)] active:scale-95'
                      : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
                  }`}
                  title={leadingTeamObj ? `Hammer Sold to ${leadingTeamObj.name} for ₹${currentBid} PTS` : 'Place a bid with any team first'}
                >
                  <Gavel className="w-6 h-6 sm:w-7 sm:h-7 transform -rotate-45 text-slate-950" />
                  <span>Hammer Sold (₹{currentBid} PTS)</span>
                </button>
              </div>
            ) : (
              <div className="w-full py-4 rounded-2xl font-bold text-sm bg-slate-900/90 text-slate-400 border border-slate-800 flex items-center justify-center space-x-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <span>Super Admin / Auctioneer Only (Hammer Sold)</span>
              </div>
            )}

          </div>

        </div>
      ) : (
        <div className="text-center space-y-4 my-auto z-10">
          <h2 className="text-4xl font-black text-white font-display">NO PLAYERS REGISTERED YET!</h2>
          <p className="text-slate-400 text-sm">Add players in Player Pool tab or MongoDB Atlas.</p>
        </div>
      )}

      {/* ── Franchise Captains Showcase Footer Bar ── */}
      <div className="z-10 border-t border-slate-800/80 pt-3 max-w-[1800px] 3xl:max-w-[2100px] w-full mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-400" /> TEAM CAPTAINS:
            </span>
            {teams.map((t) => {
              const cap = getCaptainInfo(t);
              if (!cap) return null;
              return (
                <div 
                  key={t.id}
                  className="flex items-center space-x-1.5 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-800 text-[11px]"
                >
                  <span>{t.logo}</span>
                  <img
                    src={cap.avatarUrl}
                    alt={cap.name}
                    className="w-4 h-4 rounded-full object-cover border border-amber-400/80"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(cap.name)}&background=0f172a&color=f59e0b&bold=true`;
                    }}
                  />
                  <span className="bg-amber-500/20 text-amber-300 font-black text-[9px] px-1 rounded">
                    {cap.initials}
                  </span>
                  <span className="font-bold text-slate-200 truncate max-w-[90px]">{cap.name}</span>
                </div>
              );
            })}
          </div>

          <div className="text-slate-500 text-[11px] hidden md:block">
            {tournamentSettings?.tournamentName || 'Nyati Era'} {tournamentSettings?.subtitle || 'Box Cricket League'} {tournamentSettings?.edition || new Date().getFullYear()}
          </div>
        </div>
      </div>

    </div>
  );
}
