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
  Crown,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { updateTeam as apiUpdateTeam, deleteTeam as apiDeleteTeam, updatePlayer as apiUpdatePlayer, isMongoDB } from '../services/api';

export default function TeamsView({ teams, setTeams, players = [], setPlayers }) {
  const { can, usersList } = useAuth();
  const canManage = can('canManageTeams');

  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // Quick Captain Assignment Modal State
  const [captainModalTeam, setCaptainModalTeam] = useState(null);
  const [selectedCaptainId, setSelectedCaptainId] = useState('');

  // Auctioneers list from usersList
  const auctioneers = usersList ? usersList.filter(u => u.role === 'auctioneer' || u.role === 'superuser') : [];

  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    owner: '',
    captainPlayerId: '',
    logo: '🏏',
    totalPurse: 10000,
    maxSquadSize: 8,
    color: '#d4622a',
  });

  const LOGO_OPTIONS = ['🏏', '🦁', '⚡', '👑', '🦅', '⚔️', '🔥', '🛡️', '🎯', '🐯'];
  const COLOR_OPTIONS = ['#d4622a', '#c9a227', '#10b981', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316', '#3b82f6'];

  const openCreateModal = () => {
    setEditingTeam(null);
    setFormData({
      name: '',
      shortName: '',
      owner: '',
      captainPlayerId: '',
      logo: '🏏',
      totalPurse: 10000,
      maxSquadSize: 8,
      color: '#d4622a',
    });
    setShowModal(true);
  };

  const openEditModal = (team) => {
    setEditingTeam(team);
    const existingCaptain = (team.squad || []).find(p => p.isCaptain) || 
      players.find(p => p.captainOfTeamId === team.id || (p.isCaptain && p.soldTo === team.id));

    setFormData({
      name: team.name,
      shortName: team.shortName,
      owner: team.owner || team.captainName || '',
      captainPlayerId: existingCaptain?.id || team.captainId || '',
      logo: team.logo || '🏏',
      totalPurse: team.totalPurse || 10000,
      maxSquadSize: team.maxSquadSize || 8,
      color: team.color || '#d4622a',
    });
    setShowModal(true);
  };

  // Helper to assign a captain to a team with 0 credit
  const applyCaptainAssignment = (targetTeam, newCaptainPlayerId, prevCaptainPlayerId = null) => {
    const teamId = targetTeam.id;
    let updatedSquad = [...(targetTeam.squad || [])];
    
    // 1. If there was a previous captain, remove them from squad and free them
    const oldCaptainId = prevCaptainPlayerId || targetTeam.captainId || updatedSquad.find(p => p.isCaptain)?.id;
    if (oldCaptainId && oldCaptainId !== newCaptainPlayerId) {
      updatedSquad = updatedSquad.filter(p => p.id !== oldCaptainId);
      if (setPlayers) {
        setPlayers(prev => prev.map(p => {
          if (p.id === oldCaptainId && p.soldTo === teamId) {
            const freed = {
              ...p,
              status: 'available',
              soldPrice: 0,
              soldTo: null,
              isCaptain: false,
              isAuctioneer: false,
              captainOfTeamId: null,
            };
            apiUpdatePlayer(oldCaptainId, freed).catch(console.warn);
            return freed;
          }
          return p;
        }));
      }
    }

    // 2. If a new captain player is chosen, add to squad with 0 credit & update player
    let captainPlayer = null;
    if (newCaptainPlayerId) {
      captainPlayer = players.find(p => p.id === newCaptainPlayerId);
      if (captainPlayer) {
        // Remove from existing team if in another team
        updatedSquad = updatedSquad.filter(p => p.id !== newCaptainPlayerId);
        
        const squadMember = {
          id: captainPlayer.id,
          name: captainPlayer.name,
          role: captainPlayer.role,
          category: captainPlayer.category || 'Male',
          soldPrice: 0, // 0 credit deduction!
          avatarUrl: captainPlayer.avatarUrl,
          cricHeroesUrl: captainPlayer.cricHeroesUrl,
          isCaptain: true,
          isAuctioneer: true,
        };

        // Place captain at top of squad
        updatedSquad = [squadMember, ...updatedSquad];

        // Update player record in global state & backend
        if (setPlayers) {
          setPlayers(prev => prev.map(p => {
            if (p.id === newCaptainPlayerId) {
              const updated = {
                ...p,
                status: 'sold',
                soldPrice: 0,
                soldTo: teamId,
                isCaptain: true,
                isAuctioneer: true,
                captainOfTeamId: teamId,
              };
              apiUpdatePlayer(newCaptainPlayerId, updated).catch(console.warn);
              return updated;
            }
            return p;
          }));
        }
      }
    }

    // 3. Recalculate spent purse (sum of soldPrice, captain is 0)
    const spentPurse = updatedSquad.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0);
    const playersCount = updatedSquad.length;

    const updatedTeam = {
      ...targetTeam,
      owner: captainPlayer ? captainPlayer.name : (targetTeam.owner || 'Auctioneer Captain'),
      captainId: captainPlayer ? captainPlayer.id : null,
      captainName: captainPlayer ? captainPlayer.name : null,
      spentPurse,
      playersCount,
      squad: updatedSquad,
    };

    return updatedTeam;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const purse = Number(formData.totalPurse);
    if (!purse || isNaN(purse) || purse <= 0) {
      alert("⚠️ Invalid Purse: Team total purse budget must be a positive number greater than 0!");
      return;
    }

    const maxSquad = Math.max(1, Number(formData.maxSquadSize) || 8);
    const validPurse = Math.max(100, purse);

    if (editingTeam) {
      const baseUpdatedTeam = {
        ...editingTeam,
        name: formData.name.trim(),
        shortName: formData.shortName.trim().toUpperCase() || formData.name.substring(0, 3).toUpperCase(),
        owner: formData.owner.trim() || editingTeam.owner,
        logo: formData.logo,
        totalPurse: validPurse,
        maxSquadSize: maxSquad,
        color: formData.color,
      };

      const finalTeam = applyCaptainAssignment(baseUpdatedTeam, formData.captainPlayerId, editingTeam.captainId);

      // 1. Update React state
      setTeams(prev => prev.map(t => t.id === editingTeam.id ? finalTeam : t));

      // 2. Persist directly to MongoDB Atlas
      apiUpdateTeam(editingTeam.id, finalTeam).catch(err => console.warn('MongoDB team edit error:', err));
    } else {
      const newTeamId = `team-${Date.now()}`;
      const newTeamBase = {
        id: newTeamId,
        name: formData.name.trim(),
        shortName: formData.shortName.trim().toUpperCase() || formData.name.substring(0, 3).toUpperCase(),
        owner: formData.owner.trim() || 'Auctioneer Captain',
        logo: formData.logo,
        color: formData.color,
        gradient: `from-[${formData.color}]/20 to-warm-900`,
        borderColor: `border-[${formData.color}]/40`,
        bgBadge: `bg-[${formData.color}]/20`,
        totalPurse: validPurse,
        maxSquadSize: maxSquad,
        spentPurse: 0,
        playersCount: 0,
        squad: [],
      };

      const finalNewTeam = applyCaptainAssignment(newTeamBase, formData.captainPlayerId);

      // 1. Update React state
      setTeams(prev => [...prev, finalNewTeam]);

      // 2. Persist directly to MongoDB Atlas
      apiUpdateTeam(finalNewTeam.id, finalNewTeam).catch(err => console.warn('MongoDB team create error:', err));
    }

    setShowModal(false);
  };

  const handleQuickAssignCaptain = (e) => {
    e.preventDefault();
    if (!captainModalTeam) return;

    const updated = applyCaptainAssignment(captainModalTeam, selectedCaptainId);
    setTeams(prev => prev.map(t => t.id === captainModalTeam.id ? updated : t));
    apiUpdateTeam(captainModalTeam.id, updated).catch(console.warn);

    setCaptainModalTeam(null);
    setSelectedCaptainId('');
  };

  const handleDeleteTeam = (teamToDelete) => {
    if (!canManage) return;
    if (window.confirm(`Are you sure you want to delete team "${teamToDelete.name}"? All acquired squad members will be returned to the Available pool.`)) {
      // 1. Remove team from React state
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
              isCaptain: false,
              isAuctioneer: false,
              captainOfTeamId: null,
            };
          }
          return p;
        }));
      }

      // 3. Delete directly from MongoDB Atlas
      apiDeleteTeam(teamToDelete.id).catch(err => console.warn('MongoDB team delete error:', err));
    }
  };

  const handleReleaseTopPlayer = (team) => {
    if (!team.squad || team.squad.length === 0) {
      alert(`No players in ${team.name}'s squad to release!`);
      return;
    }

    // Never release the captain via refund; pick highest non-captain
    const nonCaptainSquad = team.squad.filter(p => !p.isCaptain);
    if (nonCaptainSquad.length === 0) {
      alert(`The only player in ${team.name}'s squad is the Team Captain (0 PTS). Use "Change Captain" to reassign.`);
      return;
    }

    const topPlayer = [...nonCaptainSquad].reduce((highest, current) => {
      const highestCost = highest.soldPrice || highest.basePrice || 0;
      const currentCost = current.soldPrice || current.basePrice || 0;
      return currentCost > highestCost ? current : highest;
    }, nonCaptainSquad[0]);

    const refundAmount = topPlayer.soldPrice || topPlayer.basePrice || 0;

    if (window.confirm(
      `⚠️ RELEASE TOP BIDDED PLAYER?\n\nDo you want to release ${topPlayer.name} (Sold for ₹${refundAmount} PTS) from ${team.name}?\n\nThis will:\n1. Return ${topPlayer.name} to the Available Auction Pool\n2. Refund ₹${refundAmount} PTS back to ${team.name}'s purse budget`
    )) {
      const updatedSquad = (team.squad || []).filter(p => p.id !== topPlayer.id);
      const updatedTeam = {
        ...team,
        spentPurse: Math.max(0, team.spentPurse - refundAmount),
        playersCount: Math.max(0, (team.playersCount || updatedSquad.length) - 1),
        squad: updatedSquad,
      };

      setTeams(prevTeams => prevTeams.map(t => t.id === team.id ? updatedTeam : t));

      if (setPlayers) {
        setPlayers(prevPlayers => prevPlayers.map(p => {
          if (p.id === topPlayer.id) {
            return {
              ...p,
              status: 'available',
              soldPrice: 0,
              soldTo: null,
              currentBid: 0,
              leadingTeam: null,
            };
          }
          return p;
        }));
      }

      apiUpdateTeam(team.id, updatedTeam).catch(err => console.warn('MongoDB release player error:', err));
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
            {teams.length} Teams registered · Track team purses, auctioneer captains (0 PTS default squad), and squad compositions.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          {canManage ? (
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-terracotta-600/20 transition cursor-pointer"
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
          const maxCapacity = team.maxSquadSize || 8;
          const isFull = squad.length >= maxCapacity;
          
          const captainInSquad = squad.find(p => p.isCaptain) || 
            players.find(p => p.captainOfTeamId === team.id || (p.isCaptain && p.soldTo === team.id));
          
          const battersCount = squad.filter(p => (p.role || '').includes('Batsman') || (p.role || '').includes('Pure')).length;
          const bowlersCount = squad.filter(p => (p.role || '').includes('Bowler') || (p.role || '').includes('Spin') || (p.role || '').includes('Fast')).length;
          const allRoundersCount = squad.filter(p => (p.role || '').includes('All-Rounder')).length;
          const wkCount = squad.filter(p => (p.role || '').includes('Keeper')).length;

          return (
            <div
              key={team.id}
              className="glass-panel p-6 pl-7 rounded-3xl border border-warm-700/50 space-y-5 relative overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:border-warm-600"
            >
              {/* 🌟 Glowing Team Color Top Ribbon */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300"
                style={{
                  backgroundColor: team.color || '#d4622a',
                  boxShadow: `0 0 20px ${team.color || '#d4622a'}, 0 0 8px ${team.color || '#d4622a'}`
                }}
              />

              {/* 🌟 Left Vertical Team Color Ribbon Stripe */}
              <div
                className="absolute top-0 bottom-0 left-0 w-2 transition-all duration-300"
                style={{
                  backgroundColor: team.color || '#d4622a',
                  boxShadow: `0 0 15px ${team.color || '#d4622a'}`
                }}
              />

              <div>
                {/* Team header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <span
                      className="text-3xl p-2.5 rounded-2xl border transition-all duration-300 shadow-md"
                      style={{
                        backgroundColor: `${team.color || '#d4622a'}15`,
                        borderColor: `${team.color || '#d4622a'}40`
                      }}
                    >
                      {team.logo}
                    </span>
                    <div>
                      <h3 className="text-xl font-extrabold text-sand-100 tracking-tight font-serif flex items-center gap-2">
                        {team.name}
                        {/* High Visibility Team Color Ribbon Badge */}
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border font-mono shadow-sm"
                          style={{
                            backgroundColor: `${team.color || '#d4622a'}20`,
                            color: team.color || '#d4622a',
                            borderColor: `${team.color || '#d4622a'}50`,
                            boxShadow: `0 0 12px ${team.color || '#d4622a'}35`
                          }}
                        >
                          {team.shortName}
                        </span>
                      </h3>
                      
                      {/* Captain & Auctioneer Highlight */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                          <Crown className="w-3 h-3 text-amber-400" />
                          <Zap className="w-2.5 h-2.5 text-cyan-300" />
                          Captain: <strong className="text-sand-100">{captainInSquad ? captainInSquad.name : (team.owner || 'Unassigned')}</strong>
                          <span className="text-[9px] text-amber-400/80 font-mono ml-0.5">(0 PTS)</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wider ${isFull
                        ? 'bg-cricket-emerald/15 text-cricket-emerald border border-cricket-emerald/30'
                        : 'bg-[#c9a227]/15 text-[#c9a227] border border-[#c9a227]/30'
                      }`}>
                      {squad.length}/{maxCapacity}
                    </span>

                    {/* Super Admin Controls */}
                    {canManage && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setCaptainModalTeam(team);
                            setSelectedCaptainId(captainInSquad?.id || '');
                          }}
                          className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition cursor-pointer"
                          title="Assign or Change Team Captain & Auctioneer"
                        >
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(team)}
                          className="p-1.5 rounded-lg bg-warm-900 hover:bg-warm-800 text-sand-400 hover:text-sand-200 border border-warm-700 transition cursor-pointer"
                          title="Edit Team Settings"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team)}
                          className="p-1.5 rounded-lg bg-warm-900 hover:bg-red-950/80 text-sand-500 hover:text-rose-400 border border-warm-700 hover:border-red-500/40 transition cursor-pointer"
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
                      { label: 'Total Budget', value: `₹${team.totalPurse}`, color: 'text-sand-200' },
                      { label: 'Spent Purse', value: `₹${team.spentPurse}`, color: 'text-rose-400' },
                      { label: 'Remaining', value: `₹${remainingPurse}`, color: 'text-emerald-400' },
                    ].map((s, i) => (
                      <div key={i} className={i > 0 ? 'border-l border-warm-800' : ''}>
                        <span className="text-slate-500 text-[9px] uppercase font-semibold block">{s.label}</span>
                        <span className={`text-sm font-black ${s.color} font-mono`}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-full bg-warm-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 transition-all duration-500"
                      style={{ width: `${Math.max(0, Math.min(100, (remainingPurse / team.totalPurse) * 100))}%` }}
                    />
                  </div>

                  {/* Release Player Action */}
                  {squad.filter(p => !p.isCaptain).length > 0 && (can('canBid') || canManage) && (
                    <div className="pt-2 border-t border-warm-800/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">
                        Purse Refund Available:
                      </span>
                      <button
                        onClick={() => handleReleaseTopPlayer(team)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-bold tracking-wider uppercase transition shadow-sm cursor-pointer"
                        title="Release highest bidded player back to auction pool to refund purse"
                      >
                        ⚡ Release Top Player
                      </button>
                    </div>
                  )}
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
                    <span>Squad Members ({squad.length})</span>
                    {squad.length < maxCapacity && (
                      <span className="text-[#c9a227] text-[10px] font-mono">
                        Needs {maxCapacity - squad.length} more players
                      </span>
                    )}
                  </h4>

                  {squad.length > 0 ? (
                    <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                      {squad.map(player => {
                        const isCap = Boolean(player.isCaptain);
                        return (
                          <div
                            key={player.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition ${
                              isCap 
                                ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                                : 'bg-warm-900/80 border-warm-800/60 hover:border-warm-700'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <img
                                  src={player.avatarUrl || '/avatars/male.png'}
                                  alt={player.name}
                                  className={`w-9 h-9 rounded-lg object-cover border ${
                                    isCap ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-warm-700'
                                  }`}
                                  onError={e => { e.target.src = '/avatars/male.png'; }}
                                />
                                {isCap && (
                                  <span className="absolute -top-1.5 -right-1.5 p-0.5 bg-amber-400 text-slate-950 rounded-full shadow">
                                    <Crown className="w-2.5 h-2.5" />
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <h5 className="font-bold text-sand-100 text-xs flex items-center gap-1">
                                    {player.name}
                                    {isCap && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-tight bg-amber-500/25 text-amber-300 border border-amber-500/40">
                                        Captain
                                      </span>
                                    )}
                                  </h5>
                                  {player.cricHeroesUrl && (
                                    <a href={player.cricHeroesUrl} target="_blank" rel="noreferrer" className="text-[#c9a227] hover:text-[#f5c842]">
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                                <p className="text-[10px] text-sand-500">{player.role}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {isCap ? (
                                <div>
                                  <span className="font-extrabold text-amber-400 text-xs font-mono">0 PTS</span>
                                  <span className="block text-[8px] text-amber-400/70 uppercase font-bold tracking-tighter">Captain Default</span>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-extrabold text-cricket-emerald text-xs font-mono">₹{player.soldPrice} PTS</span>
                                  <span className="block text-[9px] text-sand-600 uppercase">{player.category}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center rounded-xl bg-warm-950/40 border border-dashed border-warm-700 text-sand-600 text-xs font-mono">
                      No players acquired yet. Assign a Captain or win bids during auction.
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
                <span className="text-[#c9a227] font-medium flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  Captain retained for 0 credit
                </span>
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
                className="p-1.5 rounded-lg text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700 cursor-pointer"
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

              {/* 👑 Team Captain & Auctioneer Selection (Auto 0 Credit Squad Member) */}
              <div className="bg-amber-950/25 p-4 rounded-2xl border border-amber-500/30 space-y-2">
                <label className="text-xs font-bold text-amber-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-400" />
                    Team Captain & Auctioneer (0 PTS)
                  </span>
                  <span className="text-[9px] text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded font-mono">Auto 0 Credit Squad</span>
                </label>

                <select
                  value={formData.captainPlayerId}
                  onChange={e => setFormData({ ...formData, captainPlayerId: e.target.value })}
                  className="warm-input cursor-pointer font-sans"
                >
                  <option value="">-- None (No Playing Captain Assigned) --</option>
                  {players.map(p => {
                    const isAlreadyCap = p.isCaptain && p.captainOfTeamId && p.captainOfTeamId !== editingTeam?.id;
                    const otherTeam = isAlreadyCap ? teams.find(t => t.id === p.captainOfTeamId) : null;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.role} {otherTeam ? `(Captain of ${otherTeam.name})` : p.status === 'sold' && p.soldTo !== editingTeam?.id ? '(Sold)' : '(Available)'}
                      </option>
                    );
                  })}
                </select>

                <p className="text-[10px] text-sand-400 leading-relaxed">
                  Selecting a player automatically designates them as the <strong>Team Captain & Auctioneer</strong> and places them directly into the team squad with <strong>0 Credit (₹0 PTS)</strong> deduction.
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
                          className={`p-1 text-sm rounded-lg border transition cursor-pointer ${formData.logo === emoji
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

                {/* Bidding Purse & Squad Capacity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-cyan-300 block mb-1.5 font-display">
                      Purse Budget (PTS)
                    </label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={formData.totalPurse}
                      onChange={e => setFormData({ ...formData, totalPurse: e.target.value })}
                      className="warm-input font-mono"
                      placeholder="e.g. 10000"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-cyan-300 block mb-1.5 font-display">
                      Max Squad Size
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={30}
                      value={formData.maxSquadSize}
                      onChange={e => setFormData({ ...formData, maxSquadSize: e.target.value })}
                      className="warm-input font-mono"
                      placeholder="8"
                    />
                  </div>
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
                        className={`w-7 h-7 rounded-lg border transition cursor-pointer ${formData.color === c ? 'ring-2 ring-white scale-110' : 'border-warm-700'
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
                  className="btn-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary cursor-pointer">
                  {editingTeam ? 'Save Team Changes' : 'Create Team'}
                </button>
              </div>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* ── Quick Assign Captain Modal ── */}
      {captainModalTeam && canManage && createPortal(
        <div className="fixed inset-0 z-[100] bg-warm-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="warm-card w-full max-w-md p-6 rounded-3xl border border-amber-500/40 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-warm-700 pb-3">
              <h3 className="text-lg font-bold text-sand-100 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                Assign Captain for {captainModalTeam.name}
              </h3>
              <button
                onClick={() => setCaptainModalTeam(null)}
                className="p-1.5 rounded-lg text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAssignCaptain} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-sand-300 block mb-1.5">
                  Select Player (Assigned with 0 Credit)
                </label>
                <select
                  value={selectedCaptainId}
                  onChange={e => setSelectedCaptainId(e.target.value)}
                  className="warm-input cursor-pointer"
                >
                  <option value="">-- Remove Current Captain --</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.role} ({p.status === 'sold' && p.soldTo !== captainModalTeam.id ? 'In other team' : 'Available'})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-amber-400/80 mt-1.5">
                  ⚡ The chosen player will be automatically placed in {captainModalTeam.name}'s squad for 0 credit without reducing the budget.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-warm-800">
                <button
                  type="button"
                  onClick={() => setCaptainModalTeam(null)}
                  className="btn-secondary text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Save Captain Assignment
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
