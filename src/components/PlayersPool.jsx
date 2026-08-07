import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  Plus, 
  ExternalLink, 
  Award, 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  X,
  Filter,
  Lock,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function PlayersPool({ players, setPlayers, teams, setTeams }) {
  const { can } = useAuth();
  const canAdd = can('canAddPlayers');
  const canDelete = can('canDeletePlayers');

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

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

  const handleDeletePlayer = (playerToDelete) => {
    if (!canDelete) return;
    if (window.confirm(`Are you sure you want to delete player "${playerToDelete.name}" from the roster?`)) {
      setPlayers(prev => prev.filter(p => p.id !== playerToDelete.id));

      if (playerToDelete.status === 'sold' && playerToDelete.soldTo && setTeams) {
        setTeams(prevTeams => prevTeams.map(t => {
          if (t.id === playerToDelete.soldTo) {
            const updatedSquad = (t.squad || []).filter(p => p.id !== playerToDelete.id);
            const refundedPrice = playerToDelete.soldPrice || 0;
            return {
              ...t,
              spentPurse: Math.max(0, t.spentPurse - refundedPrice),
              playersCount: Math.max(0, (t.playersCount || 1) - 1),
              squad: updatedSquad,
            };
          }
          return t;
        }));
      }
    }
  };

  const selectClass = "w-full bg-warm-900 border border-warm-700 rounded-xl px-3 py-2.5 text-xs text-sand-300 focus:outline-none focus:border-terracotta-500 transition appearance-none cursor-pointer";

  return (
    <div className="space-y-6">
      
      {/* ── Header + Filters ── */}
      <div className="glass-panel p-6 rounded-3xl border border-warm-700/50 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-sand-100 flex items-center gap-2 font-serif">
              <Sparkles className="w-6 h-6 text-[#c9a227]" />
              Nyati Era Dhanori Player Roster
            </h2>
            <p className="text-sand-500 text-xs mt-0.5">
              {players.length} players · {players.filter(p => p.status === 'sold').length} sold · {players.filter(p => p.status === 'available').length} available
            </p>
          </div>

          {canAdd ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-terracotta-600/20 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Player</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-sand-600 bg-warm-900 px-3 py-2 rounded-xl border border-warm-700">
              <Lock className="w-3 h-3" />
              View Only
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-sand-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search players…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-warm-900 border border-warm-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-sand-100 placeholder-sand-600 focus:outline-none focus:border-terracotta-500 transition"
            />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className={selectClass}>
            <option value="All">All Roles</option>
            <option value="All-Rounder">All-Rounders</option>
            <option value="Batsman">Batsmen</option>
            <option value="Bowler">Bowlers</option>
            <option value="Keeper">Wicket Keepers</option>
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={selectClass}>
            <option value="All">All Categories</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Master (7-10 yrs)">Master (7-10 yrs)</option>
            <option value="Super Master (11-13 yrs)">Super Master (11-13 yrs)</option>
            <option value="Icon">Icon Players</option>
            <option value="Category A">Category A</option>
            <option value="Category B">Category B</option>
            <option value="Category C">Category C</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="All">All Status</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
            <option value="unsold">Unsold</option>
          </select>
        </div>
      </div>

      {/* ── Player Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredPlayers.map(player => {
          const buyerTeam = teams.find(t => t.id === player.soldTo);
          return (
            <div
              key={player.id}
              className="glass-card p-5 rounded-2xl border border-warm-700/50 glass-card-hover flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              {/* Status stripe */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                player.status === 'sold' ? 'bg-terracotta-600' : 
                player.status === 'unsold' ? 'bg-warm-600' : 'bg-cricket-emerald'
              }`} />

              {/* Avatar + Name */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={player.avatarUrl}
                      alt={player.name}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-warm-700 bg-warm-900 flex-shrink-0"
                      onError={e => { e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'; }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h3 className="font-bold text-sand-100 text-sm truncate">{player.name}</h3>
                        <a href={player.cricHeroesUrl} target="_blank" rel="noreferrer" className="text-[#c9a227] hover:text-[#f5c842] flex-shrink-0">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <span className="text-[11px] text-terracotta-300 font-semibold">{player.role}</span>
                      <span className="block text-[10px] text-[#c9a227] font-mono">{player.category}</span>
                    </div>
                  </div>

                  {/* Super Admin Delete Player Button */}
                  {canDelete && (
                    <button
                      onClick={() => handleDeletePlayer(player)}
                      className="p-1.5 rounded-lg bg-warm-900/80 hover:bg-red-950/80 text-sand-600 hover:text-red-400 border border-warm-700/60 hover:border-red-500/40 transition shrink-0 ml-1"
                      title={`Delete ${player.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Stats grid */}
                <div className="mt-4 grid grid-cols-3 gap-1 bg-warm-950/60 p-2.5 rounded-xl border border-warm-800/50 text-center">
                  {[
                    { label: 'Matches', value: player.matches, color: 'text-sand-200' },
                    { label: 'Runs', value: player.runs, color: 'text-cricket-emerald' },
                    { label: 'Wkts', value: player.wickets, color: 'text-terracotta-400' },
                  ].map((s, i) => (
                    <div key={i} className={i > 0 ? 'border-l border-warm-800' : ''}>
                      <span className="text-[9px] uppercase text-sand-600 block">{s.label}</span>
                      <span className={`text-xs font-bold ${s.color}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-warm-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-sand-600 font-mono block">Base Price</span>
                  <span className="text-xs font-bold text-sand-300 font-mono">₹{player.basePrice}</span>
                </div>
                <div>
                  {player.status === 'sold' && buyerTeam ? (
                    <span className="badge-sold">
                      <CheckCircle2 className="w-3 h-3" />
                      {buyerTeam.shortName} ₹{player.soldPrice}
                    </span>
                  ) : player.status === 'unsold' ? (
                    <span className="badge-unsold">
                      <XCircle className="w-3 h-3" />
                      Unsold
                    </span>
                  ) : (
                    <span className="badge-available">
                      <span className="w-1.5 h-1.5 rounded-full bg-cricket-emerald animate-pulse" />
                      Available
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredPlayers.length === 0 && (
          <div className="col-span-full py-16 text-center glass-panel rounded-3xl border border-warm-700/50">
            <div className="text-4xl mb-4">🏏</div>
            <p className="text-sand-500 text-sm">No players match your filters</p>
          </div>
        )}
      </div>

      {/* ── Add Player Modal ── */}
      {showAddModal && canAdd && createPortal(
        <div className="fixed inset-0 z-[100] bg-warm-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="warm-card w-full max-w-xl p-6 sm:p-8 rounded-3xl border border-warm-700/60 space-y-6 relative max-h-[90vh] overflow-y-auto shadow-2xl my-auto">
            
            <div className="flex items-center justify-between border-b border-warm-700/50 pb-4">
              <h3 className="text-xl font-black text-sand-100 flex items-center gap-2 font-serif">
                <UserPlus className="w-5 h-5 text-terracotta-400" />
                Add Player to Roster
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPlayerSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Player Full Name</label>
                  <input
                    type="text" required placeholder="e.g. Ramesh Patil"
                    value={newPlayer.name}
                    onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
                    className="warm-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Primary Role</label>
                  <select value={newPlayer.role} onChange={e => setNewPlayer({ ...newPlayer, role: e.target.value })} className="warm-input">
                    <option>Batting All-Rounder</option>
                    <option>Bowling All-Rounder</option>
                    <option>Wicket Keeper Batsman</option>
                    <option>Pure Batsman</option>
                    <option>Fast Bowler</option>
                    <option>Spin Bowler</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Category</label>
                  <select 
                    value={newPlayer.category} 
                    onChange={e => {
                      const cat = e.target.value;
                      let defaultAvatar = '/avatars/male.png';
                      let defaultBase = 300;
                      if (cat === 'Female') { defaultAvatar = '/avatars/female.png'; defaultBase = 400; }
                      else if (cat === 'Master (7-10 yrs)') { defaultAvatar = '/avatars/master.png'; defaultBase = 200; }
                      else if (cat === 'Super Master (11-13 yrs)') { defaultAvatar = '/avatars/super_master.png'; defaultBase = 300; }
                      else if (cat === 'Icon') { defaultBase = 500; }
                      else if (cat === 'Category A') { defaultBase = 400; }
                      setNewPlayer({ ...newPlayer, category: cat, avatarUrl: defaultAvatar, basePrice: defaultBase });
                    }} 
                    className="warm-input"
                  >
                    <option value="Male">Male (Adult)</option>
                    <option value="Female">Female (Adult)</option>
                    <option value="Master (7-10 yrs)">Master (7-10 yrs)</option>
                    <option value="Super Master (11-13 yrs)">Super Master (11-13 yrs)</option>
                    <option value="Icon">Icon (Base: 500 PTS)</option>
                    <option value="Category A">Category A (400 PTS)</option>
                    <option value="Category B">Category B (300 PTS)</option>
                    <option value="Category C">Category C (200 PTS)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Base Price (PTS)</label>
                  <input
                    type="number" value={newPlayer.basePrice}
                    onChange={e => setNewPlayer({ ...newPlayer, basePrice: e.target.value })}
                    className="warm-input font-mono"
                  />
                </div>
              </div>

              {/* Photo Avatar Preset Picker */}
              <div>
                <label className="text-xs font-semibold text-sand-400 block mb-1.5">Generalized Player Photo Avatar</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[
                    { id: 'male', label: 'Male', url: '/avatars/male.png', icon: '👨' },
                    { id: 'female', label: 'Female', url: '/avatars/female.png', icon: '👩' },
                    { id: 'master', label: 'Master (7-10)', url: '/avatars/master.png', icon: '👦' },
                    { id: 'super_master', label: 'Super Master (11-13)', url: '/avatars/super_master.png', icon: '🧢' },
                  ].map(av => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setNewPlayer({ ...newPlayer, avatarUrl: av.url })}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                        newPlayer.avatarUrl === av.url
                          ? 'bg-terracotta-600/30 border-terracotta-500 ring-2 ring-terracotta-500/40'
                          : 'bg-warm-900 border-warm-800 hover:border-warm-700'
                      }`}
                    >
                      <img src={av.url} alt={av.label} className="w-10 h-10 rounded-lg object-cover border border-warm-700" />
                      <span className="text-[10px] font-semibold text-sand-200 text-center leading-tight">{av.icon} {av.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {['matches', 'runs', 'wickets'].map(field => (
                  <div key={field}>
                    <label className="text-xs font-semibold text-sand-400 block mb-1.5 capitalize">{field}</label>
                    <input
                      type="number" value={newPlayer[field]}
                      onChange={e => setNewPlayer({ ...newPlayer, [field]: e.target.value })}
                      className="warm-input"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-sand-400 block mb-1.5">CricHeroes Profile URL</label>
                <input
                  type="url" placeholder="https://cricheroes.com/player-profile/..."
                  value={newPlayer.cricHeroesUrl}
                  onChange={e => setNewPlayer({ ...newPlayer, cricHeroesUrl: e.target.value })}
                  className="warm-input"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-warm-700/50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Add Player
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
