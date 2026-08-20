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
  Edit3,
  Trash2,
  Camera,
  Upload,
  Crown,
  Zap,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { compressImage } from '../utils/imageCompressor';
import { updatePlayer as apiUpdatePlayer } from '../services/api';

export default function PlayersPool({ 
  players = [], 
  setPlayers, 
  teams = [], 
  setTeams,
  canAdd = true, 
  canEdit = true, 
  canDelete = true 
}) {
  const { can, addAuctioneer, revokeAuctioneerAccess } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [photoInfo, setPhotoInfo] = useState('');
  const [promotedInfo, setPromotedInfo] = useState(null);

  const [newPlayer, setNewPlayer] = useState({
    name: '',
    role: 'Batting All-Rounder',
    category: 'Category B',
    basePrice: 100,
    matches: 10,
    runs: 150,
    avg: 15.0,
    strikeRate: 130.0,
    wickets: 5,
    economy: 7.0,
    bestBowling: '2/15',
    cricHeroesUrl: 'https://cricheroes.com',
    avatarUrl: '/avatars/male.png'
  });

  // Super Admin Edit Player State
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    role: 'Batting All-Rounder',
    category: 'Category B',
    basePrice: 100,
    cricHeroesUrl: 'https://cricheroes.com',
    captainOfTeamId: '',
    grantAuctioneerAccess: false,
    auctioneerEmail: '',
    auctioneerPassword: (import.meta.env.VITE_AUCTIONEER_PASS || '').trim(),
  });

  const defaultAuctioneerPass = (import.meta.env.VITE_AUCTIONEER_PASS || '').trim();

  const openEditPlayerModal = (player) => {
    setEditingPlayer(player);
    const assignedTeamId = player.captainOfTeamId || (player.isCaptain ? player.soldTo : '');
    const cleanName = player.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '.');
    setEditFormData({
      name: player.name,
      role: player.role,
      category: player.category || 'Category B',
      basePrice: player.basePrice || 100,
      cricHeroesUrl: player.cricHeroesUrl || 'https://cricheroes.com',
      captainOfTeamId: assignedTeamId || '',
      grantAuctioneerAccess: Boolean(player.isAuctioneer),
      auctioneerEmail: `${cleanName}@nepl.in`,
      auctioneerPassword: defaultAuctioneerPass,
    });
  };

  const handleQuickGrantAuctioneer = (player) => {
    const cleanName = player.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '.');
    const email = `${cleanName}@nepl.in`;
    const password = defaultAuctioneerPass;

    if (player.isAuctioneer) {
      if (window.confirm(`⚠️ Disable & Revoke Auctioneer Access for "${player.name}"?\n\nThis will downgrade their account to Player (view-only) and remove bidding console privileges.`)) {
        try {
          if (revokeAuctioneerAccess) revokeAuctioneerAccess(email);
          const updated = { ...player, isAuctioneer: false };
          setPlayers(prev => prev.map(p => p.id === player.id ? updated : p));
          apiUpdatePlayer(player.id, updated).catch(console.warn);
          alert(`🚫 Auctioneer access disabled for ${player.name}. Role reset to Player.`);
        } catch (err) {
          alert(`⚠️ ${err.message || 'Failed to revoke auctioneer access'}`);
        }
      }
      return;
    }

    try {
      addAuctioneer({
        name: player.name,
        email,
        password,
        role: 'auctioneer',
      });

      const updated = { ...player, isAuctioneer: true };
      setPlayers(prev => prev.map(p => p.id === player.id ? updated : p));
      apiUpdatePlayer(player.id, updated).catch(console.warn);

      setPromotedInfo({
        name: player.name,
        email,
        password,
        role: '🔨 Auctioneer',
      });
    } catch (err) {
      alert(`⚠️ ${err.message || 'Failed to grant auctioneer access'}`);
    }
  };

  const handleEditPlayerSubmit = (e) => {
    e.preventDefault();
    if (!editingPlayer || !editFormData.name.trim()) return;

    const basePrice = Number(editFormData.basePrice);
    if (!basePrice || isNaN(basePrice) || basePrice <= 0) {
      alert("⚠️ Invalid Base Price: Base price must be a positive number greater than 0!");
      return;
    }

    const selectedTeamId = editFormData.captainOfTeamId;
    const isNowCaptain = Boolean(selectedTeamId);
    const prevTeamId = editingPlayer.captainOfTeamId || (editingPlayer.isCaptain ? editingPlayer.soldTo : null);

    const isNowAuctioneer = editFormData.grantAuctioneerAccess || isNowCaptain;

    const updatedPlayer = {
      ...editingPlayer,
      name: editFormData.name.trim(),
      role: editFormData.role,
      category: editFormData.category,
      basePrice: Math.max(50, basePrice),
      cricHeroesUrl: editFormData.cricHeroesUrl.trim(),
      isCaptain: isNowCaptain,
      isAuctioneer: isNowAuctioneer,
      captainOfTeamId: selectedTeamId || null,
      status: isNowCaptain ? 'sold' : (editingPlayer.status === 'sold' && prevTeamId ? 'available' : editingPlayer.status),
      soldPrice: isNowCaptain ? 0 : (editingPlayer.soldPrice === 0 && prevTeamId ? 0 : editingPlayer.soldPrice),
      soldTo: isNowCaptain ? selectedTeamId : (editingPlayer.soldTo === prevTeamId ? null : editingPlayer.soldTo),
    };

    const cleanName = editFormData.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '.');
    const email = editFormData.auctioneerEmail.trim() || `${cleanName}@nepl.in`;

    // If grant auctioneer login was checked, add or update login credentials
    if (editFormData.grantAuctioneerAccess) {
      try {
        const password = editFormData.auctioneerPassword.trim() || defaultAuctioneerPass;
        addAuctioneer({
          name: editFormData.name.trim(),
          email,
          password,
          role: 'auctioneer',
        });
        setPromotedInfo({
          name: editFormData.name.trim(),
          email,
          password,
          role: '🔨 Auctioneer',
        });
      } catch (err) {
        console.warn('Auctioneer access grant error:', err);
      }
    } else if (editingPlayer.isAuctioneer && !editFormData.grantAuctioneerAccess) {
      // Super Admin explicitly unchecked auctioneer access -> Revoke login role
      try {
        if (revokeAuctioneerAccess) revokeAuctioneerAccess(email);
      } catch (err) {
        console.warn('Auctioneer access revoke error:', err);
      }
    }

    // Update player in state & DB
    setPlayers(prev => prev.map(p => p.id === editingPlayer.id ? updatedPlayer : p));
    apiUpdatePlayer(editingPlayer.id, updatedPlayer).catch(err => console.warn('MongoDB player edit error:', err));

    // Synchronize team squad with 0 credit
    if (setTeams && (isNowCaptain || prevTeamId)) {
      setTeams(prevTeams => prevTeams.map(t => {
        // 1. Remove from previous team if changed
        if (prevTeamId && t.id === prevTeamId && prevTeamId !== selectedTeamId) {
          const newSquad = (t.squad || []).filter(p => p.id !== editingPlayer.id);
          const updated = {
            ...t,
            squad: newSquad,
            playersCount: newSquad.length,
            captainId: t.captainId === editingPlayer.id ? null : t.captainId,
            captainName: t.captainId === editingPlayer.id ? null : t.captainName,
          };
          apiUpdatePlayer(t.id, updated).catch(console.warn);
          return updated;
        }

        // 2. Add to new team as Captain with 0 credit
        if (selectedTeamId && t.id === selectedTeamId) {
          const filteredSquad = (t.squad || []).filter(p => p.id !== editingPlayer.id);
          const squadEntry = {
            id: editingPlayer.id,
            name: updatedPlayer.name,
            role: updatedPlayer.role,
            category: updatedPlayer.category || 'Male',
            soldPrice: 0, // 0 credit deduction!
            avatarUrl: editingPlayer.avatarUrl,
            cricHeroesUrl: updatedPlayer.cricHeroesUrl,
            isCaptain: true,
            isAuctioneer: true,
          };
          const newSquad = [squadEntry, ...filteredSquad];
          const updated = {
            ...t,
            owner: updatedPlayer.name,
            captainId: editingPlayer.id,
            captainName: updatedPlayer.name,
            squad: newSquad,
            playersCount: newSquad.length,
            spentPurse: newSquad.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0),
          };
          apiUpdatePlayer(t.id, updated).catch(console.warn);
          return updated;
        }

        return t;
      }));
    }

    setEditingPlayer(null);
  };

  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || p.role.includes(roleFilter);
    const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === 'captains') {
      matchesStatus = Boolean(p.isCaptain || p.captainOfTeamId || (p.status === 'sold' && p.soldPrice === 0 && p.soldTo));
    } else if (statusFilter !== 'All') {
      matchesStatus = p.status === statusFilter;
    }

    return matchesSearch && matchesRole && matchesStatus && matchesCat;
  });

  const handlePhotoUpload = async (e, isNew = true, targetPlayerId = null) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setCompressing(true);
      const compressedDataUrl = await compressImage(file, 400, 400, 0.7);
      const approxKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
      const sizeTag = `Compressed ~${approxKb} KB`;

      if (isNew) {
        setPhotoInfo(sizeTag);
        setNewPlayer(prev => ({ ...prev, avatarUrl: compressedDataUrl }));
      } else if (targetPlayerId) {
        setPlayers(prev => prev.map(p => 
          p.id === targetPlayerId ? { ...p, avatarUrl: compressedDataUrl } : p
        ));
      }
    } catch (err) {
      alert('Error compressing image: ' + err.message);
    } finally {
      setCompressing(false);
    }
  };

  const handleAddPlayerSubmit = (e) => {
    e.preventDefault();
    if (!newPlayer.name.trim()) return;

    const basePrice = Number(newPlayer.basePrice);
    if (!basePrice || isNaN(basePrice) || basePrice <= 0) {
      alert("⚠️ Invalid Base Price: Base price must be a positive number greater than 0!");
      return;
    }

    const createdPlayer = {
      ...newPlayer,
      id: `ply-${Date.now()}`,
      basePrice: Math.max(50, basePrice),
      matches: Math.max(0, Number(newPlayer.matches) || 0),
      runs: Math.max(0, Number(newPlayer.runs) || 0),
      wickets: Math.max(0, Number(newPlayer.wickets) || 0),
      status: 'available',
      soldPrice: 0,
      soldTo: null
    };
    setPlayers(prev => [createdPlayer, ...prev]);
    setShowAddModal(false);
    setPhotoInfo('');
    setNewPlayer({
      name: '',
      role: 'Batting All-Rounder',
      category: 'Category B',
      basePrice: 100,
      matches: 10,
      runs: 150,
      avg: 15.0,
      strikeRate: 130.0,
      wickets: 5,
      economy: 7.0,
      bestBowling: '2/15',
      cricHeroesUrl: 'https://cricheroes.com',
      avatarUrl: '/avatars/male.png'
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
              playersCount: Math.max(0, (t.playersCount || updatedSquad.length) - 1),
              squad: updatedSquad,
            };
          }
          return t;
        }));
      }
    }
  };

  const selectClass = "bg-warm-900 border border-warm-700 rounded-xl px-3 py-2 text-xs text-sand-200 focus:outline-none focus:border-terracotta-500 transition cursor-pointer";

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-warm-700/50 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-xs font-black uppercase tracking-wider border border-cyan-500/30 mb-3">
              <Award className="w-3.5 h-3.5" />
              SQUAD DIRECTORY ({players.length} PLAYERS)
            </div>
            <h2 className="text-3xl font-black text-sand-100 tracking-tight font-display">
              NEPL Players Pool & Roster
            </h2>
            <p className="text-sand-400 text-xs mt-2 max-w-xl">
              Browse stats, roles, categories, and auction status for all registered players in Season 2026.
            </p>
          </div>

          {canAdd && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary shrink-0 font-display font-bold uppercase tracking-wider text-xs px-5 py-3"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Player</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-warm-700/50 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-sand-500 absolute left-3 top-1/2 -translate-y-1/2" />
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
            <option value="captains">👑 Captains & Auctioneers</option>
            <option value="available">Available for Auction</option>
            <option value="sold">Sold</option>
            <option value="unsold">Unsold</option>
          </select>
        </div>
      </div>

      {/* Promoted Auctioneer Success Callout */}
      {promotedInfo && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl animate-fade-in">
          <div className="flex items-center space-x-3">
            <span className="text-2xl p-2 bg-amber-500/20 rounded-xl border border-amber-500/40">🔨</span>
            <div>
              <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <span>Auctioneer Console Access Granted for {promotedInfo.name}!</span>
                <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px] uppercase">Active</span>
              </h4>
              <p className="text-xs text-sand-300 font-mono mt-0.5">
                Login: <strong className="text-white">{promotedInfo.email}</strong> • Password: <strong className="text-amber-300">{promotedInfo.password}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => {
                navigator.clipboard.writeText(`Email: ${promotedInfo.email}\nPassword: ${promotedInfo.password}\nRole: ${promotedInfo.role}\nURL: ${window.location.origin}`);
                alert(`📋 Copied login credentials for ${promotedInfo.name} to clipboard!`);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              Copy Credentials
            </button>
            <button
              onClick={() => setPromotedInfo(null)}
              className="p-1.5 rounded-xl text-sand-400 hover:text-sand-200 bg-warm-900 border border-warm-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Player Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredPlayers.map(player => {
          const isCap = Boolean(player.isCaptain || player.captainOfTeamId || (player.soldPrice === 0 && player.status === 'sold' && player.soldTo));
          const isAuctioneer = Boolean(player.isAuctioneer);
          const buyerTeam = teams.find(t => t.id === player.soldTo || t.id === player.captainOfTeamId);
          return (
            <div
              key={player.id}
              className={`glass-card p-5 rounded-2xl border glass-card-hover flex flex-col justify-between space-y-4 relative overflow-hidden group ${
                isCap ? 'border-amber-500/50 bg-amber-950/10' : isAuctioneer ? 'border-cyan-500/30' : 'border-warm-700/50'
              }`}
            >
              {/* Status stripe */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                isCap ? 'bg-amber-400' :
                player.status === 'sold' ? 'bg-terracotta-600' : 
                player.status === 'unsold' ? 'bg-warm-600' : 'bg-cricket-emerald'
              }`} />

              {/* Avatar + Name */}
              <div>
                {/* 👑 Captain & Auctioneer Header Tag if applicable */}
                {(isCap || isAuctioneer) && (
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                      {isCap ? <Crown className="w-3 h-3 text-amber-400" /> : <Zap className="w-2.5 h-2.5 text-cyan-300" />}
                      {isCap ? 'Captain & Auctioneer' : 'Authorized Auctioneer'}
                    </span>
                    {buyerTeam && (
                      <span className="text-[10px] font-bold text-amber-400 font-mono">
                        {buyerTeam.shortName}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative group/avatar shrink-0">
                      <img
                        src={player.avatarUrl}
                        alt={player.name}
                        className={`w-14 h-14 rounded-xl object-cover border-2 bg-warm-900 shadow-md ${
                          isCap ? 'border-amber-400 ring-2 ring-amber-400/30' : isAuctioneer ? 'border-cyan-400' : 'border-warm-700'
                        }`}
                        onError={e => { e.target.src = '/avatars/male.png'; }}
                      />
                      {isCap && (
                        <span className="absolute -top-1 -right-1 p-1 bg-amber-400 text-slate-950 rounded-full shadow-md z-10">
                          <Crown className="w-3 h-3" />
                        </span>
                      )}
                      {/* Photo Update Overlay */}
                      <label 
                        className="absolute inset-0 rounded-xl bg-slate-950/75 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity duration-200"
                        title="Upload compressed photo"
                      >
                        <Camera className="w-4 h-4 text-cyan-300" />
                        <span className="text-[8px] font-bold text-cyan-200 uppercase tracking-tighter">Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, false, player.id)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h3 className="font-bold text-sand-100 text-sm truncate font-display flex items-center gap-1">
                          {player.name}
                        </h3>
                        {player.cricHeroesUrl && (
                          <a href={player.cricHeroesUrl} target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300 flex-shrink-0">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <span className="text-[11px] text-cyan-300 font-semibold">{player.role}</span>
                      <span className="block text-[10px] text-amber-400 font-mono">{player.category}</span>
                    </div>
                  </div>

                  {/* Super Admin Edit, Promote & Delete Player Buttons */}
                  <div className="flex items-center space-x-1 shrink-0 ml-1">
                    {can('canManageUsers') && (
                      <button
                        onClick={() => handleQuickGrantAuctioneer(player)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          player.isAuctioneer
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                            : 'bg-warm-900/80 hover:bg-amber-950/80 text-slate-400 hover:text-amber-300 border-warm-700/60 hover:border-amber-500/40'
                        }`}
                        title={player.isAuctioneer ? `⚡ Auctioneer access active for ${player.name}` : `⚡ Grant Auctioneer Console Login to ${player.name}`}
                      >
                        <Zap className={`w-3.5 h-3.5 ${player.isAuctioneer ? 'text-amber-400 fill-amber-400' : ''}`} />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => openEditPlayerModal(player)}
                        className="p-1.5 rounded-lg bg-warm-900/80 hover:bg-amber-950/80 text-slate-400 hover:text-amber-300 border border-warm-700/60 hover:border-amber-500/40 transition cursor-pointer"
                        title={`Edit ${player.name} & Roles`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeletePlayer(player)}
                        className="p-1.5 rounded-lg bg-warm-900/80 hover:bg-rose-950/80 text-slate-500 hover:text-rose-400 border border-warm-700/60 hover:border-rose-500/40 transition cursor-pointer"
                        title={`Delete ${player.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats grid */}
                <div className="mt-4 grid grid-cols-3 gap-1 bg-warm-950/60 p-2.5 rounded-xl border border-warm-800/50 text-center font-mono">
                  {[
                    { label: 'Matches', value: player.matches, color: 'text-sand-200' },
                    { label: 'Runs', value: player.runs, color: 'text-emerald-400' },
                    { label: 'Wkts', value: player.wickets, color: 'text-cyan-400' },
                  ].map((s, i) => (
                    <div key={i} className={i > 0 ? 'border-l border-warm-800' : ''}>
                      <span className="text-[9px] uppercase text-slate-500 block">{s.label}</span>
                      <span className={`text-xs font-bold ${s.color}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-warm-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-500 font-mono block uppercase">Base Price</span>
                  <span className="text-xs font-bold text-sand-300 font-mono">₹{player.basePrice}</span>
                </div>
                <div>
                  {isCap && buyerTeam ? (
                    <span 
                      className="px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border flex items-center space-x-1.5 font-mono bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>{buyerTeam.logo} {buyerTeam.shortName} · 0 PTS (Captain)</span>
                    </span>
                  ) : player.status === 'sold' && buyerTeam ? (
                    <span 
                      className="px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border flex items-center space-x-1.5 font-mono shadow-md"
                      style={{ 
                        backgroundColor: `${buyerTeam.color || '#10b981'}20`, 
                        color: buyerTeam.color || '#10b981',
                        borderColor: `${buyerTeam.color || '#10b981'}50`,
                        boxShadow: `0 0 10px ${buyerTeam.color || '#10b981'}35`
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{buyerTeam.logo} {buyerTeam.shortName} ₹{player.soldPrice}</span>
                    </span>
                  ) : player.status === 'unsold' ? (
                    <span className="badge-unsold">
                      <XCircle className="w-3 h-3" />
                      Unsold
                    </span>
                  ) : (
                    <span className="badge-available">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
              <h3 className="text-xl font-black text-sand-100 flex items-center gap-2 font-display">
                <UserPlus className="w-5 h-5 text-cyan-400" />
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
                      let defaultBase = 100;
                      if (cat === 'Female') { defaultAvatar = '/avatars/female.png'; defaultBase = 100; }
                      else if (cat === 'Master (7-10 yrs)') { defaultAvatar = '/avatars/master.png'; defaultBase = 100; }
                      else if (cat === 'Super Master (11-13 yrs)') { defaultAvatar = '/avatars/super_master.png'; defaultBase = 100; }
                      else if (cat === 'Icon') { defaultBase = 300; }
                      else if (cat === 'Category A') { defaultBase = 200; }
                      setNewPlayer({ ...newPlayer, category: cat, avatarUrl: defaultAvatar, basePrice: defaultBase });
                    }} 
                    className="warm-input cursor-pointer"
                  >
                    <option value="Male">Male (Adult) — Base: 100 PTS</option>
                    <option value="Female">Female (Adult) — Base: 100 PTS</option>
                    <option value="Master (7-10 yrs)">Master (7-10 yrs) — Base: 100 PTS</option>
                    <option value="Super Master (11-13 yrs)">Super Master (11-13 yrs) — Base: 100 PTS</option>
                    <option value="Category B">Category B (Default Base: 100 PTS)</option>
                    <option value="Category A">Category A (Base: 200 PTS)</option>
                    <option value="Icon">Icon (Base: 300 PTS)</option>
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

              {/* Compressed Photo Upload Section */}
              <div className="bg-[#0b1120] p-4 rounded-2xl border border-cyan-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-cyan-300 font-display flex items-center gap-1.5">
                    <Camera className="w-4 h-4" />
                    Player Compressed Photo Upload
                  </label>
                  {photoInfo && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      {photoInfo}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <img
                    src={newPlayer.avatarUrl}
                    alt="Preview"
                    className="w-12 h-12 rounded-xl object-cover border-2 border-cyan-500/40 bg-slate-900 shrink-0"
                  />
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold cursor-pointer transition">
                      <Upload className="w-4 h-4" />
                      <span>{compressing ? 'Compressing Image…' : 'Choose Photo (Auto-Compress)'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, true)}
                        disabled={compressing}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Photos are automatically compressed to 400x400 max (~15-30KB) for lightweight cloud sync.
                    </p>
                  </div>
                </div>

                {/* Preset Avatars */}
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-500 block mb-1.5">Or Select Preset Avatar:</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'male', label: 'Male', url: '/avatars/male.png' },
                      { id: 'female', label: 'Female', url: '/avatars/female.png' },
                      { id: 'master', label: 'Master', url: '/avatars/master.png' },
                      { id: 'super_master', label: 'Super Master', url: '/avatars/super_master.png' },
                    ].map(av => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => { setPhotoInfo(''); setNewPlayer({ ...newPlayer, avatarUrl: av.url }); }}
                        className={`p-1.5 rounded-xl border flex items-center justify-center gap-2 transition ${
                          newPlayer.avatarUrl === av.url
                            ? 'bg-cyan-500/20 border-cyan-400 ring-2 ring-cyan-500/30'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <img src={av.url} alt={av.label} className="w-6 h-6 rounded-md object-cover" />
                        <span className="text-[10px] text-slate-300 font-medium">{av.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {['matches', 'runs', 'wickets'].map(field => (
                  <div key={field}>
                    <label className="text-xs font-semibold text-sand-400 block mb-1.5 capitalize">{field}</label>
                    <input
                      type="number" value={newPlayer[field]}
                      onChange={e => setNewPlayer({ ...newPlayer, [field]: e.target.value })}
                      className="warm-input font-mono"
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
                <button type="submit" className="btn-primary" disabled={compressing}>
                  <Plus className="w-4 h-4" />
                  Add Player to Roster
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body
      )}

      {/* ── Super Admin Edit Player Modal ── */}
      {editingPlayer && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-cyan-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <h3 className="text-lg font-black text-cyan-300 flex items-center gap-2 font-display">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <span>⚡ Super Admin: Edit Player Profile</span>
              </h3>
              <button onClick={() => setEditingPlayer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditPlayerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Player Full Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white font-bold focus:outline-none focus:border-cyan-400 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Batting All-Rounder">Batting All-Rounder</option>
                    <option value="Bowling All-Rounder">Bowling All-Rounder</option>
                    <option value="Pure Batsman">Pure Batsman</option>
                    <option value="Wicketkeeper Batsman">Wicketkeeper Batsman</option>
                    <option value="Fast Bowler">Fast Bowler</option>
                    <option value="Spin Bowler">Spin Bowler</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Category</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Super Master">Super Master</option>
                    <option value="Master">Master</option>
                    <option value="Category A">Category A</option>
                    <option value="Category B">Category B</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Base Price (PTS)</label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={editFormData.basePrice}
                    onChange={(e) => setEditFormData({ ...editFormData, basePrice: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm font-bold focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">CricHeroes Profile URL</label>
                  <input
                    type="url"
                    value={editFormData.cricHeroesUrl}
                    onChange={(e) => setEditFormData({ ...editFormData, cricHeroesUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* 👑 Designate as Team Captain & Auctioneer (0 PTS) */}
              <div className="bg-amber-950/30 p-3.5 rounded-2xl border border-amber-500/40 space-y-1.5">
                <label className="text-xs font-bold text-amber-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-400" />
                    Assign as Team Captain & Auctioneer
                  </span>
                  <span className="text-[9px] text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded font-mono">0 Credit (₹0 PTS)</span>
                </label>
                <select
                  value={editFormData.captainOfTeamId}
                  onChange={(e) => setEditFormData({ ...editFormData, captainOfTeamId: e.target.value })}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-amber-200 text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="">-- None (Regular Available Player) --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.logo} {t.name} ({t.shortName})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Assigning this player to a team places them in the squad with <strong>0 Credit</strong> as the playing Captain & Auctioneer.
                </p>
              </div>

              {/* ⚡ Grant Auctioneer Console Login Access */}
              <div className="bg-cyan-950/25 p-3.5 rounded-2xl border border-cyan-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.grantAuctioneerAccess}
                      onChange={(e) => setEditFormData({ ...editFormData, grantAuctioneerAccess: e.target.checked })}
                      className="rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                    />
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span>Grant Auctioneer Bidding Console Login Access</span>
                  </label>
                  <span className="text-[9px] text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded font-mono">🔨 Auction Member</span>
                </div>

                {editFormData.grantAuctioneerAccess && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1 animate-fade-in">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Login Email</label>
                      <input
                        type="email"
                        value={editFormData.auctioneerEmail}
                        onChange={(e) => setEditFormData({ ...editFormData, auctioneerEmail: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                        placeholder="player@nepl.in"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Login Password</label>
                      <input
                        type="text"
                        value={editFormData.auctioneerPassword}
                        onChange={(e) => setEditFormData({ ...editFormData, auctioneerPassword: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-amber-300 font-mono text-xs focus:outline-none focus:border-cyan-400"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 border border-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
                >
                  Save Player Changes
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
