import React from 'react';
import { Users, Shield, Award, ExternalLink, AlertTriangle, CheckCircle2, User } from 'lucide-react';

export default function TeamsView({ teams, players }) {
  return (
    <div className="space-y-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-400" />
            Team Squads & Purse Balance
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Track team purses, squad composition (8 players max per squad, 6 allowed on ground), and spent funds.
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-slate-300">
            Initial Purse: <strong className="text-amber-400">₹10,000 PTS</strong>
          </div>
          <div className="bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-slate-300">
            Squad Cap: <strong className="text-emerald-400">8 Players / Team</strong>
          </div>
        </div>
      </div>

      {/* Grid of Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {teams.map((team) => {
          const squad = team.squad || [];
          const remainingPurse = team.totalPurse - team.spentPurse;
          const isFull = squad.length >= 8;

          // Role counters
          const battersCount = squad.filter(p => p.role.includes('Batsman') || p.role.includes('Pure')).length;
          const bowlersCount = squad.filter(p => p.role.includes('Bowler') || p.role.includes('Spin') || p.role.includes('Fast')).length;
          const allRoundersCount = squad.filter(p => p.role.includes('All-Rounder')).length;
          const wkCount = squad.filter(p => p.role.includes('Keeper')).length;

          return (
            <div
              key={team.id}
              className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6 relative overflow-hidden flex flex-col justify-between"
            >
              {/* Top Accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: team.color }}
              ></div>

              <div>
                {/* Team Card Title Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl p-2 bg-slate-900/80 rounded-2xl border border-slate-800">
                      {team.logo}
                    </span>
                    <div>
                      <h3 className="text-xl font-extrabold text-white tracking-wide">
                        {team.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        Owner: <strong className="text-slate-200">{team.owner}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Squad Status Tag */}
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wider ${
                      isFull
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {squad.length} / 8 Squad
                  </span>
                </div>

                {/* Purse Progress & Stats */}
                <div className="mt-5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Total Purse</span>
                      <span className="text-sm font-bold text-white font-mono">₹{team.totalPurse}</span>
                    </div>
                    <div className="border-l border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Spent</span>
                      <span className="text-sm font-bold text-red-400 font-mono">₹{team.spentPurse}</span>
                    </div>
                    <div className="border-l border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold block">Remaining</span>
                      <span className="text-base font-black text-emerald-400 font-mono">₹{remainingPurse}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-300"
                      style={{ width: `${(remainingPurse / team.totalPurse) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Role Breakdown Badges */}
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    Batters: <strong className="text-white">{battersCount}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    Bowlers: <strong className="text-white">{bowlersCount}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    All-Rounders: <strong className="text-white">{allRoundersCount}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    Wicketkeepers: <strong className="text-white">{wkCount}</strong>
                  </span>
                </div>

                {/* Acquired Player Roster */}
                <div className="mt-6 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Acquired Players ({squad.length})</span>
                    {squad.length < 8 && (
                      <span className="text-amber-400 text-[10px] font-mono">
                        Needs {8 - squad.length} more player(s)
                      </span>
                    )}
                  </h4>

                  {squad.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {squad.map((player) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition"
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              src={player.avatarUrl}
                              alt={player.name}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-700"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <h5 className="font-bold text-white text-xs">{player.name}</h5>
                                <a
                                  href={player.cricHeroesUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-amber-400 hover:text-amber-300"
                                  title="View CricHeroes profile"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                              <p className="text-[10px] text-slate-400">{player.role}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-extrabold text-emerald-400 text-xs font-mono">
                              ₹{player.soldPrice} PTS
                            </span>
                            <span className="block text-[9px] text-slate-500 uppercase">{player.category}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-slate-500 text-xs font-mono">
                      No players acquired yet. Bids won during auction will show up here.
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Ground Rule Warning */}
              <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Playing XI: Max 6 on field at any time
                </span>
                <span className="text-amber-400 font-medium">Captain rotation required</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
