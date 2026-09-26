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
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { updatePlayer as apiUpdatePlayer, updateTeam as apiUpdateTeam } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { getBidIncrement, getBidSlabInfo } from '../utils/bidding';
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
  onClose,
  viewerCount = 1,
  liveSocketConnected = false,
}) {
  const { user, can } = useAuth();
  const isSuperAdmin = user?.role === 'superuser';
  const canBid = can('canBid');
  const canSell = can('canSellPlayer');
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
        setLiveCurrentBid(data.currentBid || 500);
        setLiveHighBidder(null);
      }
    };

    const handleBidPlaced = (data) => {
      if (data) {
        if (data.playerId) setSelectedId(data.playerId);
        setLiveCurrentBid(data.currentBid);
        setLiveHighBidder(data.highBidder);
        soundFx.playBid();
      }
    };

    const handlePlayerSold = () => {
      soundFx.playSold();
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 }
      });
    };

    const handlePlayerUnsold = () => {
      soundFx.playUnsold();
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

  const currentBid = activePlayer ? (
    isSoldOut ? (activePlayer.soldPrice || activePlayer.basePrice) : (liveCurrentBid || activePlayer.currentBid || activePlayer.basePrice)
  ) : 0;

  // ── Navigation Handlers ───────────────────────────────────────────────────
  const currentIndex = players.findIndex(p => p.id === activePlayer?.id);

  // Available player pool for seamless profile switching
  const availablePool = availablePlayers.length > 0 ? availablePlayers : players;
  const currentAvailableIdx = availablePool.findIndex(p => p.id === activePlayer?.id);

  const handlePrevPlayer = () => {
    if (players.length === 0) return;
    const newIdx = currentIndex > 0 ? currentIndex - 1 : players.length - 1;
    const target = players[newIdx];
    setSelectedId(target.id);
    liveSelectPlayer(target.id, target.basePrice);
  };

  const handleNextPlayer = () => {
    if (players.length === 0) return;
    const newIdx = currentIndex < players.length - 1 ? currentIndex + 1 : 0;
    const target = players[newIdx];
    setSelectedId(target.id);
    liveSelectPlayer(target.id, target.basePrice);
  };

  const handlePrevAvailablePlayer = (e) => {
    if (e) e.stopPropagation();
    if (availablePool.length === 0) return;
    const newIdx = currentAvailableIdx > 0 ? currentAvailableIdx - 1 : availablePool.length - 1;
    const target = availablePool[newIdx];
    setSelectedId(target.id);
    liveSelectPlayer(target.id, target.basePrice);
  };

  const handleNextAvailablePlayer = (e) => {
    if (e) e.stopPropagation();
    if (availablePool.length === 0) return;
    const newIdx = currentAvailableIdx < availablePool.length - 1 ? currentAvailableIdx + 1 : 0;
    const target = availablePool[newIdx];
    setSelectedId(target.id);
    liveSelectPlayer(target.id, target.basePrice);
  };

  // ── Quick Bid Handler ─────────────────────────────────────────────────────
  const handleQuickBid = (team, customIncrement) => {
    if (!activePlayer || isSoldOut) return;

    // 🛑 Round-Robin Rule: No team can successively bid on the player against themselves!
    if (activePlayer.leadingTeam === team.id) {
      alert(`⚠️ Alternating Bid Rule: ${team.name} is ALREADY the leading bidder! Another team must place a counter-bid before ${team.name} can bid again.`);
      return;
    }

    const curBid = activePlayer.currentBid || activePlayer.basePrice || 0;
    const increment = customIncrement || getBidIncrement(curBid);
    if (!increment || isNaN(increment) || increment <= 0) return;

    const nextBid = curBid + increment;

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

    livePlaceBid(activePlayer.id, team, nextBid, {
      id: Date.now().toString(),
      playerId: activePlayer.id,
      playerName: activePlayer.name,
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      amount: nextBid,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
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

    const finalPrice = activePlayer.currentBid || activePlayer.basePrice;

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
      setIsProcessing(false);
    }, 1200);
  };

  // ── Mark Unsold Handler ───────────────────────────────────────────────────
  const handleMarkUnsold = () => {
    if (!activePlayer || isSoldOut) return;
    if (!window.confirm(`Mark "${activePlayer.name}" as Unsold in NEPL Auction Pool?`)) return;
    
    soundFx.playPass();
    const updated = {
      ...activePlayer,
      status: 'unsold',
      currentBid: activePlayer.basePrice,
      leadingTeam: null
    };
    setPlayers(prev => prev.map(p => p.id === activePlayer.id ? updated : p));
    apiUpdatePlayer(activePlayer.id, updated).catch(err => console.warn('MongoDB unsold update error:', err));
    
    const unsoldLogItem = {
      id: Date.now().toString(),
      type: 'UNSOLD',
      playerName: activePlayer.name,
      timestamp: new Date().toLocaleTimeString()
    };
    liveMarkUnsold(activePlayer.id, updated, unsoldLogItem);
  };

  // ── Revoke Bid Handler ───────────────────────────────────────────────────
  const handleRevokeBid = () => {
    if (!activePlayer || isSoldOut || !activePlayer.leadingTeam) return;
    if (!window.confirm(`Revoke current high bid on "${activePlayer.name}" and reset to Base Price ₹${activePlayer.basePrice} PTS?`)) return;
    
    const updated = {
      ...activePlayer,
      currentBid: activePlayer.basePrice,
      leadingTeam: null
    };
    setPlayers(prev => prev.map(p => p.id === activePlayer.id ? updated : p));
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070b14] text-white flex flex-col justify-between p-4 sm:p-8 select-none overflow-hidden font-sans">
      
      {/* Background Neon Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-tr from-cyan-500/10 via-purple-600/10 to-rose-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* ── Top TV Header Controls ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 z-10 border-b border-cyan-500/20 pb-4 max-w-[1800px] 3xl:max-w-[2100px] w-full mx-auto">
        
        {/* Branding */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white p-1 border border-cyan-500/40 shadow-[0_0_20px_rgba(0,242,254,0.4)] shrink-0 flex items-center justify-center">
            <img
              src="/nyati_era_logo.png"
              alt="Nyati Era"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight gradient-text-brand font-sans">
                Nyati Era Premier League {new Date().getFullYear()}
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

      {/* ── Main Theater Bidding Display ── */}
      {activePlayer ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-center z-10 max-w-[1800px] 3xl:max-w-[2100px] mx-auto w-full my-auto py-2">
          
          {/* Left Column: Unified Enlarged Player Photo with Side Navigation Arrows */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            
            {/* Unified Showcase Card with Side Floating Navigation Arrows */}
            <div className="relative w-full max-w-[340px] sm:max-w-[400px] xl:max-w-[460px] 2xl:max-w-[500px] 3xl:max-w-[540px] flex items-center justify-center">
              
              {/* ⬅️ Previous Player Arrow (Around Picture Left) */}
              {availablePool.length > 1 && (
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
                  : 'border-cyan-500/50 shadow-[0_0_50px_rgba(0,242,254,0.35)]'
              }`}>
                
                {/* Photo Area */}
                <div className="h-72 sm:h-80 xl:h-[380px] 2xl:h-[420px] 3xl:h-[460px] w-full relative overflow-hidden bg-slate-950">
                  <img
                    key={activePlayer.id}
                    src={activePlayer.avatarUrl}
                    alt={activePlayer.name}
                    className={`w-full h-full object-cover object-[center_15%] scale-105 transition-all duration-500 animate-fade-in ${isSoldOut ? 'grayscale-[30%] brightness-75' : ''}`}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                    }}
                  />

                  {/* 🔴 PROMINENT SOLD OUT STAMP OVERLAY */}
                  {isSoldOut && (
                    <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-3">
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

                  {/* Category Pill Badge */}
                  <div className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-cyan-500/50 text-cyan-300 font-black text-xs uppercase tracking-wider shadow-lg">
                    {activePlayer.category}
                  </div>
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
              {availablePool.length > 1 && (
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
                : 'bg-slate-900/90 border-cyan-500/30 shadow-cyan-950/50'
            }`}>
              <div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Base Price</span>
                <span className="text-xl sm:text-2xl font-bold text-slate-200 font-mono">₹{activePlayer.basePrice} PTS</span>
              </div>

              <div className="text-right">
                <span className={`text-[11px] font-extrabold uppercase tracking-widest block ${isSoldOut ? 'text-rose-400' : 'text-cyan-400'}`}>
                  {isSoldOut ? 'FINAL SOLD PRICE' : 'CURRENT HIGH BID'}
                </span>
                <span className={`text-3xl sm:text-5xl font-black font-mono drop-shadow-md ${
                  isSoldOut ? 'text-emerald-400' : 'text-cyan-300 drop-shadow-[0_0_20px_rgba(0,242,254,0.4)]'
                }`}>
                  ₹{currentBid} PTS
                </span>
              </div>
            </div>

            {/* Leading Team Display */}
            {leadingTeamObj ? (
              <div 
                className="p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between"
                style={{
                  backgroundColor: `${leadingTeamObj.color || '#00f2fe'}15`,
                  borderColor: `${leadingTeamObj.color || '#00f2fe'}50`,
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

                {isSoldOut && (
                  <span className="px-3 py-1 rounded-xl bg-rose-500/30 text-rose-200 font-bold text-xs uppercase tracking-wider border border-rose-400/40 shrink-0">
                    SQUAD CONFIRMED
                  </span>
                )}
              </div>
            ) : (
              <div className="p-3 text-center rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-slate-500 text-xs font-mono">
                Waiting for opening bid from teams below…
              </div>
            )}

            {/* Dynamic Bidding Tier Indicator */}
            {!isSoldOut && (
              <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex items-center justify-between text-xs font-mono shadow-sm">
                <div className="flex items-center space-x-2 text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f2fe]" />
                  <span className="font-bold uppercase tracking-wider text-[10px]">
                    {getBidSlabInfo(currentBid).label} ({getBidSlabInfo(currentBid).rangeText})
                  </span>
                </div>
                <span className="text-emerald-400 font-extrabold text-xs">
                  Min Step: +₹{getBidIncrement(currentBid)} PTS
                </span>
              </div>
            )}

            {/* Team Bidding Control Suite */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
              {teams.map((t) => {
                const isCurrentLeading = activePlayer?.leadingTeam === t.id;
                const isDisabled = isSoldOut || !canBid || isCurrentLeading;
                const currentInc = getBidIncrement(currentBid);

                return (
                  <button
                    key={t.id}
                    disabled={isDisabled}
                    onClick={() => handleQuickBid(t, currentInc)}
                    className={`p-2.5 pl-3 rounded-xl text-left transition border relative overflow-hidden ${
                      isDisabled
                        ? 'bg-slate-950/50 border-slate-800 opacity-40 cursor-not-allowed'
                        : isCurrentLeading
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/50 scale-[1.01]'
                          : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-white active:scale-95 cursor-pointer'
                    }`}
                    style={{
                      boxShadow: isCurrentLeading
                        ? `0 0 25px ${t.color || '#00f2fe'}40, 0 4px 15px ${t.color || '#00f2fe'}25`
                        : !isDisabled
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
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">
                        {isSoldOut ? 'SOLD' : `+${currentInc}`}
                      </span>
                    </div>
                    
                    <span className="text-[10px] text-slate-400 block truncate font-mono mt-0.5">
                      Purse: ₹{t.totalPurse - t.spentPurse}
                    </span>
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
                      const updated = { ...activePlayer, status: 'available', soldPrice: null, soldTo: null, leadingTeam: null, currentBid: activePlayer.basePrice };
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
                  className="flex items-center justify-center space-x-2 px-5 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-bold text-sm border border-slate-700 transition cursor-pointer shrink-0 shadow-md"
                  title="Pass player / Mark as Unsold"
                >
                  <XCircle className="w-5 h-5 text-slate-400" />
                  <span className="hidden sm:inline">Pass / Unsold</span>
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
            Nyati Era Box Cricket League {new Date().getFullYear()}
          </div>
        </div>
      </div>

    </div>
  );
}
