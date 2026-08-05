import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  ExternalLink, 
  Award, 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  X
} from 'lucide-react';

export default function PlayersPool({ players, setPlayers, teams }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Player Form state
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    role: 'Batting All-Rounder',
    category: 'Category B',
    basePrice: 300,
    matches: 10,
    runs: 150,
    avg: 15.0,
    strikeRate: 130.0,
    wickets: 5,
    economy: 7.0,
    bestBowling: '2/15',
    cricHeroesUrl: 'https://cricheroes.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'
  });

  // Filter logic
  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || p.role.includes(roleFilter);
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesRole && matchesStatus && matchesCat;
  });

  const handleAddPlayerSubmit = (e) => {
    e.preventDefault();
    if (!newPlayer.name.trim()) return;

    const createdPlayer = {
      ...newPlayer,
      id: `ply-${Date.now()}`,
      basePrice: Number(newPlayer.basePrice),
      matches: Number(newPlayer.matches),
      runs: Number(newPlayer.runs),
      wickets: Number(newPlayer.wickets),
      status: 'available',
      soldPrice: 0,
      soldTo: null
    };

    setPlayers(prev => [createdPlayer, ...prev]);
    setShowAddModal(false);
    setNewPlayer({
      name: '',
      role: 'Batting All-Rounder',
      category: 'Category B',
      basePrice: 300,
      matches: 10,
      runs: 150,
      avg: 15.0,
      strikeRate: 130.0,
      wickets: 5,
      economy: 7.0,
      bestBowling: '2/15',
      cricHeroesUrl: 'https://cricheroes.com',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'
    });
  };

  return (
    <div className="space-y-8">
      
      {/* Top Header & Search Control Bar */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              Nyati Era Dhanori Player Roster
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Explore player profiles verified from CricHeroes.com only for Nyati Era Dhanori residents.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Nyati Player</span>
          </button>
        </div>

        {/* Filters and Search Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by player name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All Primary Roles</option>
              <option value="All-Rounder">All-Rounders</option>
              <option value="Batsman">Batsmen</option>
              <option value="Bowler">Bowlers</option>
              <option value="Keeper">Wicket Keepers</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All Categories</option>
              <option value="Icon">Icon Players</option>
              <option value="Category A">Category A</option>
              <option value="Category B">Category B</option>
              <option value="Category C">Category C</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All Auction Status</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="unsold">Unsold</option>
            </select>
          </div>

        </div>

      </div>

      {/* Players Directory Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPlayers.map((player) => {
          const buyerTeam = teams.find(t => t.id === player.soldTo);

          return (
            <div
              key={player.id}
              className="glass-card p-5 rounded-2xl border border-slate-800 glass-card-hover flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              {/* Card Header: Avatar & Category */}
              <div>
                <div className="flex items-center space-x-3">
                  <img
                    src={player.avatarUrl}
                    alt={player.name}
                    className="w-14 h-14 rounded-xl object-cover border-2 border-slate-700 bg-slate-900"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <h3 className="font-bold text-white text-sm">{player.name}</h3>
                      <a
                        href={player.cricHeroesUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:text-amber-300"
                        title="Open CricHeroes Profile"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-semibold">{player.role}</span>
                    <span className="block text-[10px] text-amber-400 font-mono">{player.category}</span>
                  </div>
                </div>

                {/* Player Quick Stats */}
                <div className="mt-4 grid grid-cols-3 gap-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 block">Matches</span>
                    <span className="text-xs font-bold text-white">{player.matches}</span>
                  </div>
                  <div className="border-l border-slate-800">
                    <span className="text-[9px] uppercase text-slate-400 block">Runs</span>
                    <span className="text-xs font-bold text-emerald-400">{player.runs}</span>
                  </div>
                  <div className="border-l border-slate-800">
                    <span className="text-[9px] uppercase text-slate-400 block">Wkts</span>
                    <span className="text-xs font-bold text-cyan-400">{player.wickets}</span>
                  </div>
                </div>
              </div>

              {/* Status & Price Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono block">Base Price</span>
                  <span className="text-xs font-bold text-slate-200 font-mono">₹{player.basePrice}</span>
                </div>

                <div>
                  {player.status === 'sold' && buyerTeam ? (
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase border border-emerald-500/30">
                        {buyerTeam.shortName} (₹{player.soldPrice})
                      </span>
                    </div>
                  ) : player.status === 'unsold' ? (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold text-[10px] uppercase">
                      UNSOLD
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase border border-amber-500/30">
                      AVAILABLE
                    </span>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add Custom Player Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Add Nyati Era Dhanori Player
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPlayerSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Player Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={newPlayer.name}
                    onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Primary Role</label>
                  <select
                    value={newPlayer.role}
                    onChange={(e) => setNewPlayer({ ...newPlayer, role: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-emerald-500 outline-none"
                  >
                    <option value="Batting All-Rounder">Batting All-Rounder</option>
                    <option value="Bowling All-Rounder">Bowling All-Rounder</option>
                    <option value="Wicket Keeper Batsman">Wicket Keeper Batsman</option>
                    <option value="Pure Batsman">Pure Batsman</option>
                    <option value="Fast Bowler">Fast Bowler</option>
                    <option value="Spin Bowler">Spin Bowler</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={newPlayer.category}
                    onChange={(e) => setNewPlayer({ ...newPlayer, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-emerald-500 outline-none"
                  >
                    <option value="Icon">Icon (Base: 500 PTS)</option>
                    <option value="Category A">Category A (Base: 400 PTS)</option>
                    <option value="Category B">Category B (Base: 300 PTS)</option>
                    <option value="Category C">Category C (Base: 200 PTS)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Base Auction Price (PTS)</label>
                  <input
                    type="number"
                    required
                    value={newPlayer.basePrice}
                    onChange={(e) => setNewPlayer({ ...newPlayer, basePrice: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Matches</label>
                  <input
                    type="number"
                    value={newPlayer.matches}
                    onChange={(e) => setNewPlayer({ ...newPlayer, matches: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Runs</label>
                  <input
                    type="number"
                    value={newPlayer.runs}
                    onChange={(e) => setNewPlayer({ ...newPlayer, runs: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Wickets</label>
                  <input
                    type="number"
                    value={newPlayer.wickets}
                    onChange={(e) => setNewPlayer({ ...newPlayer, wickets: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">CricHeroes Profile URL</label>
                <input
                  type="url"
                  placeholder="https://cricheroes.com/player-profile/nyati-era-dhanori/player-name"
                  value={newPlayer.cricHeroesUrl}
                  onChange={(e) => setNewPlayer({ ...newPlayer, cricHeroesUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400"
                >
                  Add Player to Pool
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
