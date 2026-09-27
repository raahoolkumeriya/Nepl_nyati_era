import React, { useState, useEffect } from 'react';
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
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { generateUniqueNeplEmail } from '../services/auth';
import { compressImage } from '../utils/imageCompressor';
import { updatePlayer as apiUpdatePlayer } from '../services/api';
import { CURRENT_YEAR, CURRENT_SEASON_TAG } from '../utils/season';
import { useTournament } from '../context/TournamentContext';

export default function PlayersPool({ 
  players = [], 
  setPlayers, 
  teams = [], 
  setTeams,
  canAdd = true, 
  canEdit = true, 
  canDelete = true 
}) {
  const { can, addAuctioneer, revokeAuctioneerAccess, usersList } = useAuth();
  const { tournamentSettings } = useTournament();
  const defaultBase = tournamentSettings?.defaultBasePrice || 100;

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [tournamentFilter, setTournamentFilter] = useState('All'); // 'All' | 'playing' | 'reserve' | 'new_joiner'
  const [showAddModal, setShowAddModal] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [photoInfo, setPhotoInfo] = useState('');
  const [promotedInfo, setPromotedInfo] = useState(null);
  const [showPromotedPass, setShowPromotedPass] = useState(false);

  const [newPlayer, setNewPlayer] = useState({
    name: '',
    role: 'Batting All-Rounder',
    category: 'Category B',
    basePrice: defaultBase,
    matches: 10,
    runs: 150,
    avg: 15.0,
    strikeRate: 130.0,
    wickets: 5,
    economy: 7.0,
    bestBowling: '2/15',
    cricHeroesUrl: 'https://cricheroes.com',
    avatarUrl: '/avatars/male.png',
    isPlayingNEPL: true,
    isNewJoiner: true,
    tournamentSession: CURRENT_SEASON_TAG
  });

  useEffect(() => {
    setNewPlayer(prev => ({
      ...prev,
      basePrice: defaultBase
    }));
  }, [defaultBase]);

  // Super Admin Edit Player State
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    role: 'Batting All-Rounder',
    category: 'Category B',
    basePrice: defaultBase,
    cricHeroesUrl: 'https://cricheroes.com',
    captainOfTeamId: '',
    grantAuctioneerAccess: false,
    auctioneerEmail: '',
    auctioneerPassword: (import.meta.env.VITE_AUCTIONEER_PASS || '').trim(),
    isPlayingNEPL: true,
    isNewJoiner: false,
    tournamentSession: CURRENT_SEASON_TAG
  });

  const defaultAuctioneerPass = (import.meta.env.VITE_AUCTIONEER_PASS || '').trim();

  const openEditPlayerModal = (player) => {
    setEditingPlayer(player);
    const captainTeam = teams.find(t => t.captainId === player.id || t.squad?.some(s => s.id === player.id && s.isCaptain));
    const assignedTeamId = player.captainOfTeamId || (captainTeam ? captainTeam.id : (player.isCaptain && player.soldTo ? player.soldTo : ''));
    const existingEmails = (usersList || []).map(u => u.email);
    const autoUniqueEmail = generateUniqueNeplEmail(player.name, existingEmails);
    setEditFormData({
      name: player.name,
      role: player.role,
      category: player.category || 'Category B',
      basePrice: player.basePrice || defaultBase,
      cricHeroesUrl: player.cricHeroesUrl || 'https://cricheroes.com',
      captainOfTeamId: assignedTeamId || '',
      grantAuctioneerAccess: Boolean(player.isAuctioneer),
      auctioneerEmail: autoUniqueEmail,
      auctioneerPassword: defaultAuctioneerPass,
      isPlayingNEPL: player.isPlayingNEPL !== false,
      isNewJoiner: Boolean(player.isNewJoiner),
      tournamentSession: player.tournamentSession || CURRENT_SEASON_TAG
    });
  };

  const handleTogglePlayingNEPL = (player) => {
    if (!canEdit && !can('canManageTeams') && !can('canManageUsers')) {
      alert("Only Admins and Managers can toggle tournament playing status.");
      return;
    }

    const nextState = player.isPlayingNEPL === false ? true : false;
    const updated = { ...player, isPlayingNEPL: nextState };
    
    setPlayers(prev => prev.map(p => p.id === player.id ? updated : p));
    apiUpdatePlayer(player.id, updated).catch(console.warn);
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
    const prevCaptainTeam = teams.find(t => t.captainId === editingPlayer.id || t.squad?.some(s => s.id === editingPlayer.id && s.isCaptain));
    const prevTeamId = editingPlayer.captainOfTeamId || (prevCaptainTeam ? prevCaptainTeam.id : (editingPlayer.isCaptain ? editingPlayer.soldTo : null));

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
      status: isNowCaptain ? 'sold' : (editingPlayer.soldTo ? 'sold' : 'available'),
      soldPrice: isNowCaptain ? 0 : (editingPlayer.soldPrice || 0),
      soldTo: isNowCaptain ? selectedTeamId : (prevTeamId && !selectedTeamId ? (editingPlayer.soldTo === prevTeamId ? editingPlayer.soldTo : null) : editingPlayer.soldTo),
      isPlayingNEPL: Boolean(editFormData.isPlayingNEPL),
      isNewJoiner: Boolean(editFormData.isNewJoiner),
      tournamentSession: editFormData.tournamentSession || 'NEPL 2026'
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
          photoUrl: editingPlayer.avatarUrl || null,
        });
        setPromotedInfo({
          name: editFormData.name.trim(),
          email,
          password,
          role: '🔨 Auctioneer',
          photoUrl: editingPlayer.avatarUrl || null,
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
        // If captaincy was removed for this team
        if (prevTeamId && t.id === prevTeamId && !selectedTeamId) {
          const newSquad = (t.squad || []).map(p => p.id === editingPlayer.id ? { ...p, isCaptain: false, captainOfTeamId: null } : p);
          const updated = {
            ...t,
            squad: newSquad,
            captainId: t.captainId === editingPlayer.id ? null : t.captainId,
            captainName: t.captainId === editingPlayer.id ? null : t.captainName,
          };
          apiUpdatePlayer(t.id, updated).catch(console.warn);
          return updated;
        }

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
            captainOfTeamId: selectedTeamId,
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
      matchesStatus = Boolean(
        p.isCaptain === true || 
        p.captainOfTeamId || 
        teams.some(t => t.captainId === p.id || t.squad?.some(s => s.id === p.id && s.isCaptain))
      );
    } else if (statusFilter !== 'All') {
      matchesStatus = p.status === statusFilter;
    }

    let matchesTournament = true;
    if (tournamentFilter === 'playing') {
      matchesTournament = p.isPlayingNEPL !== false;
    } else if (tournamentFilter === 'reserve') {
      matchesTournament = p.isPlayingNEPL === false;
    } else if (tournamentFilter === 'new_joiner') {
      matchesTournament = Boolean(p.isNewJoiner);
    }

    return matchesSearch && matchesRole && matchesStatus && matchesCat && matchesTournament;
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
      soldTo: null,
      isPlayingNEPL: Boolean(newPlayer.isPlayingNEPL),
      isNewJoiner: Boolean(newPlayer.isNewJoiner),
      tournamentSession: newPlayer.tournamentSession || CURRENT_SEASON_TAG
    };
    setPlayers(prev => [createdPlayer, ...prev]);
    apiUpdatePlayer(createdPlayer.id, createdPlayer).catch(console.warn);
    setShowAddModal(false);
    setPhotoInfo('');
    setNewPlayer({
      name: '',
      role: 'Batting All-Rounder',
      category: 'Category B',
      basePrice: defaultBase,
      matches: 10,
      runs: 150,
      avg: 15.0,
      strikeRate: 130.0,
      wickets: 5,
      economy: 7.0,
      bestBowling: '2/15',
      cricHeroesUrl: 'https://cricheroes.com',
      avatarUrl: '/avatars/male.png',
      isPlayingNEPL: true,
      isNewJoiner: true,
      tournamentSession: CURRENT_SEASON_TAG
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
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-xs font-bold tracking-normal border border-cyan-500/30 mb-3">
              <Award className="w-3.5 h-3.5" />
              <span>Squad Directory ({players.length} Players)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-sand-100 tracking-tight font-sans">
              Players Pool & Roster
            </h2>
            <p className="text-sand-400 text-xs mt-2 max-w-xl">
              Browse stats, roles, categories, and auction status for all registered players in Season {CURRENT_YEAR}.
            </p>
          </div>

          {canAdd && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary shrink-0 font-sans font-bold uppercase tracking-wider text-xs px-5 py-3"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Player</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-warm-700/50 space-y-3.5">
        {/* Tournament Roster & Playing Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pb-2.5 border-b border-warm-800/60">
          {[
            { id: 'All', label: 'All Players', count: players.length, color: 'text-slate-800 dark:text-slate-200' },
            { id: 'playing', label: '🏏 Playing NEPL (Active)', count: players.filter(p => p.isPlayingNEPL !== false).length, color: 'text-emerald-700 dark:text-emerald-300' },
            { id: 'reserve', label: '⏳ Next Session / Reserve', count: players.filter(p => p.isPlayingNEPL === false).length, color: 'text-amber-700 dark:text-amber-300' },
            { id: 'new_joiner', label: '✨ New Joiners', count: players.filter(p => p.isNewJoiner).length, color: 'text-sky-700 dark:text-cyan-300' },
          ].map(pill => (
            <button
              key={pill.id}
              onClick={() => setTournamentFilter(pill.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-mono text-xs sm:text-sm font-bold transition cursor-pointer ${
                tournamentFilter === pill.id
                  ? 'bg-cyan-500/25 text-sky-800 dark:text-cyan-300 border border-cyan-500/60 shadow-[0_0_12px_rgba(0,242,254,0.25)]'
                  : 'bg-warm-900/80 text-slate-600 dark:text-slate-400 border border-warm-700/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>{pill.label}</span>
              <span className={`px-2 py-0.5 rounded-md bg-warm-950/80 font-black text-xs ${pill.color}`}>
                {pill.count}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search players by name, role…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-warm-900 border border-warm-700 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-sand-100 placeholder-slate-500 focus:outline-none focus:border-terracotta-500 transition font-medium"
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
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl animate-fade-in">
          <div className="flex items-center space-x-3">
            {promotedInfo.photoUrl ? (
    <img src={promotedInfo.photoUrl} alt={promotedInfo.name} className="w-11 h-11 rounded-xl object-cover border border-amber-500/60 shadow-md shrink-0" />
  ) : (
    <span className="text-2xl p-2 bg-amber-500/20 rounded-xl border border-amber-500/40 shrink-0">🔨</span>
  )}
            <div>
              <h4 className="font-extrabold text-amber-700 dark:text-amber-300 text-sm sm:text-base flex items-center gap-2">
                <span>Auctioneer Console Access Granted for {promotedInfo.name}!</span>
                <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-xs uppercase">Active</span>
              </h4>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-sand-300 font-mono mt-0.5">
                <span>Login: <strong className="text-slate-900 dark:text-white">{promotedInfo.email}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  Password: <strong className="text-amber-700 dark:text-amber-300 tracking-wider">{showPromotedPass ? promotedInfo.password : '••••••••'}</strong>
                  <button
                    type="button"
                    onClick={() => setShowPromotedPass(v => !v)}
                    className="p-1 text-sand-400 hover:text-amber-300 transition"
                    title={showPromotedPass ? "Hide password" : "Show password"}
                  >
                    {showPromotedPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => {
                navigator.clipboard.writeText(`Email: ${promotedInfo.email}\nPassword: ${promotedInfo.password}\nRole: ${promotedInfo.role}\nURL: ${window.location.origin}`);
                alert(`📋 Copied login credentials for ${promotedInfo.name} to clipboard!`);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition cursor-pointer shadow-sm"
            >
              Copy Credentials
            </button>
            <button
              onClick={() => setPromotedInfo(null)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 bg-warm-900 border border-warm-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Player Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-5">
        {filteredPlayers.map(player => {
          const isCap = Boolean(
            player.isCaptain === true || 
            player.captainOfTeamId || 
            teams.some(t => t.captainId === player.id || t.squad?.some(s => s.id === player.id && s.isCaptain))
          );
          const isAuctioneer = Boolean(player.isAuctioneer);
          const isPlaying = player.isPlayingNEPL !== false;
          const isNewJoiner = Boolean(player.isNewJoiner);
          const buyerTeam = teams.find(t => t.id === player.soldTo || t.id === player.captainOfTeamId);
          return (
            <div
              key={player.id}
              className={`glass-card p-5 rounded-2xl border glass-card-hover flex flex-col justify-between space-y-4 relative overflow-hidden group shadow-md ${
                isCap ? 'border-amber-500/50 bg-amber-950/10' : isAuctioneer ? 'border-cyan-500/30' : 'border-warm-700/50'
              }`}
            >
              {/* Status stripe */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                isCap ? 'bg-amber-400' :
                player.status === 'sold' ? 'bg-terracotta-600' : 
                player.status === 'unsold' ? 'bg-warm-600' : 'bg-cricket-emerald'
              }`} />

              {/* Avatar + Name */}
              <div>
                {/* 👑 Playing Status, Captain Tags & Admin Controls */}
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-warm-800/40 pb-2">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    {/* Quick Toggle Playing Status Button */}
                    <button
                      type="button"
                      onClick={() => handleTogglePlayingNEPL(player)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
                        isPlaying
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      }`}
                      title={canEdit || can('canManageTeams') ? "Click to toggle: Playing in NEPL vs Next Session/Reserve" : "Tournament status"}
                    >
                      <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-amber-500 dark:bg-amber-400'}`} />
                      <span>{isPlaying ? '🏏 Playing' : '⏳ Reserve'}</span>
                    </button>

                    {isNewJoiner && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-cyan-500/20 text-sky-800 dark:text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                        <Sparkles className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
                        <span>New</span>
                      </span>
                    )}

                    {(isCap || isAuctioneer) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase">
                        {isCap ? <Crown className="w-3 h-3 text-amber-500 dark:text-amber-400" /> : <Zap className="w-2.5 h-2.5 text-cyan-400" />}
                        {isCap ? 'Captain' : 'Auctioneer'}
                      </span>
                    )}
                  </div>

                  {/* Super Admin Action Controls */}
                  <div className="flex items-center space-x-1 shrink-0">
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

                <div className="flex items-center space-x-3.5">
                  <div className="relative group/avatar shrink-0">
                    <div className={`w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden border-2 bg-warm-900 shadow-lg ${
                      isCap ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-amber-400/20' : isAuctioneer ? 'border-cyan-400 shadow-cyan-400/20' : 'border-warm-700'
                    }`}>
                      <img
                        src={player.avatarUrl}
                        alt={player.name}
                        className="w-full h-full object-cover object-[center_15%] scale-110 group-hover/avatar:scale-115 transition duration-300"
                        onError={e => { e.target.src = '/avatars/male.png'; }}
                      />
                    </div>
                    {isCap && (
                      <span className="absolute -top-1.5 -right-1.5 p-1 bg-amber-400 text-slate-950 rounded-full shadow-lg z-10">
                        <Crown className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {/* Photo Update Overlay */}
                    <label 
                      className="absolute inset-0 rounded-2xl bg-slate-950/75 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity duration-200"
                      title="Upload compressed photo"
                    >
                      <Camera className="w-5 h-5 text-cyan-300" />
                      <span className="text-[10px] font-bold text-cyan-200 uppercase tracking-tight mt-0.5">Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, false, player.id)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-extrabold text-slate-900 dark:text-sand-100 text-base sm:text-lg leading-tight font-sans break-words" title={player.name}>
                      <span className="inline-flex items-center gap-1.5 flex-wrap">
                        <span>{player.name}</span>
                        {player.cricHeroesUrl && (
                          <a href={player.cricHeroesUrl} target="_blank" rel="noreferrer" className="text-amber-500 hover:text-amber-400 inline-flex items-center shrink-0 p-0.5 rounded hover:bg-amber-400/15 transition" title="Open CricHeroes Profile">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-xs sm:text-sm text-sky-700 dark:text-cyan-300 font-bold tracking-wide">{player.role}</span>
                      <span className="text-slate-400 font-mono text-xs">•</span>
                      <span className="text-xs text-amber-700 dark:text-amber-400 font-mono font-bold">{player.category}</span>
                    </div>
                  </div>
                </div>

                {/* Stats grid - Crisp High Contrast in Both Light & Dark Mode */}
                <div className="mt-4 grid grid-cols-3 gap-1 bg-[#f4efe6] dark:bg-[#070b14]/90 p-2.5 sm:p-3 rounded-2xl border border-[#e2dacc] dark:border-cyan-500/20 text-center font-mono shadow-sm">
                  {[
                    { label: 'Matches', value: player.matches ?? 0, color: 'text-slate-900 dark:text-slate-100' },
                    { label: 'Runs', value: player.runs ?? 0, color: 'text-emerald-700 dark:text-emerald-400' },
                    { label: 'Wkts', value: player.wickets ?? 0, color: 'text-sky-700 dark:text-cyan-400' },
                  ].map((s, i) => (
                    <div key={i} className={i > 0 ? 'border-l border-[#d4ccbd] dark:border-slate-800' : ''}>
                      <span className="text-[11px] sm:text-xs uppercase font-extrabold text-slate-700 dark:text-slate-400 tracking-wider block">{s.label}</span>
                      <span className={`text-sm sm:text-base font-black ${s.color}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-warm-800/60 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-mono block uppercase font-bold tracking-wider">Base Price</span>
                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-sand-200 font-mono">₹{(player.basePrice || defaultBase).toLocaleString()}</span>
                </div>
                <div>
                  {isCap && buyerTeam ? (
                    <span 
                      className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider border flex items-center space-x-1.5 font-mono bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 shadow-sm"
                    >
                      <Crown className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      <span>{buyerTeam.logo} {buyerTeam.shortName} · 0 PTS (Captain)</span>
                    </span>
                  ) : player.status === 'sold' && buyerTeam ? (
                    <span 
                      className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider border flex items-center space-x-1.5 font-mono shadow-md"
                      style={{ 
                        backgroundColor: `${buyerTeam.color || '#10b981'}20`, 
                        color: buyerTeam.color || '#10b981',
                        borderColor: `${buyerTeam.color || '#10b981'}50`,
                        boxShadow: `0 0 10px ${buyerTeam.color || '#10b981'}35`
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{buyerTeam.logo} {buyerTeam.shortName} ₹{player.soldPrice}</span>
                    </span>
                  ) : player.status === 'unsold' ? (
                    <span className="badge-unsold text-xs sm:text-sm font-bold">
                      <XCircle className="w-3.5 h-3.5" />
                      Unsold
                    </span>
                  ) : (
                    <span className="badge-available text-xs sm:text-sm font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
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
              <h3 className="text-xl font-black text-sand-100 flex items-center gap-2 font-sans">
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
                      let baseVal = defaultBase;
                      if (cat === 'Female') { defaultAvatar = '/avatars/female.png'; }
                      else if (cat === 'Master (7-10 yrs)') { defaultAvatar = '/avatars/master.png'; }
                      else if (cat === 'Super Master (11-13 yrs)') { defaultAvatar = '/avatars/super_master.png'; }
                      else if (cat === 'Icon') { baseVal = Math.round(defaultBase * 3); }
                      else if (cat === 'Category A') { baseVal = Math.round(defaultBase * 2); }
                      setNewPlayer({ ...newPlayer, category: cat, avatarUrl: defaultAvatar, basePrice: baseVal });
                    }} 
                    className="warm-input cursor-pointer"
                  >
                    <option value="Male">Male (Adult) — Base: ₹{defaultBase} PTS</option>
                    <option value="Female">Female (Adult) — Base: ₹{defaultBase} PTS</option>
                    <option value="Master (7-10 yrs)">Master (7-10 yrs) — Base: ₹{defaultBase} PTS</option>
                    <option value="Super Master (11-13 yrs)">Super Master (11-13 yrs) — Base: ₹{defaultBase} PTS</option>
                    <option value="Category B">Category B (Default Base: ₹{defaultBase} PTS)</option>
                    <option value="Category A">Category A (Base: ₹{Math.round(defaultBase * 2)} PTS)</option>
                    <option value="Icon">Icon (Base: ₹{Math.round(defaultBase * 3)} PTS)</option>
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

              {/* Tournament Participation & New Joiner Flags */}
              <div className="bg-[#0b1120] p-3.5 rounded-2xl border border-emerald-500/30 space-y-2.5">
                <span className="text-xs font-bold text-emerald-400 font-display block">
                  Tournament Participation & Listing
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#070b14] border border-emerald-500/30 text-xs text-emerald-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPlayer.isPlayingNEPL}
                      onChange={e => setNewPlayer({ ...newPlayer, isPlayingNEPL: e.target.checked })}
                      className="accent-emerald-400 cursor-pointer w-4 h-4"
                    />
                    <span className="font-bold">🏏 Listed to Play in NEPL</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#070b14] border border-cyan-500/30 text-xs text-cyan-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPlayer.isNewJoiner}
                      onChange={e => setNewPlayer({ ...newPlayer, isNewJoiner: e.target.checked })}
                      className="accent-cyan-400 cursor-pointer w-4 h-4"
                    />
                    <span className="font-bold">✨ Mark as New Joiner</span>
                  </label>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Tournament Session / Target</label>
                  <select
                    value={newPlayer.tournamentSession}
                    onChange={e => setNewPlayer({ ...newPlayer, tournamentSession: e.target.value })}
                    className="w-full bg-[#070b14] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
                  >
                    <option value={CURRENT_SEASON_TAG}>{CURRENT_SEASON_TAG} Summer Season (Current)</option>
                    <option value="Next Tournament Session">Next Tournament Session / Entrant</option>
                    <option value="Future Waitlist">Future Session Waitlist</option>
                  </select>
                </div>
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
                    min={defaultBase}
                    step={tournamentSettings?.bidIncrementStep || defaultBase}
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

              {/* Tournament Participation & New Joiner Settings */}
              <div className="bg-emerald-950/25 p-3.5 rounded-2xl border border-emerald-500/30 space-y-2.5">
                <span className="text-xs font-bold text-emerald-400 font-display block">
                  Tournament Participation & Listing
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs text-emerald-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.isPlayingNEPL}
                      onChange={(e) => setEditFormData({ ...editFormData, isPlayingNEPL: e.target.checked })}
                      className="accent-emerald-400 cursor-pointer w-4 h-4"
                    />
                    <span className="font-bold">🏏 Listed to Play in NEPL</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs text-cyan-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.isNewJoiner}
                      onChange={(e) => setEditFormData({ ...editFormData, isNewJoiner: e.target.checked })}
                      className="accent-cyan-400 cursor-pointer w-4 h-4"
                    />
                    <span className="font-bold">✨ Mark as New Joiner</span>
                  </label>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">Tournament Session / Season</label>
                  <select
                    value={editFormData.tournamentSession}
                    onChange={(e) => setEditFormData({ ...editFormData, tournamentSession: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400"
                  >
                    <option value={CURRENT_SEASON_TAG}>{CURRENT_SEASON_TAG} Summer Season (Current)</option>
                    <option value="Next Tournament Session">Next Tournament Session / Entrant</option>
                    <option value="Future Waitlist">Future Session Waitlist</option>
                  </select>
                </div>
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
