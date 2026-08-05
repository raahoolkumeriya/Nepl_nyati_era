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
  Zap, 
  Shield, 
  User, 
  Activity, 
  TrendingUp, 
  Award,
  AlertCircle,
  Play,
  Pause
} from 'lucide-react';
import { soundFx } from '../utils/audio';

export default function AuctionRoom({ 
  players, 
  setPlayers, 
  teams, 
  setTeams, 
  history, 
  setHistory 
}) {
  // Available players (not sold or unsold, or unsold available for round 2)
  const availablePlayers = players.filter(p => p.status === 'available' || p.status === 'unsold');
  
  // Current active player index
  const [activePlayerId, setActivePlayerId] = useState(() => {
    const firstAvail = players.find(p => p.status === 'available');
    return firstAvail ? firstAvail.id : (players[0]?.id || null);
  });

  const activePlayer = players.find(p => p.id === activePlayerId);

  // Current bidding state
  const [currentBid, setCurrentBid] = useState(activePlayer ? activePlayer.basePrice : 500);
  const [highBidder, setHighBidder] = useState(null); // team object
  const [autoSimulate, setAutoSimulate] = useState(false);
  const [selectedBiddingTeamId, setSelectedBiddingTeamId] = useState(teams[0]?.id || null);

  // Reset bid state when active player changes
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

  // Auto Simulation loop if turned on
  useEffect(() => {
    let timer;
    if (autoSimulate && activePlayer && activePlayer.status === 'available') {
      timer = setInterval(() => {
        // Find valid teams that can bid
        const validTeams = teams.filter(t => {
          const isCurrentHigh = highBidder?.id === t.id;
          const remainingPurse = t.totalPurse - t.spentPurse;
          const isFull = t.squad?.length >= 8;
          return !isCurrentHigh && !isFull && remainingPurse >= currentBid + 50;
        });

        if (validTeams.length > 0) {
          const randomTeam = validTeams[Math.floor(Math.random() * validTeams.length)];
          const increment = [50, 100, 200][Math.floor(Math.random() * 3)];
          const nextBid = currentBid + increment;
          handlePlaceBid(randomTeam, nextBid);
        } else if (highBidder) {
          // Everyone passed, sell player
          handleMarkSold();
        }
      }, 1800);
    }
    return () => clearInterval(timer);
  }, [autoSimulate, currentBid, highBidder, activePlayer]);

  // Handle Bid Placement
  const handlePlaceBid = (team, newBidAmount) => {
    if (!activePlayer || activePlayer.status === 'sold') return;

    const remainingPurse = team.totalPurse - team.spentPurse;
    if (newBidAmount > remainingPurse) {
      alert(`${team.name} does not have enough remaining purse (${remainingPurse} PTS available)!`);
      return;
    }

    if (team.squad?.length >= 8) {
      alert(`${team.name} has already reached the maximum 8-player squad limit!`);
      return;
    }

    soundFx.playBid();
    setCurrentBid(newBidAmount);
    setHighBidder(team);

    // Add entry to live feed history
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

  // Handle Mark Sold
  const handleMarkSold = () => {
    if (!activePlayer || !highBidder) {
      alert("Please place at least one bid before marking Sold!");
      return;
    }

    soundFx.playSold();
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });

    const soldPrice = currentBid;
    const buyerTeamId = highBidder.id;

    // Update Player status
    setPlayers(prev => prev.map(p => {
      if (p.id === activePlayer.id) {
        return { ...p, status: 'sold', soldPrice, soldTo: buyerTeamId };
      }
      return p;
    }));

    // Update Team squad and purse
    setTeams(prev => prev.map(t => {
      if (t.id === buyerTeamId) {
        return {
          ...t,
          spentPurse: t.spentPurse + soldPrice,
          playersCount: (t.playersCount || 0) + 1,
          squad: [...(t.squad || []), { ...activePlayer, soldPrice }]
        };
      }
      return t;
    }));

    // Log sold event
    setHistory(prev => [{
      id: Date.now().toString(),
      type: 'SOLD',
      playerName: activePlayer.name,
      teamName: highBidder.name,
      amount: soldPrice,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev]);

    // Auto advance to next available player after brief delay
    setTimeout(() => {
      const nextP = players.find(p => p.id !== activePlayer.id && p.status === 'available');
      if (nextP) {
        setActivePlayerId(nextP.id);
      }
    }, 1200);
  };

  // Handle Mark Unsold
  const handleMarkUnsold = () => {
    if (!activePlayer) return;

    soundFx.playUnsold();
    setPlayers(prev => prev.map(p => {
      if (p.id === activePlayer.id) {
        return { ...p, status: 'unsold' };
      }
      return p;
    }));

    setHistory(prev => [{
      id: Date.now().toString(),
      type: 'UNSOLD',
      playerName: activePlayer.name,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev]);

    // Move to next player
    const nextP = players.find(p => p.id !== activePlayer.id && p.status === 'available');
    if (nextP) {
      setActivePlayerId(nextP.id);
    }
  };

  const handleNextPlayer = () => {
    const currentIndex = players.findIndex(p => p.id === activePlayerId);
    if (currentIndex < players.length - 1) {
      setActivePlayerId(players[currentIndex + 1].id);
    }
  };

  const handlePrevPlayer = () => {
    const currentIndex = players.findIndex(p => p.id === activePlayerId);
    if (currentIndex > 0) {
      setActivePlayerId(players[currentIndex - 1].id);
    }
  };

  const handleRandomPlayer = () => {
    const unSoldList = players.filter(p => p.status === 'available');
    if (unSoldList.length > 0) {
      const randomP = unSoldList[Math.floor(Math.random() * unSoldList.length)];
      setActivePlayerId(randomP.id);
    }
  };

  const selectedTeamObj = teams.find(t => t.id === selectedBiddingTeamId);

  return (
    <div className="space-y-8">
      
      {/* Top Banner Control & Player Navigation Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            LIVE AUCTION ROUND
          </span>
          <span className="text-slate-400 text-xs font-mono">
            {players.filter(p => p.status === 'sold').length} / {players.length} Players Sold
          </span>
        </div>

        {/* Player Switcher Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevPlayer}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Previous Player"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleRandomPlayer}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-semibold text-xs border border-amber-500/30 transition"
            title="Pick Random Available Player"
          >
            <Shuffle className="w-4 h-4" />
            <span>Random</span>
          </button>

          <button
            onClick={handleNextPlayer}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Next Player"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Auto Simulation Toggle */}
          <button
            onClick={() => setAutoSimulate(!autoSimulate)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold text-xs border transition ${
              autoSimulate
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {autoSimulate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
            <span>{autoSimulate ? 'Simulating...' : 'Auto-Bid Demo'}</span>
          </button>
        </div>
      </div>

      {activePlayer ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT 8 COLS: Player Hero Card & Bidding Controls */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Player Main Presentation Card */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden border border-slate-800 shadow-2xl">
              
              {/* Background Ambient Glow */}
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Avatar & CricHeroes Link */}
                <div className="md:col-span-5 flex flex-col items-center">
                  <div className="relative group">
                    <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-2xl bg-slate-900">
                      <img
                        src={activePlayer.avatarUrl}
                        alt={activePlayer.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                        }}
                      />
                    </div>
                    {/* Category Overlay Tag */}
                    <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-amber-500/40 text-amber-400 font-bold text-xs flex items-center gap-1 shadow-md">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      {activePlayer.category}
                    </div>

                    {/* Status Badge */}
                    <div className="absolute bottom-3 right-3">
                      {activePlayer.status === 'sold' && (
                        <span className="bg-red-500 text-white font-extrabold text-xs px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg">
                          SOLD
                        </span>
                      )}
                      {activePlayer.status === 'unsold' && (
                        <span className="bg-slate-700 text-slate-300 font-bold text-xs px-3 py-1 rounded-lg uppercase tracking-widest">
                          UNSOLD
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CricHeroes Official Link Button */}
                  <a
                    href={activePlayer.cricHeroesUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 transition shadow-sm"
                  >
                    <span>View CricHeroes Profile</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Player Information & Stats */}
                <div className="md:col-span-7 space-y-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                        {activePlayer.role}
                      </span>
                      <span className="text-slate-400 text-xs font-mono">ID: #{activePlayer.id}</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black text-white mt-1 tracking-wide">
                      {activePlayer.name}
                    </h2>
                    <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      Nyati Era Dhanori Resident Roster
                    </p>
                  </div>

                  {/* Base Price & Current Bid Banner */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                    <div>
                      <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block">Base Price</span>
                      <span className="text-xl font-bold text-slate-200 font-mono">₹{activePlayer.basePrice} PTS</span>
                    </div>
                    <div className="border-l border-slate-800 pl-3">
                      <span className="text-amber-400 text-[11px] font-semibold uppercase tracking-wider block">Current Highest Bid</span>
                      <span className="text-2xl font-black text-amber-400 font-mono">₹{currentBid} PTS</span>
                    </div>
                  </div>

                  {/* Player Key Statistics Grid */}
                  <div className="grid grid-cols-4 gap-2 text-center bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="p-1">
                      <span className="text-slate-400 text-[10px] uppercase font-medium block">Matches</span>
                      <span className="text-sm font-bold text-white">{activePlayer.matches}</span>
                    </div>
                    <div className="p-1 border-l border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-medium block">Runs</span>
                      <span className="text-sm font-bold text-emerald-400">{activePlayer.runs}</span>
                    </div>
                    <div className="p-1 border-l border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-medium block">Strike Rate</span>
                      <span className="text-sm font-bold text-amber-400">{activePlayer.strikeRate}</span>
                    </div>
                    <div className="p-1 border-l border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-medium block">Wickets</span>
                      <span className="text-sm font-bold text-cyan-400">{activePlayer.wickets}</span>
                    </div>
                  </div>

                  {/* Extra Bowler Stats if available */}
                  {activePlayer.wickets > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-400 px-3 py-2 bg-slate-900/40 rounded-lg border border-slate-800/40 font-mono">
                      <span>Bowling Avg / Economy: <strong className="text-slate-200">{activePlayer.economy} rpo</strong></span>
                      <span>Best Spell: <strong className="text-emerald-400">{activePlayer.bestBowling}</strong></span>
                    </div>
                  )}

                  {/* Highest Bidder Display Tag */}
                  {highBidder ? (
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/40">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{highBidder.logo}</span>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Leading Bidder</span>
                          <span className="font-extrabold text-white text-base">{highBidder.name}</span>
                        </div>
                      </div>
                      <span className="text-xl font-black text-amber-400 font-mono">
                        ₹{currentBid} PTS
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-500 text-xs font-mono">
                      No active bids placed yet. Select team below to open bidding!
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Bidding Control Panel for Team Owners */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
              
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-emerald-400" />
                  Team Owners Bidding Console
                </h3>
                <span className="text-xs text-slate-400 font-mono">Click a team to place quick bid</span>
              </div>

              {/* Team Selector & Quick Bid Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {teams.map((team) => {
                  const isLeading = highBidder?.id === team.id;
                  const remainingPurse = team.totalPurse - team.spentPurse;
                  const isSquadFull = team.squad?.length >= 8;
                  const canAfford = remainingPurse >= (highBidder ? currentBid + 50 : activePlayer.basePrice);
                  const isCurrentSelected = selectedBiddingTeamId === team.id;

                  return (
                    <div
                      key={team.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 ${
                        isLeading
                          ? 'bg-amber-500/10 border-amber-500/60 ring-2 ring-amber-500/30'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-xl">{team.logo}</span>
                          <div>
                            <h4 className="font-bold text-white text-sm">{team.name}</h4>
                            <p className="text-[11px] text-slate-400 font-mono">
                              Purse: <span className="text-emerald-400 font-bold">₹{remainingPurse}</span> | Squad: <span className="text-amber-400 font-bold">{team.squad?.length || 0}/8</span>
                            </p>
                          </div>
                        </div>
                        {isLeading && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider">
                            HIGH BID
                          </span>
                        )}
                      </div>

                      {/* Incremental Bid Buttons */}
                      <div className="flex items-center gap-1.5">
                        {[50, 100, 250, 500].map((inc) => {
                          const nextBidVal = highBidder ? currentBid + inc : activePlayer.basePrice;
                          const isDisabled = isLeading || !canAfford || isSquadFull || activePlayer.status === 'sold';

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
                                  ? 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed'
                                  : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border border-emerald-500/30 shadow-sm active:scale-95'
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

              {/* Auction Operational Actions (SOLD / UNSOLD / NEXT) */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-4">
                
                <button
                  onClick={handleMarkUnsold}
                  disabled={activePlayer.status === 'sold'}
                  className="flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm border border-slate-700 transition"
                >
                  <XCircle className="w-5 h-5 text-slate-400" />
                  <span>Pass / Unsold</span>
                </button>

                <button
                  onClick={handleMarkSold}
                  disabled={!highBidder || activePlayer.status === 'sold'}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3.5 px-6 rounded-2xl font-black text-base uppercase tracking-wider transition shadow-xl ${
                    highBidder && activePlayer.status !== 'sold'
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/30 scale-[1.01] active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Gavel className="w-5 h-5 transform -rotate-45" />
                  <span>HAMMER SOLD! (₹{currentBid} PTS)</span>
                </button>

              </div>

            </div>

          </div>

          {/* RIGHT 4 COLS: Live Bidding History Stream & Squad Overview */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Live Bidding History Feed */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Live Bidding Stream
                </h3>
                <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-400">Realtime</span>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {history.length > 0 ? (
                  history.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-xl text-xs border transition ${
                        log.type === 'SOLD'
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : log.type === 'UNSOLD'
                          ? 'bg-slate-900 border-slate-800 text-slate-400'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-200'
                      }`}
                    >
                      {log.type === 'SOLD' ? (
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            {log.playerName} SOLD to {log.teamName}!
                          </span>
                          <span className="font-mono text-amber-400">₹{log.amount} PTS</span>
                        </div>
                      ) : log.type === 'UNSOLD' ? (
                        <div className="flex items-center justify-between font-medium">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <XCircle className="w-4 h-4" />
                            {log.playerName} marked Unsold
                          </span>
                          <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white">{log.teamName}</span>
                            <span className="text-slate-400 font-mono">bid on {log.playerName}</span>
                          </div>
                          <span className="font-bold text-amber-400 font-mono">₹{log.amount} PTS</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs font-mono">
                    No bids recorded yet. Bids placed by team owners will stream live here!
                  </div>
                )}
              </div>
            </div>

            {/* Quick Purse Summary Widget */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Team Purse Standings</h4>
              <div className="space-y-2">
                {teams.map((t) => {
                  const rem = t.totalPurse - t.spentPurse;
                  const pct = Math.round((rem / t.totalPurse) * 100);

                  return (
                    <div key={t.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-white">
                          <span>{t.logo}</span>
                          {t.name}
                        </span>
                        <span className="font-mono text-emerald-400">₹{rem} PTS ({t.squad?.length || 0}/8)</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="p-16 text-center glass-panel rounded-3xl border border-slate-800 space-y-4">
          <Trophy className="w-16 h-16 text-amber-400 mx-auto animate-bounce" />
          <h2 className="text-2xl font-bold text-white">Auction Complete!</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            All players have been processed. Switch to Teams & Purse or Schedule tab to review squads and setup tournament matches!
          </p>
        </div>
      )}

    </div>
  );
}
