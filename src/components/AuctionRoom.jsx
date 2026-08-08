import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { useAuth } from '../auth/AuthContext';
import { updatePlayer as apiUpdatePlayer, updateTeam as apiUpdateTeam, isMongoDB } from '../services/api';

export default function AuctionRoom({ 
  players, 
  setPlayers, 
  teams, 
  setTeams, 
  history, 
  setHistory 
}) {
  const { can } = useAuth();

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
          const increment = [50, 100, 200][Math.floor(Math.random() * 3)];
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

  const handleMarkSold = () => {
    if (!activePlayer || !highBidder) {
      alert("Place at least one bid before marking Sold!");
      return;
    }
    soundFx.playSold();
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    const soldPrice = currentBid;
    const buyerTeamId = highBidder.id;

    const updatedPlayer = { ...activePlayer, status: 'sold', soldPrice, soldTo: buyerTeamId };
    const updatedTeam = {
      ...highBidder,
      spentPurse: highBidder.spentPurse + soldPrice,
      playersCount: (highBidder.playersCount || 0) + 1,
      squad: [...(highBidder.squad || []), { ...activePlayer, soldPrice }]
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

  const canBid = can('canBid');
  const canSell = can('canSellPlayer');

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
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black text-sand-100 mt-1 tracking-tight font-serif">
                      {activePlayer.name}
                    </h2>
                    <p className="text-sand-600 text-xs flex items-center gap-1.5 mt-0.5">
                      <Shield className="w-3.5 h-3.5 text-cricket-emerald" />
                      Nyati Era Dhanori Roster
                    </p>
                  </div>

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
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-[#c9a227]/15 to-[#c9a227]/5 border border-[#c9a227]/40">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{highBidder.logo}</span>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#c9a227] block">Leading Bidder</span>
                          <span className="font-extrabold text-sand-100 text-base">{highBidder.name}</span>
                        </div>
                      </div>
                      <span className="text-xl font-black text-[#c9a227] font-mono">₹{currentBid} PTS</span>
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

              {/* Team Bid Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {teams.map((team) => {
                  const isLeading = highBidder?.id === team.id;
                  const remainingPurse = team.totalPurse - team.spentPurse;
                  const isSquadFull = team.squad?.length >= 8;
                  const canAfford = remainingPurse >= (highBidder ? currentBid + 50 : activePlayer.basePrice);

                  return (
                    <div
                      key={team.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 ${
                        isLeading
                          ? 'bg-[#c9a227]/10 border-[#c9a227]/50 ring-2 ring-[#c9a227]/20'
                          : 'bg-warm-900/80 border-warm-700/60 hover:border-warm-600'
                      }`}
                    >
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
                        {[50, 100, 250, 500].map((inc) => {
                          const nextBidVal = highBidder ? currentBid + inc : activePlayer.basePrice;
                          const isDisabled = !canBid || isLeading || !canAfford || isSquadFull || activePlayer.status === 'sold';
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
                                  : 'bg-warm-800 hover:bg-cricket-emerald hover:text-warm-950 text-cricket-emerald border border-cricket-emerald/30 active:scale-95'
                              }`}
                            >
                              +{inc}
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
    </div>
  );
}
