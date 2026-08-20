import React, { useState, useEffect } from 'react';
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
  Play,
  Pause,
  Lock,
  TrendingUp,
  X,
  Crown,
  Zap,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { useAuth } from '../auth/AuthContext';
import { updatePlayer as apiUpdatePlayer, updateTeam as apiUpdateTeam, isMongoDB } from '../services/api';
import { getBidIncrement, getBidSlabInfo } from '../utils/bidding';

export default function AuctionRoom({ 
  players, 
  setPlayers, 
  teams, 
  setTeams, 
  history, 
  setHistory 
}) {
  const { user, can } = useAuth();
  const isSuperAdmin = user?.role === 'superuser';
  const canBid = can('canBid');
  const canSell = can('canSellPlayer');

  const availablePlayers = players.filter(p => p.status === 'available' || p.status === 'unsold');
  
  const [activePlayerId, setActivePlayerId] = useState(() => {
    const firstAvail = players.find(p => p.status === 'available');
    return firstAvail ? firstAvail.id : (players[0]?.id || null);
  });

  useEffect(() => {
    if ((!activePlayerId || !players.some(p => p.id === activePlayerId)) && players.length > 0) {
      const firstAvail = players.find(p => p.status === 'available');
      setActivePlayerId(firstAvail ? firstAvail.id : players[0]?.id);
    }
  }, [players, activePlayerId]);

  const activePlayer = players.find(p => p.id === activePlayerId);
  const [currentBid, setCurrentBid] = useState(activePlayer ? activePlayer.basePrice : 500);
  const [highBidder, setHighBidder] = useState(null);
  const [autoSimulate, setAutoSimulate] = useState(false);
  const [selectedBiddingTeamId, setSelectedBiddingTeamId] = useState(teams[0]?.id || null);

  useEffect(() => {
    if (activePlayer) {
      if (activePlayer.status === 'sold') {
        setCurrentBid(activePlayer.soldPrice);
        const buyer = teams.find(t => t.id === activePlayer.soldTo);
        setHighBidder(buyer || null);
      } else {
        setCurrentBid(activePlayer.basePrice);
        setHighBidder(null);
      }
    }
  }, [activePlayerId, players]);

  useEffect(() => {
    let timer;
    if (autoSimulate && activePlayer && activePlayer.status === 'available') {
      timer = setInterval(() => {
        const validTeams = teams.filter(t => {
          const isCurrentHigh = highBidder?.id === t.id;
          const remainingPurse = t.totalPurse - t.spentPurse;
          const maxCapacity = t.maxSquadSize || 8;
          const isFull = (t.squad?.length || 0) >= maxCapacity;
          return !isCurrentHigh && !isFull && remainingPurse >= currentBid + 50;
        });

        if (validTeams.length > 0) {
          const randomTeam = validTeams[Math.floor(Math.random() * validTeams.length)];
          const increment = getBidIncrement(currentBid);
          const nextBid = currentBid + increment;
          handlePlaceBid(randomTeam, nextBid);
        } else if (highBidder) {
          handleMarkSold();
        }
      }, 1800);
    }
    return () => clearInterval(timer);
  }, [autoSimulate, currentBid, highBidder, activePlayer]);

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

    const maxSquad = team.maxSquadSize || 8;
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
      const baseVal = activePlayer.basePrice;
      setCurrentBid(baseVal);
      setHighBidder(null);
      setHistory(prev => [{
        id: Date.now().toString(),
        type: 'ADMIN_REVOKE',
        playerName: activePlayer.name,
        teamName: highBidder.name,
        amount: baseVal,
        timestamp: new Date().toLocaleTimeString()
      }, ...prev]);
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

    setHistory(prev => [{
      id: Date.now().toString(),
      type: 'ADMIN_REDUCE',
      playerName: activePlayer.name,
      teamName: highBidder.name,
      amount: newPrice,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev]);
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

    setHistory(prev => [{
      id: Date.now().toString(),
      type: 'SOLD',
      playerName: activePlayer.name,
      teamName: highBidder.name,
      amount: soldPrice,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev]);

    setTimeout(() => {
      const nextP = players.find(p => p.id !== activePlayer.id && p.status === 'available');
      if (nextP) setActivePlayerId(nextP.id);
      setIsProcessing(false);
    }, 1200);
  };

  const handleMarkUnsold = () => {
    if (!activePlayer) return;
    soundFx.playUnsold();
    const updatedPlayer = { ...activePlayer, status: 'unsold' };
    setPlayers(prev => prev.map(p => p.id === activePlayer.id ? updatedPlayer : p));
    apiUpdatePlayer(activePlayer.id, updatedPlayer).catch(err => console.warn('MongoDB player unsold update err:', err));
    setHistory(prev => [{
      id: Date.now().toString(),
      type: 'UNSOLD',
      playerName: activePlayer.name,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev]);
    const nextP = players.find(p => p.id !== activePlayer.id && p.status === 'available');
    if (nextP) setActivePlayerId(nextP.id);
  };

  const handleNextPlayer = () => {
    const i = players.findIndex(p => p.id === activePlayerId);
    if (i < players.length - 1) setActivePlayerId(players[i + 1].id);
  };

  const handlePrevPlayer = () => {
    const i = players.findIndex(p => p.id === activePlayerId);
    if (i > 0) setActivePlayerId(players[i - 1].id);
  };

  const handleRandomPlayer = () => {
    const unsold = players.filter(p => p.status === 'available');
    if (unsold.length > 0) {
      setActivePlayerId(unsold[Math.floor(Math.random() * unsold.length)].id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── Top Control Bar ── */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-warm-700/50">
        <div className="flex items-center space-x-3">
          <span className="px-3 py-1 rounded-full bg-terracotta-600/20 text-terracotta-300 font-bold text-xs border border-terracotta-500/30 flex items-center gap-1.5">
            <span className="live-dot" />
            LIVE AUCTION ROUND
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

          {/* Auto-Sim — superuser only */}
          {can('canOverrideBid') && (
            <button
              onClick={() => setAutoSimulate(!autoSimulate)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl font-bold text-xs border transition ${
                autoSimulate
                  ? 'bg-terracotta-600/20 text-terracotta-300 border-terracotta-500/50 animate-pulse'
                  : 'bg-warm-900 text-sand-500 border-warm-700 hover:text-sand-200'
              }`}
            >
              {autoSimulate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-cricket-emerald" />}
              <span>{autoSimulate ? 'Simulating…' : 'Auto-Bid Demo'}</span>
            </button>
          )}
        </div>
      </div>

      {activePlayer ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
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
                    <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden border-2 border-warm-600/60 shadow-2xl bg-warm-900">
                      <img
                        src={activePlayer.avatarUrl}
                        alt={activePlayer.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
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
                      {(activePlayer.isCaptain || activePlayer.captainOfTeamId || (activePlayer.status === 'sold' && activePlayer.soldPrice === 0 && activePlayer.soldTo)) && (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-400" />
                          Captain & Auctioneer
                        </span>
                      )}
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black text-sand-100 mt-1 tracking-tight font-serif flex items-center gap-2">
                      {activePlayer.name}
                    </h2>
                    <p className="text-sand-600 text-xs flex items-center gap-1.5 mt-0.5">
                      <Shield className="w-3.5 h-3.5 text-cricket-emerald" />
                      Nyati Era Dhanori Roster
                    </p>
                  </div>

                  {/* 👑 Captain Retained Notice */}
                  {(activePlayer.isCaptain || activePlayer.captainOfTeamId || (activePlayer.status === 'sold' && activePlayer.soldPrice === 0 && activePlayer.soldTo)) && (
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
                  <div className="grid grid-cols-2 gap-3 bg-warm-900/80 p-4 rounded-2xl border border-warm-700/50">
                    <div>
                      <span className="text-sand-500 text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Base Price</span>
                      <span className="text-lg font-bold text-sand-200 font-mono">₹{activePlayer.basePrice} PTS</span>
                    </div>
                    <div className="border-l border-warm-700 pl-3">
                      <span className="text-[#c9a227] text-[10px] font-semibold uppercase tracking-wider block mb-0.5">Current Bid</span>
                      <span className="text-2xl font-black text-[#c9a227] font-mono">₹{currentBid} PTS</span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 text-center bg-warm-950/60 p-3 rounded-xl border border-warm-800/60">
                    {[
                      { label: 'Matches', value: activePlayer.matches, color: 'text-sand-200' },
                      { label: 'Runs', value: activePlayer.runs, color: 'text-cricket-emerald' },
                      { label: 'SR', value: activePlayer.strikeRate, color: 'text-[#c9a227]' },
                      { label: 'Wkts', value: activePlayer.wickets, color: 'text-terracotta-400' },
                    ].map((s, i) => (
                      <div key={i} className={`p-1 ${i > 0 ? 'border-l border-warm-800' : ''}`}>
                        <span className="text-sand-600 text-[9px] uppercase font-medium block">{s.label}</span>
                        <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                      </div>
                    ))}
                  </div>

                  {activePlayer.wickets > 0 && (
                    <div className="flex items-center justify-between text-xs text-sand-500 px-3 py-2 bg-warm-900/40 rounded-lg border border-warm-800/40 font-mono">
                      <span>Economy: <strong className="text-sand-300">{activePlayer.economy} rpo</strong></span>
                      <span>Best: <strong className="text-cricket-emerald">{activePlayer.bestBowling}</strong></span>
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
                        <span className="text-xl font-black text-[#c9a227] font-mono">₹{currentBid} PTS</span>
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
                              setReducedBidInput(Math.max(activePlayer.basePrice, currentBid - 100));
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
                <h3 className="text-base font-bold text-sand-100 flex items-center gap-2">
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
                        Current Bidding Slab: <span className="text-[#c9a227] font-extrabold">{getBidSlabInfo(currentBid).label}</span> ({getBidSlabInfo(currentBid).rangeText})
                      </span>
                      <span className="text-[11px] text-sand-500 font-mono">
                        Rule Minimum Step: <strong className="text-cricket-emerald">+₹{getBidIncrement(currentBid)} PTS</strong>
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-sand-400">
                    Next Standard Bid: <span className="text-cricket-emerald font-extrabold text-sm">₹{(highBidder ? currentBid + getBidIncrement(currentBid) : activePlayer.basePrice).toLocaleString()} PTS</span>
                  </div>
                </div>
              )}

              {/* Team Bid Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {teams.map((team) => {
                  const isLeading = highBidder?.id === team.id;
                  const remainingPurse = team.totalPurse - team.spentPurse;
                  const isSquadFull = team.squad?.length >= 8;
                  const stdInc = getBidIncrement(currentBid);
                  const canAfford = remainingPurse >= (highBidder ? currentBid + stdInc : activePlayer.basePrice);

                  // Standard dynamic increment + optional quick increments
                  const increments = Array.from(new Set([stdInc, 100, 200, 500])).sort((a, b) => a - b);

                  return (
                    <div
                      key={team.id}
                      className={`p-4 pl-5 rounded-2xl border transition-all duration-200 relative overflow-hidden ${
                        isLeading
                          ? 'bg-[#c9a227]/10 border-[#c9a227]/50 ring-2 ring-[#c9a227]/20'
                          : 'bg-warm-900/80 border-warm-700/60 hover:border-warm-600'
                      }`}
                    >
                      {/* Vertical Team Color Ribbon Accent */}
                      <div 
                        className="absolute top-0 bottom-0 left-0 w-1.5 transition-all duration-300" 
                        style={{ 
                          backgroundColor: team.color || '#d4622a',
                          boxShadow: `0 0 12px ${team.color || '#d4622a'}` 
                        }} 
                      />
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-xl">{team.logo}</span>
                          <div>
                            <h4 className="font-bold text-sand-100 text-sm">{team.name}</h4>
                            <p className="text-[10px] text-sand-600 font-mono">
                              Purse: <span className="text-cricket-emerald font-bold">₹{remainingPurse}</span> · Squad: <span className="text-[#c9a227] font-bold">{team.squad?.length || 0}/8</span>
                            </p>
                          </div>
                        </div>
                        {isLeading && (
                          <span className="px-2 py-0.5 rounded-full bg-[#c9a227] text-warm-950 font-extrabold text-[9px] uppercase tracking-wider">
                            HIGH BID
                          </span>
                        )}
                      </div>

                      {/* Bid increment buttons */}
                      <div className="flex items-center gap-1.5">
                        {increments.map((inc) => {
                          const isStandardRuleStep = inc === stdInc;
                          const nextBidVal = highBidder ? currentBid + inc : activePlayer.basePrice;
                          const isDisabled = !canBid || isLeading || remainingPurse < nextBidVal || isSquadFull || activePlayer.status === 'sold';
                          return (
                            <button
                              key={inc}
                              disabled={isDisabled}
                              onClick={() => {
                                setSelectedBiddingTeamId(team.id);
                                handlePlaceBid(team, nextBidVal);
                              }}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold transition font-mono ${
                                isDisabled
                                  ? 'bg-warm-950 text-sand-700 border border-warm-900 cursor-not-allowed'
                                  : isStandardRuleStep
                                    ? 'bg-terracotta-600 hover:bg-terracotta-500 text-white border border-terracotta-400 shadow-md scale-[1.02] active:scale-95'
                                    : 'bg-warm-800 hover:bg-cricket-emerald hover:text-warm-950 text-cricket-emerald border border-cricket-emerald/30 active:scale-95'
                              }`}
                              title={isStandardRuleStep ? `Standard Tier Rule Step (+₹${inc})` : `Custom Increment (+₹${inc})`}
                            >
                              +{inc}{isStandardRuleStep ? '⚡' : ''}
                            </button>
                          );
                        })}
                      </div>
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
                  className={`flex-1 flex items-center justify-center space-x-2 py-3.5 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition shadow-xl ${
                    canSell && highBidder && activePlayer.status !== 'sold'
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
                <h3 className="text-sm font-bold text-sand-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-terracotta-400" />
                  Live Bid Stream
                </h3>
                <span className="text-[10px] font-mono bg-warm-900 px-2 py-0.5 rounded text-sand-500 border border-warm-700">Realtime</span>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {history.length > 0 ? history.map(log => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl text-xs border transition ${
                      log.type === 'SOLD'
                        ? 'bg-cricket-emerald/10 border-cricket-emerald/30 text-cricket-emerald'
                        : log.type === 'UNSOLD'
                        ? 'bg-warm-900 border-warm-700 text-sand-500'
                        : 'bg-warm-900/60 border-warm-800/80 text-sand-200'
                    }`}
                  >
                    {log.type === 'SOLD' ? (
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {log.playerName} → {log.teamName}
                        </span>
                        <span className="font-mono text-[#c9a227]">₹{log.amount}</span>
                      </div>
                    ) : log.type === 'UNSOLD' ? (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5" />
                          {log.playerName} — Unsold
                        </span>
                        <span className="text-[10px] text-sand-600">{log.timestamp}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <TrendingUp className="w-3 h-3 text-sand-500" />
                          <span className="font-bold text-sand-200">{log.teamName}</span>
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-sand-500">Purse Standings</h4>
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
                        <span className="font-mono text-cricket-emerald">₹{rem} ({t.squad?.length || 0}/8)</span>
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
