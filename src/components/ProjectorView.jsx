import React from 'react';
import confetti from 'canvas-confetti';
import { Gavel, XCircle, Tv, ExternalLink, Award, Shield } from 'lucide-react';
import { soundFx } from '../utils/audio';

export default function ProjectorView({ 
  players, 
  setPlayers, 
  teams, 
  setTeams, 
  onClose 
}) {
  const activePlayer = players.find(p => p.status === 'available') || players[0];

  const handleQuickBid = (team, increment) => {
    if (!activePlayer) return;
    const curBid = activePlayer.currentBid || activePlayer.basePrice;
    const nextBid = curBid + increment;

    soundFx.playBid();

    setPlayers(prev => prev.map(p => {
      if (p.id === activePlayer.id) {
        return { ...p, currentBid: nextBid, leadingTeam: team.id };
      }
      return p;
    }));
  };

  const handleSold = () => {
    if (!activePlayer || !activePlayer.leadingTeam) return;

    soundFx.playSold();
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5 }
    });

    const buyerTeam = teams.find(t => t.id === activePlayer.leadingTeam);
    const finalPrice = activePlayer.currentBid || activePlayer.basePrice;

    setPlayers(prev => prev.map(p => {
      if (p.id === activePlayer.id) {
        return { ...p, status: 'sold', soldPrice: finalPrice, soldTo: buyerTeam.id };
      }
      return p;
    }));

    setTeams(prev => prev.map(t => {
      if (t.id === buyerTeam.id) {
        return {
          ...t,
          spentPurse: t.spentPurse + finalPrice,
          playersCount: (t.playersCount || 0) + 1,
          squad: [...(t.squad || []), { ...activePlayer, soldPrice: finalPrice }]
        };
      }
      return t;
    }));
  };

  const leadingTeamObj = activePlayer ? teams.find(t => t.id === activePlayer.leadingTeam) : null;
  const currentBid = activePlayer ? (activePlayer.currentBid || activePlayer.basePrice) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-warm-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-terracotta-600/8 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Top Header Controls */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-terracotta-600 text-white flex items-center justify-center font-bold">
            <Gavel className="w-6 h-6 transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-wider gradient-text-brand font-display uppercase">
                NYATI ERA PREMIER LEAGUE 2026+
              </h1>
              <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-serif font-bold shadow-[0_0_12px_rgba(121,40,202,0.3)]">
                कर्मण्येवाधिकारस्ते
              </span>
            </div>
            <p className="text-xs text-cyan-400 font-mono font-bold tracking-widest uppercase">
              LIVE AUCTION PROJECTOR SCREEN · © 2026 ONWARDS
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-warm-900 hover:bg-warm-800 text-sand-300 border border-warm-700 text-xs font-bold uppercase transition"
        >
          <Tv className="w-4 h-4 text-terracotta-400" />
          <span>Exit TV Mode</span>
        </button>
      </div>

      {/* Main Theater Bidding Display */}
      {activePlayer ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10 max-w-7xl mx-auto w-full my-auto">
          
          {/* Player Photo Card */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative">
              <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden border-4 border-terracotta-500/50 shadow-[0_0_50px_rgba(212,98,42,0.25)] bg-slate-900">
                <img
                  src={activePlayer.avatarUrl}
                  alt={activePlayer.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                  }}
                />
              </div>
              <div className="absolute top-4 left-4 bg-slate-950/90 backdrop-blur-md px-4 py-1.5 rounded-xl border border-[#c9a227]/50 text-[#c9a227] font-black text-sm uppercase">
                {activePlayer.category}
              </div>
            </div>
            
            <a
              href={activePlayer.cricHeroesUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center space-x-2 text-xs text-[#c9a227] hover:text-[#f5c842] font-bold bg-warm-900 px-4 py-2 rounded-xl border border-[#c9a227]/30"
            >
              <span>Verified CricHeroes.com Player Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Huge Bidding Numbers & Team Buttons */}
          <div className="lg:col-span-7 space-y-6">
            
            <div>
              <span className="px-3 py-1 rounded-full bg-terracotta-600/15 text-terracotta-300 font-bold text-xs border border-terracotta-500/25">
                {activePlayer.role}
              </span>
              <h2 className="text-4xl sm:text-6xl font-black text-white mt-2 tracking-tight">
                {activePlayer.name}
              </h2>
            </div>

            {/* Price Box */}
            <div className="bg-warm-900/90 backdrop-blur-xl p-6 rounded-3xl border border-warm-700/50 shadow-2xl flex items-center justify-between">
              <div>
                <span className="text-sand-500 text-xs font-bold uppercase tracking-wider block">Base Price</span>
                <span className="text-2xl font-bold text-sand-300 font-mono">₹{activePlayer.basePrice} PTS</span>
              </div>
              <div className="text-right">
                <span className="text-[#c9a227] text-xs font-extrabold uppercase tracking-widest block">CURRENT HIGH BID</span>
                <span className="text-5xl sm:text-6xl font-black text-[#c9a227] font-mono drop-shadow-[0_0_25px_rgba(201,162,39,0.5)]">
                  ₹{currentBid} PTS
                </span>
              </div>
            </div>

            {/* Leading Team Banner */}
            {leadingTeamObj ? (
              <div className="p-5 rounded-2xl bg-[#c9a227]/15 border-2 border-[#c9a227] flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-4xl">{leadingTeamObj.logo}</span>
                  <div>
                    <span className="text-xs uppercase text-[#c9a227] font-bold block">CURRENT HIGHEST BIDDER</span>
                    <span className="text-2xl font-black text-white">{leadingTeamObj.name}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center rounded-2xl bg-warm-900/60 border border-dashed border-warm-700 text-sand-500 text-sm">
                Waiting for opening bid...
              </div>
            )}

            {/* Team Bidding Control Suite */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleQuickBid(t, 100)}
                  className="p-3 rounded-2xl bg-warm-900 hover:bg-warm-800 border border-warm-700 text-left transition active:scale-95"
                >
                  <div className="text-xl mb-1">{t.logo}</div>
                  <span className="font-bold text-white text-xs block truncate">{t.shortName}</span>
                  <span className="text-[10px] text-cricket-emerald font-mono font-bold">+100 PTS</span>
                </button>
              ))}
            </div>

            {/* Hammer Sold Button */}
            <button
              onClick={handleSold}
              disabled={!leadingTeamObj}
              className={`w-full py-5 rounded-2xl font-black text-xl uppercase tracking-widest transition flex items-center justify-center space-x-3 shadow-2xl ${
                leadingTeamObj
                  ? 'bg-gradient-to-r from-terracotta-600 via-terracotta-500 to-terracotta-600 text-white hover:scale-[1.02] shadow-terracotta-600/40'
                  : 'bg-warm-900 text-sand-600 cursor-not-allowed border border-warm-700'
              }`}
            >
              <Gavel className="w-7 h-7 transform -rotate-45" />
              <span>HAMMER SOLD (₹{currentBid} PTS)</span>
            </button>

          </div>

        </div>
      ) : (
        <div className="text-center space-y-4 my-auto z-10">
          <h2 className="text-4xl font-black text-white">ALL PLAYERS AUCTIONED!</h2>
          <p className="text-sand-500">Exit TV mode to view final squads and match schedule.</p>
        </div>
      )}

      {/* Footer info */}
      <div className="flex items-center justify-between text-xs text-sand-600 font-mono z-10 border-t border-warm-800/50 pt-4">
        <span>Nyati Era Dhanori Box Cricket League</span>
        <span>Final Decision: Harish & Santosh</span>
      </div>

    </div>
  );
}
