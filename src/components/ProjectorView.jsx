import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Gavel, 
  Tv, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Tag, 
  Award,
  Sparkles,
  Lock,
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { updatePlayer as apiUpdatePlayer, updateTeam as apiUpdateTeam } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { getBidIncrement, getBidSlabInfo } from '../utils/bidding';

export default function ProjectorView({ 
  players = [], 
  setPlayers, 
  teams = [], 
  setTeams, 
  onClose 
}) {
  const { user, can } = useAuth();
  const isSuperAdmin = user?.role === 'superuser';
  const canBid = can('canBid');
  const canSell = can('canSellPlayer');
  // ── Player Priority Logic ──────────────────────────────────────────────────
  // Priority: 1. Available -> 2. Unsold -> 3. Sold (If all players are sold out)
  const availablePlayers = players.filter(p => p.status === 'available');
  const unsoldPlayers = players.filter(p => p.status === 'unsold');
  const soldPlayers = players.filter(p => p.status === 'sold');

  const defaultPriorityPlayer = 
    availablePlayers[0] || 
    unsoldPlayers[0] || 
    players[0] || 
    null;

  const [selectedId, setSelectedId] = useState(defaultPriorityPlayer?.id || null);

  // Sync selected player if list updates or if selectedId is invalid
  useEffect(() => {
    if (!selectedId || !players.some(p => p.id === selectedId)) {
      if (defaultPriorityPlayer) {
        setSelectedId(defaultPriorityPlayer.id);
      }
    }
  }, [players, selectedId]);

  const activePlayer = players.find(p => p.id === selectedId) || defaultPriorityPlayer;
  const isSoldOut = activePlayer?.status === 'sold';

  // Buyer team if sold, or current leading team if bidding
  const buyerTeamObj = activePlayer && isSoldOut ? teams.find(t => t.id === activePlayer.soldTo) : null;
  const leadingTeamObj = activePlayer ? teams.find(t => t.id === activePlayer.leadingTeam) : null;
  const displayedTeamObj = buyerTeamObj || leadingTeamObj;

  const currentBid = activePlayer ? (
    isSoldOut ? (activePlayer.soldPrice || activePlayer.basePrice) : (activePlayer.currentBid || activePlayer.basePrice)
  ) : 0;

  // ── Navigation Handlers ───────────────────────────────────────────────────
  const currentIndex = players.findIndex(p => p.id === activePlayer?.id);

  const handlePrevPlayer = () => {
    if (players.length === 0) return;
    const newIdx = currentIndex > 0 ? currentIndex - 1 : players.length - 1;
    setSelectedId(players[newIdx].id);
  };

  const handleNextPlayer = () => {
    if (players.length === 0) return;
    const newIdx = currentIndex < players.length - 1 ? currentIndex + 1 : 0;
    setSelectedId(players[newIdx].id);
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
    const maxSquad = team.maxSquadSize || 8;

    if (nextBid > remainingPurse) {
      alert(`⚠️ Insufficient Purse: ${team.name} only has ₹${remainingPurse} PTS remaining budget. Cannot place bid of ₹${nextBid} PTS!`);
      return;
    }
    if ((team.squad?.length || 0) >= maxSquad) {
      alert(`⚠️ Squad Limit Reached: ${team.name} has reached its ${maxSquad}-player capacity!`);
      return;
    }

    soundFx.playBid();

    setPlayers(prev => prev.map(p => {
      if (p.id === activePlayer.id) {
        return { ...p, currentBid: nextBid, leadingTeam: team.id };
      }
      return p;
    }));
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

    setTimeout(() => {
      setIsProcessing(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070b14] text-white flex flex-col justify-between p-4 sm:p-8 select-none overflow-hidden font-sans">
      
      {/* Background Neon Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-tr from-cyan-500/10 via-purple-600/10 to-rose-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* ── Top TV Header Controls ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 z-10 border-b border-cyan-500/20 pb-4">
        
        {/* Branding */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-slate-950 flex items-center justify-center font-bold shadow-[0_0_20px_rgba(0,242,254,0.4)]">
            <Gavel className="w-6 h-6 transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-wider gradient-text-brand font-display uppercase">
                NYATI ERA PREMIER LEAGUE 2026+
              </h1>
              <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-serif font-bold shadow-[0_0_12px_rgba(121,40,202,0.3)]">
                कर्मण्येवाधिकारस्ते
              </span>
            </div>
            <p className="text-xs text-cyan-400 font-mono font-bold tracking-widest uppercase flex items-center gap-2">
              LIVE TV PROJECTOR SCREEN
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#00ff87]" />
            </p>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10 max-w-7xl mx-auto w-full my-auto py-2">
          
          {/* Left Column: Player Photo Card & Status Stamp */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative">
              {/* Photo Frame */}
              <div className={`w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden border-4 transition-all duration-500 bg-slate-900 relative ${
                isSoldOut 
                  ? 'border-rose-500/80 shadow-[0_0_60px_rgba(244,63,94,0.4)]' 
                  : 'border-cyan-500/50 shadow-[0_0_50px_rgba(0,242,254,0.3)]'
              }`}>
                <img
                  src={activePlayer.avatarUrl}
                  alt={activePlayer.name}
                  className={`w-full h-full object-cover transition-all duration-500 ${isSoldOut ? 'grayscale-[30%] brightness-75' : ''}`}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                  }}
                />

                {/* 🔴 PROMINENT SOLD OUT STAMP OVERLAY */}
                {isSoldOut && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-4">
                    <div className="transform -rotate-12 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white font-black text-3xl sm:text-4xl uppercase tracking-widest px-8 py-2.5 rounded-2xl shadow-[0_0_35px_rgba(244,63,94,0.8)] border-2 border-white/40 animate-pulse flex items-center gap-2">
                      <Tag className="w-7 h-7" />
                      <span>SOLD OUT</span>
                    </div>

                    <div className="mt-4 text-center space-y-1">
                      <span className="text-xs uppercase text-slate-400 font-bold block tracking-wider">Final Sold Price</span>
                      <span className="text-3xl font-black text-emerald-400 font-mono drop-shadow-[0_0_15px_rgba(0,255,135,0.5)]">
                        ₹{activePlayer.soldPrice || currentBid} PTS
                      </span>
                    </div>

                    {buyerTeamObj && (
                      <div className="mt-3 bg-slate-900/90 px-4 py-1.5 rounded-xl border border-rose-500/40 flex items-center space-x-2 shadow-lg">
                        <span className="text-2xl">{buyerTeamObj.logo}</span>
                        <span className="font-bold text-white text-sm">{buyerTeamObj.name}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Category Pill Badge */}
              <div className="absolute top-4 left-4 bg-slate-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-cyan-500/50 text-cyan-300 font-black text-xs uppercase tracking-wider shadow-lg">
                {activePlayer.category}
              </div>
            </div>
            
            {/* CricHeroes Link */}
            <a
              href={activePlayer.cricHeroesUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center space-x-2 text-xs text-amber-300 hover:text-amber-200 font-bold bg-slate-900/90 px-4 py-2 rounded-xl border border-amber-500/30 transition shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Verified CricHeroes.com Player Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Right Column: Player Stats, Bidding Box & Controls */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Role & Player Name */}
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 font-bold text-xs border border-cyan-500/30">
                  {activePlayer.role}
                </span>
                
                {/* Live vs Sold Status Tag */}
                {isSoldOut ? (
                  <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-black text-xs border border-rose-500/40 uppercase tracking-wider flex items-center gap-1 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
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

              <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight font-display">
                {activePlayer.name}
              </h2>
            </div>

            {/* Price Box */}
            <div className={`p-6 rounded-3xl backdrop-blur-xl border shadow-2xl flex items-center justify-between transition-all duration-300 ${
              isSoldOut 
                ? 'bg-rose-950/40 border-rose-500/40 shadow-rose-950/50' 
                : 'bg-slate-900/90 border-cyan-500/30 shadow-cyan-950/50'
            }`}>
              <div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Base Price</span>
                <span className="text-2xl font-bold text-slate-200 font-mono">₹{activePlayer.basePrice} PTS</span>
              </div>

              <div className="text-right">
                <span className={`text-xs font-extrabold uppercase tracking-widest block ${isSoldOut ? 'text-rose-400' : 'text-cyan-400'}`}>
                  {isSoldOut ? 'FINAL SOLD PRICE' : 'CURRENT HIGH BID'}
                </span>
                <span className={`text-4xl sm:text-6xl font-black font-mono drop-shadow-md ${
                  isSoldOut ? 'text-emerald-400' : 'text-cyan-300 drop-shadow-[0_0_25px_rgba(0,242,254,0.5)]'
                }`}>
                  ₹{currentBid} PTS
                </span>
              </div>
            </div>

            {/* Leading / Buyer Team Banner */}
            {displayedTeamObj ? (
              <div className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all duration-300 ${
                isSoldOut 
                  ? 'bg-rose-500/15 border-rose-500 text-rose-100 shadow-[0_0_25px_rgba(244,63,94,0.2)]'
                  : 'bg-cyan-500/15 border-cyan-400 text-cyan-100 shadow-[0_0_25px_rgba(0,242,254,0.25)]'
              }`}>
                <div className="flex items-center space-x-4">
                  <span className="text-4xl">{displayedTeamObj.logo}</span>
                  <div>
                    <span className={`text-xs uppercase font-extrabold block tracking-wider ${isSoldOut ? 'text-rose-300' : 'text-cyan-300'}`}>
                      {isSoldOut ? 'ACQUIRED BY TEAM' : 'CURRENT HIGHEST BIDDER'}
                    </span>
                    <span className="text-2xl font-black text-white">{displayedTeamObj.name}</span>
                  </div>
                </div>
                {isSoldOut && (
                  <span className="px-3 py-1 rounded-xl bg-rose-500/30 text-rose-200 font-bold text-xs uppercase tracking-wider border border-rose-400/40">
                    SQUAD CONFIRMED
                  </span>
                )}
              </div>
            ) : (
              <div className="p-4 text-center rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-slate-500 text-sm">
                Waiting for opening bid...
              </div>
            )}

            {/* Dynamic Bidding Tier Indicator */}
            {!isSoldOut && (
              <div className="px-4 py-2.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex items-center justify-between text-xs font-mono shadow-md">
                <div className="flex items-center space-x-2 text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f2fe]" />
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    {getBidSlabInfo(currentBid).label} · {getBidSlabInfo(currentBid).rangeText}
                  </span>
                </div>
                <span className="text-emerald-400 font-extrabold text-xs">
                  Slab Step: +₹{getBidIncrement(currentBid)} PTS
                </span>
              </div>
            )}

            {/* Team Bidding Control Suite (Disabled if Sold or Not Authorized) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {teams.map((t) => {
                const isCurrentLeading = activePlayer?.leadingTeam === t.id;
                const isDisabled = isSoldOut || !canBid || isCurrentLeading;
                const currentInc = getBidIncrement(currentBid);
                return (
                  <button
                    key={t.id}
                    disabled={isDisabled}
                    onClick={() => handleQuickBid(t, currentInc)}
                    className={`p-3 pl-4 rounded-2xl text-left transition border relative overflow-hidden ${
                      isDisabled
                        ? 'bg-slate-950/50 border-slate-850 opacity-40 cursor-not-allowed'
                        : isCurrentLeading
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/50 scale-[1.02]'
                          : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-white active:scale-95 cursor-pointer'
                    }`}
                  >
                    {/* Vertical Team Color Ribbon Accent */}
                    <div 
                      className="absolute top-0 bottom-0 left-0 w-1.5 transition-all duration-300" 
                      style={{ 
                        backgroundColor: t.color || '#00f2fe',
                        boxShadow: `0 0 12px ${t.color || '#00f2fe'}` 
                      }} 
                    />
                    <div className="text-xl mb-1">{t.logo}</div>
                    <span className="font-bold text-white text-xs block truncate">{t.shortName}</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      {isSoldOut ? 'SOLD' : `+${currentInc} PTS`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Hammer Sold Button or Sold Out Banner */}
            {isSoldOut ? (
              <div className="w-full py-4 rounded-2xl font-black text-lg uppercase tracking-widest bg-rose-950/60 text-rose-300 border border-rose-500/40 flex items-center justify-center space-x-2 text-center shadow-lg">
                <CheckCircle2 className="w-6 h-6 text-rose-400" />
                <span>PLAYER SOLD OUT TO {buyerTeamObj?.name || 'TEAM'}</span>
              </div>
            ) : canSell ? (
              <button
                onClick={handleSold}
                disabled={isProcessing || !leadingTeamObj}
                className={`w-full py-5 rounded-2xl font-black text-xl uppercase tracking-widest transition flex items-center justify-center space-x-3 shadow-2xl cursor-pointer ${
                  leadingTeamObj
                    ? 'bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-slate-950 hover:scale-[1.02] shadow-[0_0_30px_rgba(0,242,254,0.45)]'
                    : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
                }`}
              >
                <Gavel className="w-7 h-7 transform -rotate-45 text-slate-950" />
                <span>HAMMER SOLD (₹{currentBid} PTS)</span>
              </button>
            ) : (
              <div className="w-full py-4 rounded-2xl font-bold text-sm bg-slate-900/90 text-slate-400 border border-slate-800 flex items-center justify-center space-x-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <span>SUPER ADMIN ONLY (HAMMER SOLD)</span>
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

      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-mono z-10 border-t border-slate-800/80 pt-3">
        <span>Nyati Era Dhanori Box Cricket League · 2026 Onwards</span>
        <span>Final Decision: Harish & Santosh</span>
      </div>

    </div>
  );
}
