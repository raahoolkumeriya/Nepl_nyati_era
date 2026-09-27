import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import {
  Gavel,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Shuffle,
  ExternalLink,
  Shield,
  Activity,
  Award,
  Lock,
  TrendingUp,
  X,
  Crown,
  Zap,
  Edit3,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { useAuth } from '../auth/AuthContext';
import { useTournament } from '../context/TournamentContext';
import { updatePlayer as apiUpdatePlayer, updateTeam as apiUpdateTeam, isMongoDB } from '../services/api';
import { getBidIncrement, getBidSlabInfo, getPlayerStartingBid } from '../utils/bidding';
import { 
  getSocket, 
  liveSelectPlayer, 
  livePlaceBid, 
  liveMarkSold, 
  liveMarkUnsold, 
  liveRevokeBid, 
  liveReduceBid 
} from '../services/socket';

export default function AuctionRoom({
  players,
  setPlayers,
  teams,
  setTeams,
  history,
  setHistory,
  viewerCount = 1,
  liveSocketConnected = false,
}) {
  const { user, can } = useAuth();
  const { tournamentSettings } = useTournament();
  const isSuperAdmin = user?.role === 'superuser';
  const canBid = can('canBid');
  const canSell = can('canSellPlayer') || can('canUnsellPlayer');

  const handleEditActivePlayerBasePrice = async () => {
    if (!activePlayer || activePlayer.status === 'sold' || highBidder) return;
    const input = prompt(`Enter new Base Price (PTS) for "${activePlayer.name}":`, String(activePlayer.basePrice || 100));
    if (input === null) return;
    const newPrice = Math.max(1, Number(input) || 0);
    if (!newPrice) {
      alert('Invalid price entered.');
      return;
    }

    const updated = { ...activePlayer, basePrice: newPrice };
    setPlayers(prev => prev.map(p => p.id === activePlayer.id ? updated : p));
    setCurrentBid(newPrice);
    liveSelectPlayer(activePlayer.id, newPrice);
    try {
      await apiUpdatePlayer(activePlayer.id, { basePrice: newPrice });
    } catch (err) {
      console.warn('Failed to persist base price:', err);
    }
  };

  const availablePlayers = players.filter(p => (p.status === 'available' || p.status === 'unsold') && (p.isPlayingNEPL !== false));

  const [activePlayerId, setActivePlayerId] = useState(() => {
    const firstAvail = players.find(p => p.status === 'available' && p.isPlayingNEPL !== false);
    return firstAvail ? firstAvail.id : (players.find(p => p.isPlayingNEPL !== false)?.id || players[0]?.id || null);
  });

  const lastActivePlayerIdRef = useRef(activePlayerId);

  useEffect(() => {
    if ((!activePlayerId || !players.some(p => p.id === activePlayerId)) && players.length > 0) {
      const firstAvail = players.find(p => p.status === 'available' && p.isPlayingNEPL !== false);
      const nextId = firstAvail ? firstAvail.id : (players.find(p => p.isPlayingNEPL !== false)?.id || players[0]?.id);
      setActivePlayerId(nextId);
      lastActivePlayerIdRef.current = nextId;
    }
  }, [players, activePlayerId]);

  const activePlayer = players.find(p => p.id === activePlayerId);
  const effectiveBasePrice = getPlayerStartingBid(activePlayer, tournamentSettings?.defaultBasePrice);
  const [currentBid, setCurrentBid] = useState(effectiveBasePrice);
  const [highBidder, setHighBidder] = useState(null);
  const [selectedBiddingTeamId, setSelectedBiddingTeamId] = useState(teams[0]?.id || null);

  // Sync when active player changes locally
  useEffect(() => {
    if (activePlayer && lastActivePlayerIdRef.current !== activePlayerId) {
      lastActivePlayerIdRef.current = activePlayerId;
      if (activePlayer.status === 'sold') {
        setCurrentBid(activePlayer.soldPrice);
        const buyer = teams.find(t => t.id === activePlayer.soldTo);
        setHighBidder(buyer || null);
      } else {
        const eff = getPlayerStartingBid(activePlayer, tournamentSettings?.defaultBasePrice);
        setCurrentBid(eff);
        setHighBidder(null);
      }
    }
  }, [activePlayerId, activePlayer, teams, tournamentSettings?.defaultBasePrice]);

  // Sync when supreme user changes defaultBasePrice and no high bidder exists
  useEffect(() => {
    if (activePlayer && activePlayer.status !== 'sold' && !highBidder) {
      const eff = getPlayerStartingBid(activePlayer, tournamentSettings?.defaultBasePrice);
      setCurrentBid(eff);
    }
  }, [tournamentSettings?.defaultBasePrice, activePlayer, highBidder]);

  // ── Multi-Device Real-Time Live Streaming Socket Listeners ────────────────
  useEffect(() => {
    const socket = getSocket();

    // Request latest active live state when entering the room
    socket.emit('auction:getState');

    const handleStateSync = (state) => {
      if (state && state.activePlayerId) {
        setActivePlayerId(state.activePlayerId);
        lastActivePlayerIdRef.current = state.activePlayerId;
        if (typeof state.currentBid === 'number' && state.currentBid > 0) {
          setCurrentBid(state.currentBid);
        }
        if (state.highBidder) {
          setHighBidder(state.highBidder);
        }
      }
    };

    const handlePlayerSelected = (data) => {
      if (data && data.activePlayerId) {
        setActivePlayerId(data.activePlayerId);
        lastActivePlayerIdRef.current = data.activePlayerId;
        const eff = data.currentBid || tournamentSettings?.defaultBasePrice || 100;
        setCurrentBid(eff);
        setHighBidder(null);
      }
    };

    const handleBidPlaced = (data) => {
      if (data) {
        if (data.playerId) {
          setActivePlayerId(data.playerId);
          lastActivePlayerIdRef.current = data.playerId;
        }
        setCurrentBid(data.currentBid);
        setHighBidder(data.highBidder);
        soundFx.playBid();
      }
    };

    const handlePlayerSold = () => {
      soundFx.playSold();
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setHighBidder(null);
      setIsTimerRunning(false);
      setTimeLeft(30);
    };

    const handlePlayerUnsold = () => {
      soundFx.playUnsold();
      setHighBidder(null);
      setIsTimerRunning(false);
      setTimeLeft(30);
    };

    const handleBidRevoked = (data) => {
      if (data) {
        setCurrentBid(data.currentBid);
        setHighBidder(null);
      }
    };

    const handleBidReduced = (data) => {
      if (data) {
        setCurrentBid(data.currentBid);
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



  const handlePlaceBid = (team, newBidAmount) => {
    if (!activePlayer || activePlayer.status === 'sold') return;

    // 🛑 Round-Robin Rule: No team can successively bid on the player against themselves!
    if (highBidder && highBidder.id === team.id) {
      alert(`⚠️ Alternating Bid Rule: ${team.name} is ALREADY the leading bidder! Another team must place a counter-bid before ${team.name} can bid again.`);
      return;
    }

    if (!newBidAmount || isNaN(newBidAmount) || newBidAmount <= 0) {
      alert("⚠️ Invalid Bid: Bid amount must be a positive number greater than 0!");
      return;
    }

    const remainingPurse = team.totalPurse - team.spentPurse;
    if (newBidAmount > remainingPurse) {
      alert(`⚠️ Insufficient Purse: ${team.name} only has ₹${remainingPurse} PTS remaining budget. Cannot place bid of ₹${newBidAmount} PTS!`);
      return;
    }

    if (newBidAmount <= currentBid && highBidder) {
      alert(`⚠️ Bid Must Be Higher: New bid (₹${newBidAmount} PTS) must be higher than current bid (₹${currentBid} PTS)!`);
      return;
    }

    const maxSquad = team.maxSquadSize || 10;
    if ((team.squad?.length || 0) >= maxSquad) {
      alert(`⚠️ Squad Limit Reached: ${team.name} has reached its ${maxSquad}-player squad capacity (configured by Super Admin)!`);
      return;
    }

    soundFx.playBid();
    setCurrentBid(newBidAmount);
    setHighBidder(team);
    const logItem = {
      id: Date.now().toString(),
      playerId: activePlayer.id,
      playerName: activePlayer.name,
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      amount: newBidAmount,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setHistory(prev => [logItem, ...prev]);

    // 📡 Broadcast live bid across all connected devices in real time!
    livePlaceBid(activePlayer.id, team, newBidAmount, logItem);
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [showReduceModal, setShowReduceModal] = useState(false);
  const [reducedBidInput, setReducedBidInput] = useState('');

  useEffect(() => {
    setIsProcessing(false);
  }, [activePlayerId]);

  const handleAdminRevokeBid = () => {
    if (!isSuperAdmin || !highBidder || !activePlayer) return;
    if (window.confirm(`⚡ SUPER ADMIN: Revoke high bid of ₹${currentBid} PTS by ${highBidder.name}?`)) {
      const baseVal = getPlayerStartingBid(activePlayer, tournamentSettings?.defaultBasePrice);
      setCurrentBid(baseVal);
      setHighBidder(null);
      const revokeLog = {
        id: Date.now().toString(),
        type: 'ADMIN_REVOKE',
        playerName: activePlayer.name,
        teamName: highBidder.name,
        amount: baseVal,
        timestamp: new Date().toLocaleTimeString()
      };
      setHistory(prev => [revokeLog, ...prev]);
      liveRevokeBid(activePlayer.id, baseVal, revokeLog);
    }
  };

  const handleAdminReduceBidSubmit = (e) => {
    e.preventDefault();
    if (!isSuperAdmin || !highBidder || !activePlayer) return;
    const newPrice = Number(reducedBidInput);
    if (!newPrice || isNaN(newPrice) || newPrice <= 0) {
      alert("⚠️ Invalid Amount: Reduced bid must be a positive number greater than 0!");
      return;
    }
    if (newPrice >= currentBid) {
      alert(`⚠️ Must Be Lower: Reduced bid (₹${newPrice} PTS) must be lower than current bid (₹${currentBid} PTS)!`);
      return;
    }

    setCurrentBid(newPrice);
    setShowReduceModal(false);
    setReducedBidInput('');

    const reduceLog = {
      id: Date.now().toString(),
      type: 'ADMIN_REDUCE',
      playerName: activePlayer.name,
      teamName: highBidder.name,
      amount: newPrice,
      timestamp: new Date().toLocaleTimeString()
    };
    setHistory(prev => [reduceLog, ...prev]);
    liveReduceBid(activePlayer.id, newPrice, reduceLog);
  };

  const handleMarkSold = () => {
    if (isProcessing) return;
    if (!activePlayer || activePlayer.status === 'sold' || !highBidder) {
      alert("Place at least one bid before marking Sold!");
      return;
    }

    const buyerTeam = teams.find(t => t.id === highBidder.id);
    if (!buyerTeam) return;

    if (buyerTeam.squad?.some(p => p.id === activePlayer.id)) {
      alert(`⚠️ ${activePlayer.name} has already been sold to ${buyerTeam.name}!`);
      return;
    }

    setIsProcessing(true);
    soundFx.playSold();
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    const soldPrice = currentBid;
    const buyerTeamId = highBidder.id;

    const updatedPlayer = { ...activePlayer, status: 'sold', soldPrice, soldTo: buyerTeamId };
    const alreadyInSquad = (buyerTeam.squad || []).some(p => p.id === activePlayer.id);
    const updatedSquad = alreadyInSquad ? buyerTeam.squad : [...(buyerTeam.squad || []), { ...activePlayer, soldPrice }];
    const updatedTeam = {
      ...buyerTeam,
      spentPurse: buyerTeam.spentPurse + (alreadyInSquad ? 0 : soldPrice),
      playersCount: updatedSquad.length,
      squad: updatedSquad
    };

    setPlayers(prev => prev.map(p =>
      p.id === activePlayer.id ? updatedPlayer : p
    ));
    setTeams(prev => prev.map(t =>
      t.id === buyerTeamId ? updatedTeam : t
    ));

    apiUpdatePlayer(activePlayer.id, updatedPlayer).catch(err => console.warn('MongoDB player sold update err:', err));
    apiUpdateTeam(buyerTeamId, updatedTeam).catch(err => console.warn('MongoDB team sold update err:', err));

    const soldLogItem = {
      id: Date.now().toString(),
      type: 'SOLD',
      playerName: activePlayer.name,
      teamName: highBidder.name,
      amount: soldPrice,
      timestamp: new Date().toLocaleTimeString()
    };
    setHistory(prev => [soldLogItem, ...prev]);

    // 📡 Broadcast player sold across all connected devices in real time!
    liveMarkSold(activePlayer.id, buyerTeamId, soldPrice, updatedPlayer, updatedTeam, soldLogItem);

    setTimeout(() => {
      const nextAvailable = players.find(p => p.id !== activePlayer.id && p.status === 'available' && p.isPlayingNEPL !== false);
      const nextUnsold = players.find(p => p.id !== activePlayer.id && p.status === 'unsold' && p.isPlayingNEPL !== false);
      const nextP = nextAvailable || nextUnsold;

      setHighBidder(null);
      setTimeLeft(30);
      setIsTimerRunning(false);

      if (nextP) {
        const nextPrice = getPlayerStartingBid(nextP, tournamentSettings?.defaultBasePrice);
        setActivePlayerId(nextP.id);
        setCurrentBid(nextPrice);
        lastActivePlayerIdRef.current = nextP.id;
        liveSelectPlayer(nextP.id, nextPrice);
      }
      setIsProcessing(false);
    }, 1200);
  };

  const handleMarkUnsold = () => {
    if (!activePlayer) return;
    soundFx.playUnsold();
    const updatedPlayer = { 
      ...activePlayer, 
      status: 'unsold',
      soldPrice: 0,
      soldTo: null
    };

    setPlayers(prev => prev.map(p => p.id === activePlayer.id ? updatedPlayer : p));
    apiUpdatePlayer(activePlayer.id, updatedPlayer).catch(err => console.warn('MongoDB player unsold update err:', err));

    const unsoldLogItem = {
      id: Date.now().toString(),
      type: 'UNSOLD',
      playerName: activePlayer.name,
      timestamp: new Date().toLocaleTimeString()
    };
    setHistory(prev => [unsoldLogItem, ...prev]);

    // 📡 Broadcast player unsold across all connected devices in real time!
    liveMarkUnsold(activePlayer.id, updatedPlayer, unsoldLogItem);

    // Reset bidding state
    setHighBidder(null);
    setIsTimerRunning(false);
    setTimeLeft(30);

    // Find next available player, or if none, next unsold player
    const nextAvailable = players.find(p => p.id !== activePlayer.id && p.status === 'available' && p.isPlayingNEPL !== false);
    const nextUnsold = players.find(p => p.id !== activePlayer.id && p.status === 'unsold' && p.isPlayingNEPL !== false);
    const nextP = nextAvailable || nextUnsold;

    if (nextP) {
      const nextPrice = getPlayerStartingBid(nextP, tournamentSettings?.defaultBasePrice);
      setActivePlayerId(nextP.id);
      setCurrentBid(nextPrice);
      lastActivePlayerIdRef.current = nextP.id;
      liveSelectPlayer(nextP.id, nextPrice);
    } else {
      setCurrentBid(getPlayerStartingBid(activePlayer, tournamentSettings?.defaultBasePrice));
    }
  };

  const handleNextPlayer = () => {
    const i = players.findIndex(p => p.id === activePlayerId);
    if (i < players.length - 1) {
      const nextP = players[i + 1];
      setActivePlayerId(nextP.id);
      lastActivePlayerIdRef.current = nextP.id;
      const nextPrice = getPlayerStartingBid(nextP, tournamentSettings?.defaultBasePrice);
      setCurrentBid(nextPrice);
      setHighBidder(null);
      liveSelectPlayer(nextP.id, nextPrice);
    }
  };

  const handlePrevPlayer = () => {
    const i = players.findIndex(p => p.id === activePlayerId);
    if (i > 0) {
      const prevP = players[i - 1];
      setActivePlayerId(prevP.id);
      lastActivePlayerIdRef.current = prevP.id;
      const prevPrice = getPlayerStartingBid(prevP, tournamentSettings?.defaultBasePrice);
      setCurrentBid(prevPrice);
      setHighBidder(null);
      liveSelectPlayer(prevP.id, prevPrice);
    }
  };

  const handleRandomPlayer = () => {
    const unsold = players.filter(p => p.status === 'available');
    if (unsold.length > 0) {
      const randP = unsold[Math.floor(Math.random() * unsold.length)];
      setActivePlayerId(randP.id);
      lastActivePlayerIdRef.current = randP.id;
      const randPrice = getPlayerStartingBid(randP, tournamentSettings?.defaultBasePrice);
      setCurrentBid(randPrice);
      setHighBidder(null);
      liveSelectPlayer(randP.id, randPrice);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Top Control Bar ── */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-warm-700/50">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-400 font-bold text-xs border border-red-500/30 flex items-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.25)]">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
            <span>LIVE STREAM ROUND</span>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 font-mono text-xs border border-cyan-500/20 font-bold">
            📡 {viewerCount || 1} {viewerCount === 1 ? 'Device' : 'Devices'} Connected
          </span>
          <span className="text-sand-500 text-xs font-mono">
            {players.filter(p => p.status === 'sold').length} / {players.length} Players Sold
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button onClick={handlePrevPlayer} className="p-2 rounded-xl bg-warm-900 hover:bg-warm-800 text-sand-300 border border-warm-700 transition">
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleRandomPlayer}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-warm-900 hover:bg-warm-800 text-[#c9a227] font-semibold text-xs border border-[#c9a227]/30 transition"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Random Pick</span>
          </button>

          <button onClick={handleNextPlayer} className="p-2 rounded-xl bg-warm-900 hover:bg-warm-800 text-sand-300 border border-warm-700 transition">
            <ChevronRight className="w-4 h-4" />
          </button>


        </div>
      </div>

      {activePlayer ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 2xl:gap-8">

          {/* ── LEFT: Player Card + Bid Controls ── */}
          <div className="lg:col-span-8 space-y-5">

            {/* Player Hero Card */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden border border-warm-700/50 shadow-2xl">
              {/* Ambient glow */}
              <div className="absolute -right-20 -top-20 w-72 h-72 bg-terracotta-600/8 rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">

                {/* Avatar */}
                <div className="md:col-span-5 flex flex-col items-center">
                  <div className="relative group">
                    <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-3xl overflow-hidden border-2 border-cyan-500/40 shadow-2xl bg-warm-900 shadow-cyan-500/10">
                      <img
                        src={activePlayer.avatarUrl}
                        alt={activePlayer.name}
                        className="w-full h-full object-cover object-[center_15%] scale-110 group-hover:scale-115 transition duration-500"
                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'; }}
                      />
                    </div>
                    {/* Category tag */}
                    <div className="absolute top-3 left-3 bg-warm-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-[#c9a227]/40 text-[#c9a227] font-bold text-xs flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {activePlayer.category}
                    </div>
                    {/* Status overlay */}
                    <div className="absolute bottom-3 right-3">
                      {activePlayer.status === 'sold' && (
                        <span className="bg-terracotta-600 text-white font-extrabold text-[10px] px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg">
                          SOLD ✓
                        </span>
                      )}
                      {activePlayer.status === 'unsold' && (
                        <span className="bg-warm-700 text-sand-400 font-bold text-[10px] px-3 py-1 rounded-lg uppercase tracking-widest">
                          UNSOLD
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={activePlayer.cricHeroesUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-xl bg-warm-900 hover:bg-warm-800 text-[#c9a227] border border-[#c9a227]/30 transition"
                  >
                    <span>CricHeroes Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Player Info */}
                <div className="md:col-span-7 space-y-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-terracotta-600/20 text-terracotta-300 text-xs font-bold border border-terracotta-500/30">
                        {activePlayer.role}
                      </span>
                      <span className="text-sand-600 text-xs font-mono">#{activePlayer.id}</span>
                      {Boolean(activePlayer.isCaptain || activePlayer.captainOfTeamId || teams.some(t => t.captainId === activePlayer.id || t.squad?.some(s => s.id === activePlayer.id && s.isCaptain))) && (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-400" />
                          Captain & Auctioneer
                        </span>
                      )}
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-sand-100 mt-1 tracking-tight font-sans flex items-center gap-2">
                      {activePlayer.name}
                    </h2>
                    <p className="text-sand-600 text-xs flex items-center gap-1.5 mt-0.5">
                      <Shield className="w-3.5 h-3.5 text-cricket-emerald" />
                      Nyati Era Dhanori Roster
                    </p>
                  </div>

                  {/* 👑 Captain Retained Notice */}
                  {Boolean(activePlayer.isCaptain || activePlayer.captainOfTeamId || teams.some(t => t.captainId === activePlayer.id || t.squad?.some(s => s.id === activePlayer.id && s.isCaptain))) && (
                    <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-300 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-amber-400" />
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider block">Team Captain & Auctioneer</span>
                          <span className="text-[10px] text-amber-300/80">
                            Retained by {teams.find(t => t.id === activePlayer.soldTo || t.id === activePlayer.captainOfTeamId)?.name || 'Assigned Team'} for 0 Credit (₹0 PTS)
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-xs font-mono">
                        0 PTS (Retained)
                      </span>
                    </div>
                  )}

                  {/* Price Banner */}
                  <div className="grid grid-cols-2 gap-3 bg-[#f4efe6] dark:bg-[#070b14]/90 p-4 rounded-2xl border border-[#e2dacc] dark:border-cyan-500/20 shadow-sm">
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-slate-600 dark:text-slate-400 text-xs font-extrabold uppercase tracking-wider block">Base Price</span>
                        {(isSuperAdmin || can('canResetData')) && !highBidder && activePlayer.status !== 'sold' && (
                          <button
                            type="button"
                            onClick={handleEditActivePlayerBasePrice}
                            className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-sans"
                            title="Edit active player base price"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-sand-200 font-mono">
                        ₹{(activePlayer.basePrice || tournamentSettings?.defaultBasePrice || 100).toLocaleString()} PTS
                      </span>
                    </div>
                    <div className="border-l border-[#d4ccbd] dark:border-slate-800 pl-3">
                      <span className="text-amber-700 dark:text-[#c9a227] text-xs font-extrabold uppercase tracking-wider block mb-0.5">
                        {highBidder ? 'Current High Bid' : 'Current Bid'}
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-[#c9a227] font-mono">
                        ₹{currentBid.toLocaleString()} PTS
                      </span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 text-center bg-[#f4efe6] dark:bg-[#070b14]/90 p-3 rounded-2xl border border-[#e2dacc] dark:border-cyan-500/20 shadow-sm">
                    {[
                      { label: 'Matches', value: activePlayer.matches ?? 0, color: 'text-slate-900 dark:text-sand-200' },
                      { label: 'Runs', value: activePlayer.runs ?? 0, color: 'text-emerald-700 dark:text-cricket-emerald' },
                      { label: 'SR', value: activePlayer.strikeRate ?? '-', color: 'text-amber-700 dark:text-[#c9a227]' },
                      { label: 'Wkts', value: activePlayer.wickets ?? 0, color: 'text-sky-700 dark:text-cyan-400' },
                    ].map((s, i) => (
                      <div key={i} className={`p-1 ${i > 0 ? 'border-l border-[#d4ccbd] dark:border-slate-800' : ''}`}>
                        <span className="text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs uppercase font-extrabold block tracking-wider">{s.label}</span>
                        <span className={`text-base sm:text-lg font-black ${s.color}`}>{s.value}</span>
                      </div>
                    ))}
                  </div>

                  {activePlayer.wickets > 0 && (
                    <div className="flex items-center justify-between text-xs sm:text-sm text-slate-700 dark:text-sand-300 px-3.5 py-2.5 bg-[#f4efe6] dark:bg-warm-900/40 rounded-xl border border-[#e2dacc] dark:border-warm-800/40 font-mono">
                      <span>Economy: <strong className="text-slate-900 dark:text-sand-100 font-extrabold">{activePlayer.economy} rpo</strong></span>
                      <span>Best: <strong className="text-emerald-700 dark:text-cricket-emerald font-extrabold">{activePlayer.bestBowling}</strong></span>
                    </div>
                  )}

                  {/* Leading Bidder */}
                  {highBidder ? (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#c9a227]/15 to-[#c9a227]/5 border border-[#c9a227]/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{highBidder.logo}</span>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#c9a227] block">Leading Bidder</span>
                            <span className="font-extrabold text-sand-100 text-base">{highBidder.name}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 block">Current High Bid</span>
                          <span className="text-xl font-black text-[#c9a227] font-mono">₹{currentBid.toLocaleString()} PTS</span>
                        </div>
                      </div>

                      {/* Super Admin Revoke & Reduce Controls */}
                      {isSuperAdmin && activePlayer?.status !== 'sold' && (
                        <div className="flex items-center space-x-2 pt-2 border-t border-[#c9a227]/20">
                          <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Super Admin:</span>
                          <button
                            onClick={handleAdminRevokeBid}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                            title="Revoke high bid and reset to base price"
                          >
                            ⚡ Revoke Bid
                          </button>
                          <button
                            onClick={() => {
                              const step = tournamentSettings?.bidIncrementStep || (activePlayer?.basePrice || 100);
                              setReducedBidInput(Math.max(activePlayer.basePrice, currentBid - step));
                              setShowReduceModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                            title="Reduce current bid amount"
                          >
                            ✏️ Reduce Bid
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 text-center rounded-xl bg-warm-900/40 border border-dashed border-warm-700 text-sand-600 text-xs font-mono">
                      No bids yet — teams below can open bidding!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Bidding Console ── */}
            <div className="glass-panel p-6 rounded-3xl border border-warm-700/50 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-extrabold text-sand-100 flex items-center gap-2 font-sans tracking-tight">
                  <Gavel className="w-5 h-5 text-terracotta-400" />
                  Team Bidding Console
                </h3>
                {!canBid && (
                  <span className="flex items-center gap-1.5 text-xs text-sand-600 bg-warm-900 px-3 py-1 rounded-lg border border-warm-700">
                    <Lock className="w-3 h-3" />
                    View Only
                  </span>
                )}
              </div>

              {/* Dynamic Bidding Tier Callout */}
              {activePlayer && activePlayer.status !== 'sold' && (
                <div className="p-3.5 rounded-2xl bg-warm-900/90 border border-[#c9a227]/30 flex flex-wrap items-center justify-between gap-2 shadow-inner">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c9a227] animate-pulse shadow-[0_0_10px_#c9a227]" />
                    <div>
                      <span className="text-xs font-bold text-sand-200 block">
                        Current Bidding Slab: <span className="text-[#c9a227] font-extrabold">{getBidSlabInfo(currentBid, tournamentSettings?.bidIncrementStep, activePlayer?.basePrice).label}</span> ({getBidSlabInfo(currentBid, tournamentSettings?.bidIncrementStep, activePlayer?.basePrice).rangeText})
                      </span>
                      <span className="text-[11px] text-sand-500 font-mono">
                        Rule Minimum Step: <strong className="text-cricket-emerald">+₹{getBidIncrement(currentBid, tournamentSettings?.bidIncrementStep, activePlayer?.basePrice).toLocaleString()} PTS</strong>
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-sand-400">
                    Next Standard Bid: <span className="text-cricket-emerald font-extrabold text-sm">₹{(highBidder ? currentBid + getBidIncrement(currentBid, tournamentSettings?.bidIncrementStep, effectiveBasePrice) : effectiveBasePrice).toLocaleString()} PTS</span>
                  </div>
                </div>
              )}

              {/* Team Bid Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 3xl:grid-cols-3 gap-4">
                {teams.map((team) => {
                  const isLeading = highBidder?.id === team.id;
                  const remainingPurse = team.totalPurse - team.spentPurse;
                  const maxCap = team.maxSquadSize || 10;
                  const isSquadFull = (team.squad?.length || 0) >= maxCap;
                  const effectiveBase = getPlayerStartingBid(activePlayer, tournamentSettings?.defaultBasePrice);
                  const stdInc = getBidIncrement(currentBid, tournamentSettings?.bidIncrementStep, effectiveBase);
                  const nextBidVal = highBidder ? currentBid + stdInc : effectiveBase;
                  const canAfford = remainingPurse >= nextBidVal;

                  // Standard dynamic increment + quick increment options scaled to stdInc
                  const increments = Array.from(new Set([
                    stdInc,
                    stdInc * 2,
                    stdInc * 5
                  ])).filter(inc => inc > 0).sort((a, b) => a - b);

                  return (
                    <div
                      key={team.id}
                      className={`p-4 pl-5 rounded-2xl border transition-all duration-200 relative overflow-hidden ${isLeading
                        ? 'bg-[#c9a227]/10 border-[#c9a227]/50 ring-2 ring-[#c9a227]/20 shadow-[0_0_25px_rgba(201,162,39,0.25)]'
                        : 'bg-warm-900/80 border-warm-700/60 hover:border-warm-600'
                        }`}
                      style={{
                        boxShadow: isLeading
                          ? `0 10px 30px -5px ${team.color || '#c9a227'}40, 0 0 15px ${team.color || '#c9a227'}20`
                          : `0 8px 25px -6px ${team.color || '#d4622a'}25`
                      }}
                    >
                      {/* Vertical Team Color Ribbon Accent */}
                      <div
                        className="absolute top-0 bottom-0 left-0 w-1.5 transition-all duration-300"
                        style={{
                          backgroundColor: team.color || '#d4622a',
                          boxShadow: `0 0 14px ${team.color || '#d4622a'}`
                        }}
                      />
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-xl">{team.logo}</span>
                          <div>
                            <h4 className="font-extrabold text-sand-100 text-sm sm:text-base font-sans leading-tight">{team.name}</h4>
                            <p className="text-[10px] text-sand-600 font-mono">
                              Purse: <span className="text-cricket-emerald font-bold">₹{remainingPurse.toLocaleString()}</span> · Squad: <span className="text-[#c9a227] font-bold">{team.squad?.length || 0}/{maxCap}</span>
                            </p>
                          </div>
                        </div>
                        {isLeading && (
                          <span className="px-2.5 py-1 rounded-full bg-[#c9a227] text-warm-950 font-black text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                            <span>👑 HIGH BID:</span>
                            <span>₹{currentBid.toLocaleString()} PTS</span>
                          </span>
                        )}
                      </div>

                      {/* Bid Action Section */}
                      {isLeading ? (
                        <div className="p-2.5 rounded-xl bg-[#c9a227]/20 border border-[#c9a227]/40 text-center">
                          <span className="text-xs font-bold text-amber-300 font-sans block">
                            Leading with Current High Bid of <strong className="text-white font-mono">₹{currentBid.toLocaleString()} PTS</strong>
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <button
                            disabled={!canBid || remainingPurse < nextBidVal || isSquadFull || activePlayer.status === 'sold'}
                            onClick={() => {
                              setSelectedBiddingTeamId(team.id);
                              handlePlaceBid(team, nextBidVal);
                            }}
                            className={`w-full py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition font-mono flex items-center justify-between ${
                              !canBid || remainingPurse < nextBidVal || isSquadFull || activePlayer.status === 'sold'
                                ? 'bg-warm-950 text-sand-700 border border-warm-900 cursor-not-allowed'
                                : 'bg-gradient-to-r from-terracotta-600 to-terracotta-500 hover:from-terracotta-500 hover:to-terracotta-400 text-white border border-terracotta-400 shadow-md active:scale-98 cursor-pointer'
                            }`}
                            title={highBidder ? `Increase bid by +₹${stdInc.toLocaleString()} → ₹${nextBidVal.toLocaleString()} PTS` : `Place opening bid at Base Price ₹${nextBidVal.toLocaleString()} PTS`}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span>⚡</span>
                              <span>{highBidder ? `Bid ₹${nextBidVal.toLocaleString()}` : `Opening Bid ₹${nextBidVal.toLocaleString()}`}</span>
                            </span>
                            <span className="text-[11px] opacity-90 font-mono shrink-0 pl-1">
                              {highBidder ? `(+₹${stdInc.toLocaleString()})` : 'Base Price'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* SOLD / UNSOLD Actions */}
              <div className="pt-4 border-t border-warm-700/50 flex items-center justify-between gap-4">
                <button
                  onClick={handleMarkUnsold}
                  disabled={!canSell || activePlayer.status === 'sold'}
                  className="flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl bg-warm-900 hover:bg-warm-800 text-sand-300 font-bold text-sm border border-warm-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-5 h-5 text-sand-500" />
                  <span>Pass / Unsold</span>
                </button>

                <button
                  onClick={handleMarkSold}
                  disabled={!canSell || !highBidder || activePlayer.status === 'sold'}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3.5 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition shadow-xl ${canSell && highBidder && activePlayer.status !== 'sold'
                    ? 'bg-gradient-to-r from-terracotta-600 to-terracotta-500 hover:from-terracotta-500 hover:to-terracotta-400 text-white shadow-terracotta-700/30 animate-pulse-glow active:scale-95'
                    : 'bg-warm-800 text-sand-600 cursor-not-allowed border border-warm-700'
                    }`}
                >
                  <Gavel className="w-5 h-5 transform -rotate-45" />
                  <span>HAMMER SOLD! (₹{currentBid} PTS)</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Live Feed + Purse Standings ── */}
          <div className="lg:col-span-4 space-y-5">

            {/* Live Bid Stream */}
            <div className="glass-panel p-5 rounded-3xl border border-warm-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-sand-100 flex items-center gap-2 font-sans">
                  <Activity className="w-4 h-4 text-terracotta-400" />
                  Live Bid Stream
                </h3>
                <span className="text-[10px] font-mono bg-warm-900 px-2 py-0.5 rounded text-sand-500 border border-warm-700">Realtime</span>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {history.length > 0 ? history.map(log => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl text-xs border transition ${log.type === 'SOLD'
                      ? 'bg-cricket-emerald/10 border-cricket-emerald/30 text-cricket-emerald'
                      : log.type === 'UNSOLD'
                        ? 'bg-warm-900 border-warm-700 text-sand-500'
                        : 'bg-warm-900/60 border-warm-800/80 text-sand-200'
                      }`}
                  >
                    {log.type === 'SOLD' ? (
                      <div className="flex items-center justify-between font-extrabold font-sans">
                        <span className="flex items-center gap-1.5 font-sans font-extrabold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {log.playerName} → {log.teamName}
                        </span>
                        <span className="font-mono text-[#c9a227]">₹{log.amount}</span>
                      </div>
                    ) : log.type === 'UNSOLD' ? (
                      <div className="flex items-center justify-between font-sans">
                        <span className="flex items-center gap-1.5 font-extrabold text-sand-400">
                          <XCircle className="w-3.5 h-3.5" />
                          {log.playerName} — Unsold
                        </span>
                        <span className="text-[10px] text-sand-600 font-mono">{log.timestamp}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between font-sans">
                        <div className="flex items-center space-x-1.5">
                          <TrendingUp className="w-3 h-3 text-sand-500" />
                          <span className="font-extrabold text-sand-200 font-sans">{log.teamName}</span>
                          <span className="text-sand-500">bid</span>
                        </div>
                        <span className="font-bold text-[#c9a227] font-mono">₹{log.amount}</span>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="p-8 text-center text-sand-600 text-xs font-mono">
                    Bids placed by teams will stream live here…
                  </div>
                )}
              </div>
            </div>

            {/* Purse Standings */}
            <div className="glass-panel p-5 rounded-3xl border border-warm-700/50 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sand-500 font-serif">PURSE STANDINGS</h4>
              <div className="space-y-2">
                {teams.map(t => {
                  const rem = t.totalPurse - t.spentPurse;
                  const pct = Math.round((rem / t.totalPurse) * 100);
                  return (
                    <div key={t.id} className="p-3 bg-warm-900/60 rounded-xl border border-warm-800/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-sand-200">
                          <span>{t.logo}</span>
                          {t.shortName}
                        </span>
                        <span className="font-mono text-cricket-emerald">₹{rem} ({t.squad?.length || 0}/{t.maxSquadSize || 10})</span>
                      </div>
                      <div className="w-full bg-warm-950 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-cricket-emerald h-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-16 text-center glass-panel rounded-3xl border border-warm-700/50 space-y-4">
          <div className="text-6xl animate-bounce">🏆</div>
          <h2 className="text-2xl font-bold text-sand-100 font-serif">Auction Complete!</h2>
          <p className="text-sand-500 text-sm max-w-md mx-auto">
            All players have been processed. Check Teams & Purse or Schedule to review squads and plan your tournament!
          </p>
        </div>
      )}

      {/* ── Super Admin Reduce Bid Modal ── */}
      {showReduceModal && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-amber-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <h3 className="text-lg font-black text-amber-300 flex items-center gap-2 font-display">
                <span>⚡ Super Admin: Reduce Bid</span>
              </h3>
              <button onClick={() => setShowReduceModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Reduce current bid of <strong className="text-amber-400">₹{currentBid} PTS</strong> for team <strong className="text-white">{highBidder?.name}</strong>:
            </p>

            <form onSubmit={handleAdminReduceBidSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">New Reduced Bid Amount (PTS)</label>
                <input
                  type="number"
                  min="50"
                  max={currentBid - 1}
                  step="50"
                  value={reducedBidInput}
                  onChange={(e) => setReducedBidInput(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-4 py-2.5 text-white font-mono text-lg font-bold focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReduceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 border border-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
                >
                  Confirm Reduce Bid
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
