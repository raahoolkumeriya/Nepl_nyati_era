import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  Shield, 
  Award, 
  ExternalLink, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  UserCheck,
  Lock,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function TeamsView({ teams, setTeams, players, setPlayers }) {
  const { can, usersList } = useAuth();
  const canManage = can('canManageTeams');

  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // Auctioneers list for owner/captain assignment
  const auctioneers = usersList ? usersList.filter(u => u.role === 'auctioneer' || u.role === 'superuser') : [];

  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    owner: '',
    logo: '🏏',
    totalPurse: 10000,
    color: '#d4622a',
  });

  const LOGO_OPTIONS = ['🏏', '🦁', '⚡', '👑', '🦅', '⚔️', '🔥', '🛡️', '🎯', '🐯'];
  const COLOR_OPTIONS = ['#d4622a', '#c9a227', '#10b981', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316', '#3b82f6'];

  const openCreateModal = () => {
    setEditingTeam(null);
    setFormData({
      name: '',
      shortName: '',
      owner: auctioneers[0]?.name || 'Auctioneer Captain',
      logo: '🏏',
      totalPurse: 10000,
      color: '#d4622a',
    });
    setShowModal(true);
  };

  const openEditModal = (team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      shortName: team.shortName,
      owner: team.owner,
      logo: team.logo || '🏏',
      totalPurse: team.totalPurse || 10000,
      color: team.color || '#d4622a',
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingTeam) {
      // Update existing team
      setTeams(prev => prev.map(t => t.id === editingTeam.id ? {
        ...t,
        name: formData.name.trim(),
        shortName: formData.shortName.trim().toUpperCase() || formData.name.substring(0, 3).toUpperCase(),
        owner: formData.owner.trim(),
        logo: formData.logo,
        totalPurse: Number(formData.totalPurse),
        color: formData.color,
      } : t));
    } else {
      // Create new team
      const newTeam = {
        id: `team-${Date.now()}`,
        name: formData.name.trim(),
        shortName: formData.shortName.trim().toUpperCase() || formData.name.substring(0, 3).toUpperCase(),
        owner: formData.owner.trim(),
        logo: formData.logo,
        color: formData.color,
        gradient: `from-[${formData.color}]/20 to-warm-900`,
        borderColor: `border-[${formData.color}]/40`,
        bgBadge: `bg-[${formData.color}]/20`,
        totalPurse: Number(formData.totalPurse),
        spentPurse: 0,
        playersCount: 0,
        squad: [],
      };
      setTeams(prev => [...prev, newTeam]);
    }

    setShowModal(false);
  };

  const handleDeleteTeam = (teamToDelete) => {
    if (!canManage) return;
    if (window.confirm(`Are you sure you want to delete team "${teamToDelete.name}"? All acquired squad members will be returned to the Available pool.`)) {
      // 1. Remove team
      setTeams(prev => prev.filter(t => t.id !== teamToDelete.id));

      // 2. Return sold players to available pool
      if (setPlayers) {
        setPlayers(prev => prev.map(p => {
          if (p.soldTo === teamToDelete.id) {
            return {
              ...p,
              status: 'available',
              soldPrice: 0,
              soldTo: null,
            };
          }
          return p;
        }));
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-warm-700/50">
        <div>
          <h2 className="text-2xl font-black text-sand-100 flex items-center gap-2.5 font-serif">
            <Users className="w-7 h-7 text-terracotta-400" />
            Team Squads & Purse Balance
          </h2>
          <p className="text-sand-500 text-xs mt-1">
            {teams.length} Teams registered · Track team purses, auctioneer captains, and squad compositions.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          {canManage ? (
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-terracotta-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Team</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-sand-600 bg-warm-900 px-3 py-2 rounded-xl border border-warm-700 font-sans">
              <Lock className="w-3.5 h-3.5" />
              View Only
            </span>
          )}
        </div>
      </div>

      {/* ── Teams Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.map(team => {
          const squad = team.squad || [];
          const remainingPurse = team.totalPurse - team.spentPurse;
          const isFull = squad.length >= 8;
          const battersCount = squad.filter(p => p.role.includes('Batsman') || p.role.includes('Pure')).length;
          const bowlersCount = squad.filter(p => p.role.includes('Bowler') || p.role.includes('Spin') || p.role.includes('Fast')).length;
          const allRoundersCount = squad.filter(p => p.role.includes('All-Rounder')).length;
          const wkCount = squad.filter(p => p.role.includes('Keeper')).length;

          return (
            <div
              key={team.id}
              className="glass-panel p-6 rounded-3xl border border-warm-700/50 space-y-5 relative overflow-hidden flex flex-col justify-between"
            >
              {/* Team color top bar */}
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: team.color || '#d4622a' }} />

              <div>
                {/* Team header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl p-2.5 bg-warm-900/80 rounded-2xl border border-warm-700">
                      {team.logo}
                    </span>
                    <div>
                      <h3 className="text-xl font-extrabold text-sand-100 tracking-tight font-serif flex items-center gap-2">
                        {team.name}
                        <span className="text-xs font-mono text-sand-500 font-normal">({team.shortName})</span>
                      </h3>
                      <p className="text-xs text-sand-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <UserCheck className="w-3.5 h-3.5 text-[#c9a227]" />
                        Captain: <strong className="text-sand-200 font-sans">{team.owner}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wider ${
                      isFull
                        ? 'bg-cricket-emerald/15 text-cricket-emerald border border-cricket-emerald/30'
                        : 'bg-[#c9a227]/15 text-[#c9a227] border border-[#c9a227]/30'
                    }`}>
                      {squad.length}/8
                    </span>

                    {/* Super Admin Controls: Edit Captain / Delete Team */}
                    {canManage && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditModal(team)}
                          className="p-1.5 rounded-lg bg-warm-900 hover:bg-warm-800 text-sand-400 hover:text-sand-200 border border-warm-700 transition"
                          title="Edit Team & Set Auctioneer Captain"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team)}
                          className="p-1.5 rounded-lg bg-warm-900 hover:bg-red-950/80 text-sand-500 hover:text-red-400 border border-warm-700 hover:border-red-500/40 transition"
                          title={`Delete team ${team.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Purse Stats */}
                <div className="mt-5 bg-warm-950/60 p-4 rounded-2xl border border-warm-800/60 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'Total', value: `₹${team.totalPurse}`, color: 'text-sand-200' },
                      { label: 'Spent', value: `₹${team.spentPurse}`, color: 'text-cricket-crimson' },
                      { label: 'Remaining', value: `₹${remainingPurse}`, color: 'text-cricket-emerald' },
                    ].map((s, i) => (
                      <div key={i} className={i > 0 ? 'border-l border-warm-800' : ''}>
                        <span className="text-sand-600 text-[9px] uppercase font-semibold block">{s.label}</span>
                        <span className={`text-sm font-black ${s.color} font-mono`}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-full bg-warm-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cricket-emerald to-[#c9a227] transition-all duration-500"
                      style={{ width: `${Math.max(0, Math.min(100, (remainingPurse / team.totalPurse) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Role breakdown */}
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold">
                  {[
                    { label: 'Batters', count: battersCount },
                    { label: 'Bowlers', count: bowlersCount },
                    { label: 'All-Rounders', count: allRoundersCount },
                    { label: 'WK', count: wkCount },
                  ].map(r => (
                    <span key={r.label} className="px-2.5 py-1 rounded-lg bg-warm-900 border border-warm-700 text-sand-400">
                      {r.label}: <strong className="text-sand-200">{r.count}</strong>
                    </span>
                  ))}
                </div>

                {/* Squad roster */}
                <div className="mt-5 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sand-500 flex items-center justify-between">
                    <span>Acquired Players ({squad.length})</span>
                    {squad.length < 8 && (
                      <span className="text-[#c9a227] text-[10px] font-mono">
                        Needs {8 - squad.length} more
                      </span>
                    )}
                  </h4>

                  {squad.length > 0 ? (
                    <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                      {squad.map(player => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-warm-900/80 border border-warm-800/60 hover:border-warm-700 transition"
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              src={player.avatarUrl}
                              alt={player.name}
                              className="w-9 h-9 rounded-lg object-cover border border-warm-700"
                              onError={e => { e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'; }}
                            />
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <h5 className="font-bold text-sand-100 text-xs">{player.name}</h5>
                                <a href={player.cricHeroesUrl} target="_blank" rel="noreferrer" className="text-[#c9a227] hover:text-[#f5c842]">
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                              <p className="text-[10px] text-sand-500">{player.role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-cricket-emerald text-xs font-mono">₹{player.soldPrice} PTS</span>
                            <span className="block text-[9px] text-sand-600 uppercase">{player.category}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center rounded-xl bg-warm-950/40 border border-dashed border-warm-700 text-sand-600 text-xs font-mono">
                      No players acquired yet. Bids won during auction will appear here.
                    </div>
                  )}
                </div>
              </div>

              {/* Ground rule footer */}
              <div className="pt-4 border-t border-warm-800/50 flex items-center justify-between text-[10px] text-sand-600">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-cricket-emerald" />
                  Playing XI: Max 6 on field
                </span>
                <span className="text-[#c9a227] font-medium">Captain rotation required</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Create / Edit Team Modal ── */}
      {showModal && canManage && createPortal(
        <div className="fixed inset-0 z-[100] bg-warm-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="warm-card w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-warm-700/60 space-y-6 relative max-h-[90vh] overflow-y-auto shadow-2xl my-auto">
            
            <div className="flex items-center justify-between border-b border-warm-700/50 pb-4">
              <h3 className="text-xl font-black text-sand-100 flex items-center gap-2 font-serif">
                <Users className="w-5 h-5 text-terracotta-400" />
                {editingTeam ? `Edit ${editingTeam.name}` : 'Create New NEPL Team'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Team Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dhanori Super Kings"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="warm-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Short Code</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="e.g. DSK"
                    value={formData.shortName}
                    onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                    className="warm-input font-mono uppercase"
                  />
                </div>
              </div>

              {/* Owner / Captain Selection */}
              <div>
                <label className="text-xs font-semibold text-sand-400 block mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#c9a227]" />
                  Assigned Team Captain / Auctioneer
                </label>
                {auctioneers.length > 0 ? (
                  <select
                    value={formData.owner}
                    onChange={e => setFormData({ ...formData, owner: e.target.value })}
                    className="warm-input cursor-pointer"
                  >
                    {auctioneers.map(auc => (
                      <option key={auc.email} value={auc.name}>
                        {auc.avatar} {auc.name} ({auc.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. Harish Patil (Auctioneer)"
                    value={formData.owner}
                    onChange={e => setFormData({ ...formData, owner: e.target.value })}
                    className="warm-input"
                  />
                )}
                <p className="text-[10px] text-sand-600 mt-1">
                  Select an active Auctioneer from registered accounts to serve as team captain.
                </p>
              </div>

              {/* Logo & Total Purse */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Team Icon Logo</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl p-2 bg-warm-900 rounded-xl border border-warm-700">{formData.logo}</span>
                    <div className="flex flex-wrap gap-1 max-w-[160px]">
                      {LOGO_OPTIONS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setFormData({ ...formData, logo: emoji })}
                          className={`p-1 text-sm rounded-lg border transition ${
                            formData.logo === emoji
                              ? 'bg-terracotta-600/30 border-terracotta-500'
                              : 'bg-warm-900 border-warm-800 text-sand-400'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Initial Purse (PTS)</label>
                  <input
                    type="number"
                    required
                    value={formData.totalPurse}
                    onChange={e => setFormData({ ...formData, totalPurse: e.target.value })}
                    className="warm-input font-mono"
                  />
                </div>
              </div>

              {/* Theme Color */}
              <div>
                <label className="text-xs font-semibold text-sand-400 block mb-1.5">Theme Badge Color</label>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl border border-warm-600" style={{ backgroundColor: formData.color }} />
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_OPTIONS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: c })}
                        className={`w-7 h-7 rounded-lg border transition ${
                          formData.color === c ? 'ring-2 ring-white scale-110' : 'border-warm-700'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-warm-700/50">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingTeam ? 'Save Team Changes' : 'Create Team'}
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
