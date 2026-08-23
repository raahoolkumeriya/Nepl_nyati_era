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
  ArrowLeftRight,
  ArrowRight,
  Shuffle,
  Sliders,
  PlusCircle,
  Search,
  UserPlus,
  Repeat,
  Palette,
  Check
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { updateTeam as apiUpdateTeam, deleteTeam as apiDeleteTeam, updatePlayer as apiUpdatePlayer, isMongoDB } from '../services/api';
import { TEAM_COLOR_THEMES, getThemeByColor, getThemeByIndex } from '../data/teamThemes';

export default function TeamsView({ teams, setTeams, players = [], setPlayers, onOpenAiChat }) {
  const { can, usersList } = useAuth();
  const canManage = can('canManageTeams');

  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // Quick Captain Assignment Modal State
  const [captainModalTeam, setCaptainModalTeam] = useState(null);
  const [selectedCaptainId, setSelectedCaptainId] = useState('');

  // Super Admin Player Swap Modal State
  const [swapModal, setSwapModal] = useState({
    isOpen: false,
    fromTeam: null,
    player: null,
    toTeamId: '',
    targetPlayerId: ''
  });

  // Super Admin / Developer Team Name Override Modal State
  const [renameModal, setRenameModal] = useState({
    isOpen: false,
    team: null,
    name: '',
    shortName: ''
  });

  const openRenameModal = (team) => {
    setRenameModal({
      isOpen: true,
      team,
      name: team.name || '',
      shortName: team.shortName || (team.name ? team.name.substring(0, 3).toUpperCase() : '')
    });
  };

  const handleSaveRename = (e) => {
    e.preventDefault();
    if (!renameModal.team || !renameModal.name.trim()) return;

    const updatedName = renameModal.name.trim();
    const updatedShortName = renameModal.shortName.trim().toUpperCase() || updatedName.substring(0, 3).toUpperCase();

    const updatedTeam = {
      ...renameModal.team,
      name: updatedName,
      shortName: updatedShortName
    };

    setTeams(prev => prev.map(t => t.id === renameModal.team.id ? updatedTeam : t));
    apiUpdateTeam(renameModal.team.id, updatedTeam).catch(err => console.warn('MongoDB team rename error:', err));

    setRenameModal({ isOpen: false, team: null, name: '', shortName: '' });
  };

  // Super Admin Transfer Player Modal State
  const [transferModal, setTransferModal] = useState({
    isOpen: false,
    fromTeam: null,
    player: null,
    toTeamId: ''
  });

  // Super Admin Add Free Player to Squad Modal State
  const [addPlayerModal, setAddPlayerModal] = useState({
    isOpen: false,
    team: null,
    selectedPlayerId: '',
    search: ''
  });

  // Super Admin Bulk Roster Override Hub Modal State
  const [rosterHubOpen, setRosterHubOpen] = useState(false);

  // Auctioneers list from usersList
  const auctioneers = usersList ? usersList.filter(u => u.role === 'auctioneer' || u.role === 'superuser') : [];

  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    owner: '',
    captainPlayerId: '',
    logo: '🏏',
    totalPurse: 10000,
    maxSquadSize: 10,
    color: '#d4622a',
  });

  const LOGO_OPTIONS = ['🏏', '🦁', '⚡', '👑', '🦅', '⚔️', '🔥', '🛡️', '🎯', '🐯', '🌪️', '🐆'];

  const openCreateModal = () => {
    setEditingTeam(null);
    // Find first unused color theme
    const usedColors = new Set(teams.map(t => (t.color || '').toLowerCase()));
    const availableTheme = TEAM_COLOR_THEMES.find(t => !usedColors.has(t.color.toLowerCase())) || TEAM_COLOR_THEMES[0];

    setFormData({
      name: availableTheme.name,
      shortName: availableTheme.shortName,
      owner: '',
      captainPlayerId: '',
      logo: availableTheme.logo,
      totalPurse: 10000,
      maxSquadSize: 10,
      color: availableTheme.color,
    });
    setShowModal(true);
  };

  const handleSelectTheme = (theme) => {
    setFormData(prev => ({
      ...prev,
      color: theme.color,
      name: theme.name,
      shortName: theme.shortName,
      logo: theme.logo,
    }));
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
      maxSquadSize: team.maxSquadSize || 10,
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

    const maxSquad = Math.max(1, Number(formData.maxSquadSize) || 10);
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

  // ── Super Admin Override Handlers ──────────────────────────────────────────

  const handleQuickSwap = (fromTeam, player) => {
    if (!canManage) return;
    const otherTeams = teams.filter(t => t.id !== fromTeam.id);
    const defaultToTeam = otherTeams[0] || null;
    const defaultTargetPlayer = (defaultToTeam?.squad || [])[0] || null;

    setSwapModal({
      isOpen: true,
      fromTeam,
      player,
      toTeamId: defaultToTeam ? defaultToTeam.id : '',
      targetPlayerId: defaultTargetPlayer ? defaultTargetPlayer.id : ''
    });
  };

  const executeSwap = (fromTeamId, p1Id, toTeamId, p2Id) => {
    const team1 = teams.find(t => t.id === fromTeamId);
    const team2 = teams.find(t => t.id === toTeamId);
    const p1 = players.find(p => p.id === p1Id) || (team1?.squad || []).find(p => p.id === p1Id);
    const p2 = players.find(p => p.id === p2Id) || (team2?.squad || []).find(p => p.id === p2Id);
    if (!team1 || !team2 || !p1 || !p2) return;

    // Swap members
    const newSquad1 = (team1.squad || []).map(p => p.id === p1Id ? {
      id: p2.id,
      name: p2.name,
      role: p2.role,
      category: p2.category || 'Male',
      soldPrice: p.isCaptain ? 0 : (p2.soldPrice || 0),
      avatarUrl: p2.avatarUrl,
      cricHeroesUrl: p2.cricHeroesUrl,
      isCaptain: p.isCaptain,
      ratings: p2.ratings || {}
    } : p);

    const newSquad2 = (team2.squad || []).map(p => p.id === p2Id ? {
      id: p1.id,
      name: p1.name,
      role: p1.role,
      category: p1.category || 'Male',
      soldPrice: p.isCaptain ? 0 : (p1.soldPrice || 0),
      avatarUrl: p1.avatarUrl,
      cricHeroesUrl: p1.cricHeroesUrl,
      isCaptain: p.isCaptain,
      ratings: p1.ratings || {}
    } : p);

    const updatedTeam1 = {
      ...team1,
      squad: newSquad1,
      playersCount: newSquad1.length,
      spentPurse: newSquad1.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0)
    };
    const updatedTeam2 = {
      ...team2,
      squad: newSquad2,
      playersCount: newSquad2.length,
      spentPurse: newSquad2.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0)
    };

    setTeams(prev => prev.map(t => t.id === fromTeamId ? updatedTeam1 : t.id === toTeamId ? updatedTeam2 : t));

    if (setPlayers) {
      setPlayers(prev => prev.map(p => {
        if (p.id === p1Id) {
          const up = { ...p, soldTo: toTeamId, isCaptain: Boolean(newSquad2.find(m => m.id === p1Id)?.isCaptain), status: 'sold' };
          apiUpdatePlayer(p1Id, up).catch(console.warn);
          return up;
        }
        if (p.id === p2Id) {
          const up = { ...p, soldTo: fromTeamId, isCaptain: Boolean(newSquad1.find(m => m.id === p2Id)?.isCaptain), status: 'sold' };
          apiUpdatePlayer(p2Id, up).catch(console.warn);
          return up;
        }
        return p;
      }));
    }

    apiUpdateTeam(fromTeamId, updatedTeam1).catch(console.warn);
    apiUpdateTeam(toTeamId, updatedTeam2).catch(console.warn);

    setSwapModal({ isOpen: false, fromTeam: null, player: null, toTeamId: '', targetPlayerId: '' });
  };

  const handleQuickTransfer = (fromTeam, player) => {
    if (!canManage) return;
    const otherTeams = teams.filter(t => t.id !== fromTeam.id);
    const defaultToTeam = otherTeams[0] || null;

    setTransferModal({
      isOpen: true,
      fromTeam,
      player,
      toTeamId: defaultToTeam ? defaultToTeam.id : ''
    });
  };

  const executeTransfer = (fromTeamId, toTeamId, playerId) => {
    const fromTeam = teams.find(t => t.id === fromTeamId);
    const toTeam = teams.find(t => t.id === toTeamId);
    const playerObj = players.find(p => p.id === playerId) || (fromTeam?.squad || []).find(p => p.id === playerId);
    if (!fromTeam || !toTeam || !playerObj) return;

    const newFromSquad = (fromTeam.squad || []).filter(p => p.id !== playerId);
    const newToSquad = [...(toTeam.squad || []).filter(p => p.id !== playerId), {
      id: playerObj.id,
      name: playerObj.name,
      role: playerObj.role,
      category: playerObj.category || 'Male',
      soldPrice: 0,
      avatarUrl: playerObj.avatarUrl,
      cricHeroesUrl: playerObj.cricHeroesUrl,
      isCaptain: false,
      ratings: playerObj.ratings || {}
    }];

    const updatedFrom = {
      ...fromTeam,
      squad: newFromSquad,
      playersCount: newFromSquad.length,
      spentPurse: newFromSquad.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0),
      captainId: fromTeam.captainId === playerId ? null : fromTeam.captainId,
      captainName: fromTeam.captainId === playerId ? null : fromTeam.captainName,
    };
    const updatedTo = {
      ...toTeam,
      squad: newToSquad,
      playersCount: newToSquad.length,
      spentPurse: newToSquad.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0),
    };

    setTeams(prev => prev.map(t => t.id === fromTeamId ? updatedFrom : t.id === toTeamId ? updatedTo : t));

    if (setPlayers) {
      setPlayers(prev => prev.map(p => {
        if (p.id === playerId) {
          const up = { ...p, soldTo: toTeamId, isCaptain: false, status: 'sold', captainOfTeamId: null };
          apiUpdatePlayer(playerId, up).catch(console.warn);
          return up;
        }
        return p;
      }));
    }

    apiUpdateTeam(fromTeamId, updatedFrom).catch(console.warn);
    apiUpdateTeam(toTeamId, updatedTo).catch(console.warn);

    setTransferModal({ isOpen: false, fromTeam: null, player: null, toTeamId: '' });
  };

  const handleQuickAddPlayer = (team) => {
    if (!canManage) return;
    const availablePool = players.filter(p => p.status === 'available' || !p.soldTo);
    setAddPlayerModal({
      isOpen: true,
      team,
      selectedPlayerId: availablePool[0]?.id || '',
      search: ''
    });
  };

  const executeAddPlayer = (teamId, playerId) => {
    const targetTeam = teams.find(t => t.id === teamId);
    const playerObj = players.find(p => p.id === playerId);
    if (!targetTeam || !playerObj) return;

    const newSquad = [...(targetTeam.squad || []).filter(p => p.id !== playerId), {
      id: playerObj.id,
      name: playerObj.name,
      role: playerObj.role,
      category: playerObj.category || 'Male',
      soldPrice: 0,
      avatarUrl: playerObj.avatarUrl || '/avatars/male.png',
      cricHeroesUrl: playerObj.cricHeroesUrl || '',
      isCaptain: false,
      ratings: playerObj.ratings || {}
    }];

    const updated = {
      ...targetTeam,
      squad: newSquad,
      playersCount: newSquad.length,
      spentPurse: newSquad.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0)
    };

    setTeams(prev => prev.map(t => t.id === teamId ? updated : t));

    if (setPlayers) {
      setPlayers(prev => prev.map(p => {
        if (p.id === playerId) {
          const up = { ...p, soldTo: teamId, status: 'sold', soldPrice: 0, isCaptain: false };
          apiUpdatePlayer(playerId, up).catch(console.warn);
          return up;
        }
        return p;
      }));
    }

    apiUpdateTeam(teamId, updated).catch(console.warn);
    setAddPlayerModal({ isOpen: false, team: null, selectedPlayerId: '', search: '' });
  };

  const handleRemoveSquadPlayer = (team, player) => {
    if (!canManage) return;
    if (window.confirm(`Remove "${player.name}" from ${team.name}? They will become available as a free agent in the player pool.`)) {
      const newSquad = (team.squad || []).filter(p => p.id !== player.id);
      const isCap = Boolean(player.isCaptain || team.captainId === player.id);

      const updated = {
        ...team,
        squad: newSquad,
        playersCount: newSquad.length,
        spentPurse: newSquad.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0),
        captainId: isCap ? null : team.captainId,
        captainName: isCap ? null : team.captainName,
      };

      setTeams(prev => prev.map(t => t.id === team.id ? updated : t));

      if (setPlayers) {
        setPlayers(prev => prev.map(p => {
          if (p.id === player.id) {
            const up = { ...p, status: 'available', soldTo: null, soldPrice: 0, isCaptain: false, isAuctioneer: false, captainOfTeamId: null };
            apiUpdatePlayer(player.id, up).catch(console.warn);
            return up;
          }
          return p;
        }));
      }

      apiUpdateTeam(team.id, updated).catch(console.warn);
    }
  };

  const handleMakeSquadCaptain = (team, player) => {
    if (!canManage) return;
    if (window.confirm(`Designate "${player.name}" as Captain & Auctioneer of ${team.name}?`)) {
      const updated = applyCaptainAssignment(team, player.id, team.captainId);
      setTeams(prev => prev.map(t => t.id === team.id ? updated : t));
      apiUpdateTeam(team.id, updated).catch(console.warn);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-warm-700/50">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-sand-100 flex items-center gap-2.5 font-sans tracking-tight">
            <Users className="w-7 h-7 text-terracotta-400" />
            Team Squads & Purse Balance
          </h2>
          <p className="text-sand-500 text-xs mt-1">
            {teams.length} Teams registered · Track team purses, auctioneer captains, and squad rosters. Super Admin can override or swap players anytime.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs font-sans">
          {canManage && (
            <button
              onClick={() => setRosterHubOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs shadow-[0_0_12px_rgba(0,242,254,0.25)] transition cursor-pointer"
              title="Super Admin: Roster Override & Player Swapper Hub"
            >
              <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
              <span>Roster Override Hub</span>
            </button>
          )}

          {onOpenAiChat && (
            <button
              onClick={onOpenAiChat}
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(168,85,247,0.4)] transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" />
              <span>AI Team Balancer</span>
            </button>
          )}

          {canManage ? (
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-500 text-white font-bold text-xs shadow-lg shadow-terracotta-600/20 transition cursor-pointer"
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

      {/* ── Teams Grid (Big 2-Team View for Maximum Readability) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {teams.map(team => {
          const squad = team.squad || [];
          const remainingPurse = team.totalPurse - team.spentPurse;
          const maxCapacity = team.maxSquadSize || 10;
          const isFull = squad.length >= maxCapacity;
          
          const captainInSquad = squad.find(p => p.isCaptain) || 
            players.find(p => p.captainOfTeamId === team.id || (p.isCaptain && p.soldTo === team.id)) ||
            (team.captainId ? squad.find(p => p.id === team.captainId) : null);
          
          const battersCount = squad.filter(p => (p.role || '').includes('Batsman') || (p.role || '').includes('Pure')).length;
          const bowlersCount = squad.filter(p => (p.role || '').includes('Bowler') || (p.role || '').includes('Spin') || (p.role || '').includes('Fast')).length;
          const allRoundersCount = squad.filter(p => (p.role || '').includes('All-Rounder')).length;
          const wkCount = squad.filter(p => (p.role || '').includes('Keeper')).length;

          return (
            <div
              key={team.id}
              className="glass-panel p-6 sm:p-8 pl-7 sm:pl-9 rounded-3xl border border-warm-700/60 space-y-6 relative overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:border-warm-500 shadow-2xl"
              style={{
                boxShadow: `0 16px 45px -10px ${team.color || '#d4622a'}45, 0 4px 20px -2px ${team.color || '#d4622a'}25`
              }}
            >
              {/* 🌟 Unified Seamless Top-Left Curved Accent Ribbon */}
              <div
                className="absolute inset-0 pointer-events-none rounded-3xl transition-all duration-300"
                style={{
                  borderTop: `3px solid ${team.color || '#d4622a'}`,
                  borderLeft: `3px solid ${team.color || '#d4622a'}`,
                  borderTopLeftRadius: '1.5rem',
                  boxShadow: `inset 2px 2px 18px -2px ${team.color || '#d4622a'}50, 0 0 24px -2px ${team.color || '#d4622a'}60`,
                  maskImage: 'linear-gradient(135deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0) 70%)',
                  WebkitMaskImage: 'linear-gradient(135deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0) 70%)'
                }}
              />

              {/* Ambient Corner Glow Halo */}
              <div 
                className="absolute -top-10 -left-10 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-35 transition-all duration-500 group-hover:opacity-60"
                style={{
                  backgroundColor: team.color || '#d4622a'
                }}
              />

              <div>
                {/* Team header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center space-x-4 min-w-0 flex-1">
                    <span
                      className="text-4xl p-3.5 rounded-2xl border transition-all duration-300 shadow-lg shrink-0"
                      style={{
                        backgroundColor: `${team.color || '#d4622a'}20`,
                        borderColor: `${team.color || '#d4622a'}50`,
                        boxShadow: `0 0 20px ${team.color || '#d4622a'}30`
                      }}
                    >
                      {team.logo}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-sand-100 tracking-tight font-sans flex items-center gap-2">
                          <span>{team.name}</span>
                        </h3>
                        
                        {/* High Visibility Team Color Ribbon Badge */}
                        <span
                          className="px-3 py-1 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest border font-mono shadow-sm"
                          style={{
                            backgroundColor: `${team.color || '#d4622a'}25`,
                            color: team.color || '#d4622a',
                            borderColor: `${team.color || '#d4622a'}60`,
                            boxShadow: `0 0 12px ${team.color || '#d4622a'}35`
                          }}
                        >
                          {team.shortName}
                        </span>

                        {/* Developer & Admin Quick Rename Button */}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => openRenameModal(team)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer"
                            title={`Rename team "${team.name}" with custom name`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Rename</span>
                          </button>
                        )}
                      </div>
                      
                      {/* Captain & Theme Identity Highlight */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs sm:text-sm font-bold shadow-sm">
                          <Crown className="w-4 h-4 text-amber-400" />
                          <Zap className="w-3 h-3 text-cyan-300" />
                          <span>Captain: <strong className="text-sand-100 font-extrabold">{captainInSquad ? captainInSquad.name : (team.owner || 'Unassigned')}</strong></span>
                          <span className="text-[10px] text-amber-400 font-mono ml-0.5">(0 PTS)</span>
                        </span>

                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs sm:text-sm font-mono font-bold"
                          style={{
                            backgroundColor: `${team.color || '#d4622a'}15`,
                            borderColor: `${team.color || '#d4622a'}40`,
                            color: team.color || '#d4622a'
                          }}
                        >
                          <Palette className="w-3.5 h-3.5" />
                          <span>{getThemeByColor(team.color)?.label || 'Franchise Identity'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider ${isFull
                        ? 'bg-cricket-emerald/20 text-cricket-emerald border border-cricket-emerald/40'
                        : 'bg-[#c9a227]/20 text-[#c9a227] border border-[#c9a227]/40'
                      }`}>
                      {squad.length}/{maxCapacity}
                    </span>

                    {/* Super Admin Controls */}
                    {canManage && (
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => {
                            setCaptainModalTeam(team);
                            setSelectedCaptainId(captainInSquad?.id || '');
                          }}
                          className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/35 transition cursor-pointer"
                          title="Assign or Change Team Captain & Auctioneer"
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(team)}
                          className="p-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/35 transition cursor-pointer"
                          title="Edit Team Theme, Color, Budget & Name"
                        >
                          <Palette className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team)}
                          className="p-2 rounded-xl bg-warm-900 hover:bg-red-950/80 text-sand-500 hover:text-rose-400 border border-warm-700 hover:border-red-500/40 transition cursor-pointer"
                          title={`Delete team ${team.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Purse Stats with Modern Team Color Glow Shadow */}
                <div 
                  className="mt-6 bg-warm-950/75 p-5 rounded-2xl border space-y-3.5 transition-all duration-300 shadow-xl"
                  style={{
                    borderColor: `${team.color || '#d4622a'}35`,
                    boxShadow: `0 10px 30px -6px ${team.color || '#d4622a'}30, inset 0 0 24px -10px ${team.color || '#d4622a'}20`
                  }}
                >
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: 'Total Budget', value: `₹${team.totalPurse}`, color: 'text-sand-100' },
                      { label: 'Spent Purse', value: `₹${team.spentPurse}`, color: 'text-rose-400' },
                      { label: 'Remaining Purse', value: `₹${remainingPurse}`, color: 'text-emerald-400' },
                    ].map((s, i) => (
                      <div key={i} className={i > 0 ? 'border-l border-warm-800' : ''}>
                        <span className="text-slate-400 text-xs uppercase font-bold tracking-wider block">{s.label}</span>
                        <span className={`text-base sm:text-2xl font-black ${s.color} font-mono mt-0.5 block`}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-full bg-warm-900 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 transition-all duration-500"
                      style={{ width: `${Math.max(0, Math.min(100, (remainingPurse / team.totalPurse) * 100))}%` }}
                    />
                  </div>

                  {/* Release Player Action */}
                  {squad.filter(p => !p.isCaptain).length > 0 && (can('canBid') || canManage) && (
                    <div className="pt-2.5 border-t border-warm-800/60 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-mono">
                        Purse Refund Available:
                      </span>
                      <button
                        onClick={() => handleReleaseTopPlayer(team)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold tracking-wider uppercase transition shadow-sm cursor-pointer"
                        title="Release highest bidded player back to auction pool to refund purse"
                      >
                        ⚡ Release Top Player
                      </button>
                    </div>
                  )}
                </div>

                {/* Role breakdown */}
                <div className="mt-4 flex flex-wrap gap-2.5 text-xs sm:text-sm font-semibold">
                  {[
                    { label: 'Batters', count: battersCount },
                    { label: 'Bowlers', count: bowlersCount },
                    { label: 'All-Rounders', count: allRoundersCount },
                    { label: 'WK', count: wkCount },
                  ].map(r => (
                    <span key={r.label} className="px-3 py-1.5 rounded-xl bg-warm-900 border border-warm-700 text-sand-300 font-bold">
                      {r.label}: <strong className="text-sand-100 font-extrabold">{r.count}</strong>
                    </span>
                  ))}
                </div>

                {/* Squad roster */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm sm:text-base font-extrabold text-sand-300 flex items-center gap-2 font-sans">
                      <span>Squad Members ({squad.length})</span>
                      {squad.length < maxCapacity && (
                        <span className="text-amber-400 text-xs font-mono font-bold">
                          (Needs {maxCapacity - squad.length} more)
                        </span>
                      )}
                    </h4>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleQuickAddPlayer(team)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer"
                        title="Add an available player directly to this squad without auction"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Add Player</span>
                      </button>
                    )}
                  </div>

                  {squad.length > 0 ? (
                    <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                      {[...squad].sort((a, b) => {
                        const aIsCap = Boolean(a.isCaptain || (team.captainId && String(a.id) === String(team.captainId)) || (captainInSquad && String(a.id) === String(captainInSquad.id)));
                        const bIsCap = Boolean(b.isCaptain || (team.captainId && String(b.id) === String(team.captainId)) || (captainInSquad && String(b.id) === String(captainInSquad.id)));
                        if (aIsCap && !bIsCap) return -1;
                        if (!aIsCap && bIsCap) return 1;
                        return 0;
                      }).map(player => {
                        const isCap = Boolean(player.isCaptain || (team.captainId && String(player.id) === String(team.captainId)) || (captainInSquad && String(player.id) === String(captainInSquad.id)));
                        return (
                          <div
                            key={player.id}
                            className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition group/item ${
                              isCap 
                                ? 'bg-amber-950/25 border-amber-500/50 shadow-md ring-1 ring-amber-400/20'
                                : 'bg-warm-900/80 border-warm-800/60 hover:border-warm-700'
                            }`}
                          >
                            <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                              <div className="relative shrink-0">
                                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border bg-warm-950 shadow-md ${
                                  isCap ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-amber-400/20' : 'border-warm-700'
                                }`}>
                                  <img
                                    src={player.avatarUrl || '/avatars/male.png'}
                                    alt={player.name}
                                    className="w-full h-full object-cover object-[center_15%] scale-110"
                                    onError={e => { e.target.src = '/avatars/male.png'; }}
                                  />
                                </div>
                                {isCap && (
                                  <span className="absolute -top-1.5 -right-1.5 p-1 bg-amber-400 text-slate-950 rounded-full shadow-lg z-10">
                                    <Crown className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center space-x-2 flex-wrap">
                                  <h5 className="font-extrabold text-sand-100 text-base sm:text-lg leading-tight font-sans flex items-center gap-1.5 break-words">
                                    <span>{player.name}</span>
                                    {isCap && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/25 text-amber-300 border border-amber-500/40 shrink-0">
                                        Captain
                                      </span>
                                    )}
                                  </h5>
                                  {player.cricHeroesUrl && (
                                    <a href={player.cricHeroesUrl} target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300 shrink-0 p-0.5" title="CricHeroes Profile">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm text-cyan-300 font-bold">{player.role} • {player.category || 'Male'}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              {/* Super Admin Quick Actions */}
                              {canManage && (
                                <div className="flex items-center gap-1.5 opacity-80 group-hover/item:opacity-100 transition">
                                  <button
                                    type="button"
                                    onClick={() => handleQuickSwap(team, player)}
                                    className="p-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs transition cursor-pointer"
                                    title="⇄ Swap with another player"
                                  >
                                    <ArrowLeftRight className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleQuickTransfer(team, player)}
                                    className="p-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs transition cursor-pointer"
                                    title="→ Transfer to another team"
                                  >
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>

                                  {!isCap && (
                                    <button
                                      type="button"
                                      onClick={() => handleMakeSquadCaptain(team, player)}
                                      className="p-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs transition cursor-pointer"
                                      title="👑 Make Team Captain"
                                    >
                                      <Crown className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSquadPlayer(team, player)}
                                    className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs transition cursor-pointer"
                                    title="✕ Remove from team"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}

                              <div className="text-right pl-2 border-l border-warm-800/80">
                                {isCap ? (
                                  <span className="text-xs sm:text-sm font-black font-mono text-amber-400 bg-amber-500/20 border border-amber-500/35 px-2.5 py-1 rounded-xl">
                                    0 PTS (Cap)
                                  </span>
                                ) : (
                                  <span className="text-xs sm:text-sm font-black font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
                                    ₹{player.soldPrice || 0}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-warm-950/40 rounded-2xl border border-dashed border-warm-800/60 text-sand-400 text-xs sm:text-sm font-medium">
                      No squad members allocated yet. Use "+ Add Player" or AI Balancer.
                    </div>
                  )}
                </div>
              </div>

              {/* Ground rule footer */}
              <div className="pt-4 border-t border-warm-800/50 flex items-center justify-between text-xs text-sand-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Playing XI: Max 6 on field
                </span>
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  Captain retained for 0 PTS
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Create / Edit Team Modal (Spacious Wider Mode) ── */}
      {showModal && canManage && createPortal(
        <div className="fixed inset-0 z-[100] bg-warm-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="warm-card w-full max-w-4xl lg:max-w-5xl p-6 sm:p-8 md:p-9 rounded-3xl border border-warm-700/60 space-y-6 relative max-h-[92vh] overflow-y-auto shadow-2xl my-auto animate-scale-up">

            <div className="flex items-center justify-between border-b border-warm-700/50 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-warm-900 border border-warm-700 flex items-center justify-center text-xl shadow-sm">
                  {formData.logo || '🏏'}
                </span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-sand-100 flex items-center gap-2 font-serif">
                    <Users className="w-6 h-6 text-terracotta-400" />
                    {editingTeam ? `Edit Team Details: ${editingTeam.name}` : 'Create New NEPL Franchise Team'}
                  </h3>
                  <p className="text-xs text-sand-500 font-sans mt-0.5">
                    Configure team identity, captaincy, purse allocation, and squad limits.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700 cursor-pointer transition hover:scale-105"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* 🎨 Dual-Column Grid in Wider Mode */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column: Unique Color Identity & Franchise Theme Selector */}
                <div className="lg:col-span-6 bg-[#0b1120] p-5 rounded-2xl border border-cyan-500/30 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 font-sans">
                        <Palette className="w-4 h-4 text-cyan-400" />
                        <span>Select Franchise Theme & Color Identity</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {TEAM_COLOR_THEMES.length} Presets
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3 font-sans">
                      Choosing a preset instantly updates the brand palette, badges, and franchise name.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {TEAM_COLOR_THEMES.map(theme => {
                        const isSelected = formData.color?.toLowerCase() === theme.color.toLowerCase();
                        const usingTeam = teams.find(t => t.id !== editingTeam?.id && (t.color || '').toLowerCase() === theme.color.toLowerCase());
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => handleSelectTheme(theme)}
                            className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer relative overflow-hidden ${
                              isSelected
                                ? 'bg-slate-900 border-white ring-2 ring-cyan-400 shadow-lg'
                                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: theme.color }} />
                                <span className="text-sm">{theme.logo}</span>
                              </div>
                              {usingTeam ? (
                                <span className="text-[8px] font-mono text-amber-400 bg-amber-950/80 px-1 rounded truncate max-w-[55px]" title={`Used by ${usingTeam.name}`}>
                                  Used
                                </span>
                              ) : isSelected ? (
                                <span className="text-[8px] font-mono text-emerald-400 bg-emerald-950/80 px-1 rounded font-bold">
                                  ✓ Active
                                </span>
                              ) : (
                                <span className="text-[8px] font-mono text-slate-500">
                                  Free
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-slate-200 block truncate leading-tight font-sans">
                              {theme.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block truncate mt-0.5">
                              {theme.label} ({theme.shortName})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Theme Indicator Bar */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 mt-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-lg border border-white/40 shadow-sm shrink-0" style={{ backgroundColor: formData.color }} />
                      <span className="text-xs font-bold text-slate-200 font-mono">Theme: {formData.color}</span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-300">Active Identity</span>
                  </div>
                </div>

                {/* Right Column: Team Details & Configuration */}
                <div className="lg:col-span-6 space-y-4">

                  {/* Team Name & Short Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-sand-200 block mb-1.5 font-sans">
                        Team Name <span className="text-terracotta-400">*</span>
                      </label>
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
                      <label className="text-xs font-bold text-sand-200 block mb-1.5 font-sans">
                        Short Code <span className="text-terracotta-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={4}
                        placeholder="DSK"
                        value={formData.shortName}
                        onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                        className="warm-input font-mono uppercase font-bold"
                      />
                    </div>
                  </div>

                  {/* 👑 Team Captain & Auctioneer Selection */}
                  <div className="bg-amber-950/25 p-4 rounded-2xl border border-amber-500/30 space-y-2">
                    <label className="text-xs font-bold text-amber-300 flex items-center justify-between font-sans">
                      <span className="flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-400" />
                        Playing Captain & Auctioneer (0 PTS)
                      </span>
                      <span className="text-[9px] text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded font-mono">0 Credit Squad</span>
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

                    <p className="text-[10px] text-sand-400 leading-relaxed font-sans">
                      Places this player into the team squad with <strong>₹0 PTS</strong> deduction.
                    </p>
                  </div>

                  {/* Icon Logo & Squad Economics */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    
                    {/* Logo Picker */}
                    <div className="sm:col-span-5">
                      <label className="text-xs font-bold text-sand-200 block mb-1.5 font-sans">Team Icon Logo</label>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl p-2 bg-warm-900 rounded-xl border border-warm-700 shrink-0">{formData.logo}</span>
                        <div className="flex flex-wrap gap-1 max-w-[140px]">
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

                    {/* Purse Budget & Max Squad Size */}
                    <div className="sm:col-span-7 grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-xs font-bold text-cyan-300 block mb-1.5 font-sans">
                          Purse (PTS)
                        </label>
                        <input
                          type="number"
                          required
                          min={100}
                          value={formData.totalPurse}
                          onChange={e => setFormData({ ...formData, totalPurse: e.target.value })}
                          className="warm-input font-mono font-bold text-xs sm:text-sm"
                          placeholder="10000"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-cyan-300 block mb-1.5 font-sans">
                          Max Squad
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          max={30}
                          value={formData.maxSquadSize}
                          onChange={e => setFormData({ ...formData, maxSquadSize: e.target.value })}
                          className="warm-input font-mono font-bold text-xs sm:text-sm"
                          placeholder="10"
                        />
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 flex items-center justify-between border-t border-warm-700/50">
                <span className="text-xs text-sand-500 font-sans hidden sm:inline-block">
                  ⚡ All changes sync instantly with MongoDB Atlas.
                </span>
                <div className="flex items-center space-x-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary cursor-pointer px-5 py-2.5 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary cursor-pointer px-6 py-2.5 text-xs font-bold">
                    {editingTeam ? 'Save Team Changes' : 'Create Team'}
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* ── Quick Assign Captain Modal ── */}
      {captainModalTeam && canManage && createPortal(
        <div className="fixed inset-0 z-[100] bg-warm-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="warm-card w-full max-w-xl p-6 sm:p-7 rounded-3xl border border-amber-500/40 space-y-5 shadow-2xl relative">
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

      {/* ── 1. Super Admin Swap Player Modal ── */}
      {swapModal.isOpen && swapModal.player && canManage && createPortal(
        <div className="fixed inset-0 z-[100] bg-warm-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="warm-card w-full max-w-2xl p-6 sm:p-7 rounded-3xl border border-cyan-500/40 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <h3 className="text-lg font-bold text-sand-100 flex items-center gap-2 font-display">
                <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
                <span>⇄ Super Admin: Swap Player</span>
              </h3>
              <button
                onClick={() => setSwapModal({ isOpen: false, fromTeam: null, player: null, toTeamId: '', targetPlayerId: '' })}
                className="p-1.5 rounded-lg text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Player A Preview */}
            <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center gap-3">
              <img
                src={swapModal.player.avatarUrl || '/avatars/male.png'}
                alt={swapModal.player.name}
                className="w-11 h-11 rounded-xl object-cover border border-cyan-400/50"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-cyan-400 font-mono block">Current Player (Team A)</span>
                <h4 className="font-extrabold text-sm text-sand-100 truncate">{swapModal.player.name}</h4>
                <p className="text-xs text-sand-400 truncate">{swapModal.fromTeam?.name} • {swapModal.player.role}</p>
              </div>
            </div>

            {/* Destination Team & Player B Picker */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-sand-300 block mb-1">Swap With Which Team (Team B)?</label>
                <select
                  value={swapModal.toTeamId}
                  onChange={e => {
                    const newTeamId = e.target.value;
                    const destTeam = teams.find(t => t.id === newTeamId);
                    const firstPlayer = (destTeam?.squad || [])[0];
                    setSwapModal(prev => ({
                      ...prev,
                      toTeamId: newTeamId,
                      targetPlayerId: firstPlayer ? firstPlayer.id : ''
                    }));
                  }}
                  className="warm-input cursor-pointer text-xs"
                >
                  <option value="">-- Choose Team --</option>
                  {teams.filter(t => t.id !== swapModal.fromTeam?.id).map(t => (
                    <option key={t.id} value={t.id}>
                      {t.logo} {t.name} ({t.squad?.length || 0} players)
                    </option>
                  ))}
                </select>
              </div>

              {swapModal.toTeamId && (
                <div>
                  <label className="text-xs font-semibold text-sand-300 block mb-1">Swap With Player From That Team:</label>
                  <select
                    value={swapModal.targetPlayerId}
                    onChange={e => setSwapModal(prev => ({ ...prev, targetPlayerId: e.target.value }))}
                    className="warm-input cursor-pointer text-xs"
                  >
                    <option value="">-- Choose Target Player --</option>
                    {(teams.find(t => t.id === swapModal.toTeamId)?.squad || []).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} • {p.role} ({p.category || 'General'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-warm-800">
              <button
                type="button"
                onClick={() => setSwapModal({ isOpen: false, fromTeam: null, player: null, toTeamId: '', targetPlayerId: '' })}
                className="btn-secondary text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!swapModal.toTeamId || !swapModal.targetPlayerId}
                onClick={() => executeSwap(swapModal.fromTeam.id, swapModal.player.id, swapModal.toTeamId, swapModal.targetPlayerId)}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                Confirm Player Swap
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 2. Super Admin Transfer Player Modal ── */}
      {transferModal.isOpen && transferModal.player && canManage && createPortal(
        <div className="fixed inset-0 z-[100] bg-warm-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="warm-card w-full max-w-xl p-6 sm:p-7 rounded-3xl border border-blue-500/40 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
              <h3 className="text-lg font-bold text-sand-100 flex items-center gap-2 font-display">
                <ArrowRight className="w-5 h-5 text-blue-400" />
                <span>→ Super Admin: Transfer Player</span>
              </h3>
              <button
                onClick={() => setTransferModal({ isOpen: false, fromTeam: null, player: null, toTeamId: '' })}
                className="p-1.5 rounded-lg text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex items-center gap-3">
              <img
                src={transferModal.player.avatarUrl || '/avatars/male.png'}
                alt={transferModal.player.name}
                className="w-11 h-11 rounded-xl object-cover border border-blue-400/50"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-blue-400 font-mono block">Player to Transfer</span>
                <h4 className="font-extrabold text-sm text-sand-100 truncate">{transferModal.player.name}</h4>
                <p className="text-xs text-sand-400 truncate">From: {transferModal.fromTeam?.name}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-sand-300 block mb-1">Transfer Directly To Team:</label>
              <select
                value={transferModal.toTeamId}
                onChange={e => setTransferModal(prev => ({ ...prev, toTeamId: e.target.value }))}
                className="warm-input cursor-pointer text-xs"
              >
                <option value="">-- Choose Destination Team --</option>
                {teams.filter(t => t.id !== transferModal.fromTeam?.id).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.logo} {t.name} ({t.squad?.length || 0} players)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-warm-800">
              <button
                type="button"
                onClick={() => setTransferModal({ isOpen: false, fromTeam: null, player: null, toTeamId: '' })}
                className="btn-secondary text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!transferModal.toTeamId}
                onClick={() => executeTransfer(transferModal.fromTeam.id, transferModal.toTeamId, transferModal.player.id)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 3. Super Admin Add Free Player to Squad Modal ── */}
      {addPlayerModal.isOpen && addPlayerModal.team && canManage && createPortal(
        <div className="fixed inset-0 z-[100] bg-warm-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="warm-card w-full max-w-2xl p-6 sm:p-7 rounded-3xl border border-emerald-500/40 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <h3 className="text-lg font-bold text-sand-100 flex items-center gap-2 font-display">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <span>+ Add Player to {addPlayerModal.team.name}</span>
              </h3>
              <button
                onClick={() => setAddPlayerModal({ isOpen: false, team: null, selectedPlayerId: '', search: '' })}
                className="p-1.5 rounded-lg text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-sand-400">
              Pick any unassigned player or free agent to place directly into this squad without an auction:
            </p>

            <div className="relative">
              <Search className="w-4 h-4 text-sand-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search free agents by name, role or category…"
                value={addPlayerModal.search}
                onChange={e => setAddPlayerModal(prev => ({ ...prev, search: e.target.value }))}
                className="w-full bg-warm-900 border border-warm-700 rounded-xl pl-9 pr-3 py-2 text-xs text-sand-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Available Players List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {players
                .filter(p => {
                  const inCurrentTeam = (addPlayerModal.team.squad || []).some(m => m.id === p.id);
                  if (inCurrentTeam) return false;
                  if (!addPlayerModal.search.trim()) return true;
                  const term = addPlayerModal.search.toLowerCase();
                  return p.name.toLowerCase().includes(term) || (p.role && p.role.toLowerCase().includes(term)) || (p.category && p.category.toLowerCase().includes(term));
                })
                .map(p => {
                  const isSelected = addPlayerModal.selectedPlayerId === p.id;
                  const isAssignedElsewhere = Boolean(p.soldTo && p.soldTo !== addPlayerModal.team.id);
                  const otherTeam = isAssignedElsewhere ? teams.find(t => t.id === p.soldTo) : null;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setAddPlayerModal(prev => ({ ...prev, selectedPlayerId: p.id }))}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-500/30'
                          : 'bg-warm-900/80 border-warm-800/80 hover:border-warm-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={p.avatarUrl || '/avatars/male.png'}
                          alt={p.name}
                          className="w-9 h-9 rounded-xl object-cover border border-warm-700"
                        />
                        <div>
                          <h4 className="font-bold text-xs text-sand-100 flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.isPlayingNEPL !== false ? (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-emerald-500/20 text-emerald-300">NEPL</span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-amber-500/20 text-amber-300">Reserve</span>
                            )}
                          </h4>
                          <p className="text-[10px] text-sand-400">
                            {p.role} • {p.category || 'Male'}
                            {isAssignedElsewhere && otherTeam && (
                              <span className="text-rose-400 ml-1">(Currently in {otherTeam.name})</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono ${
                          isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-warm-800 text-sand-300'
                        }`}>
                          {isSelected ? '✓ Selected' : 'Select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-warm-800">
              <button
                type="button"
                onClick={() => setAddPlayerModal({ isOpen: false, team: null, selectedPlayerId: '', search: '' })}
                className="btn-secondary text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!addPlayerModal.selectedPlayerId}
                onClick={() => executeAddPlayer(addPlayerModal.team.id, addPlayerModal.selectedPlayerId)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                Add Player to Squad
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 4. Super Admin Roster Override & Player Swapper Hub Modal ── */}
      {rosterHubOpen && canManage && createPortal(
        <div className="fixed inset-0 z-[100] bg-warm-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="warm-card w-full max-w-6xl p-6 sm:p-8 rounded-3xl border border-cyan-500/50 space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
              <div>
                <h3 className="text-2xl font-black text-sand-100 flex items-center gap-2 font-display">
                  <Sliders className="w-6 h-6 text-cyan-400" />
                  <span>⚡ Super Admin Roster Override & Swapper Hub</span>
                </h3>
                <p className="text-xs text-sand-400 mt-1">
                  Manage, swap, reassign, and override team members across all {teams.length} teams at any time without an auction.
                </p>
              </div>
              <button
                onClick={() => setRosterHubOpen(false)}
                className="p-2 rounded-xl text-sand-400 hover:text-sand-100 bg-warm-900 border border-warm-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map(team => {
                const squad = team.squad || [];
                return (
                  <div
                    key={team.id}
                    className="p-4 rounded-2xl bg-warm-900/90 border border-warm-700 space-y-3"
                    style={{ borderTop: `4px solid ${team.color || '#00f2fe'}` }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sand-100 text-sm font-sans flex items-center gap-2">
                        <span>{team.logo}</span>
                        <span>{team.name}</span>
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-warm-950 text-cyan-300 border border-cyan-500/30">
                        {squad.length} Players
                      </span>
                    </div>

                    {/* Squad Members */}
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {[...squad].sort((a, b) => {
                        const aIsCap = Boolean(a.isCaptain || (team.captainId && String(a.id) === String(team.captainId)));
                        const bIsCap = Boolean(b.isCaptain || (team.captainId && String(b.id) === String(team.captainId)));
                        if (aIsCap && !bIsCap) return -1;
                        if (!aIsCap && bIsCap) return 1;
                        return 0;
                      }).map(p => {
                        const isCap = Boolean(p.isCaptain || (team.captainId && String(p.id) === String(team.captainId)));
                        return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs ${
                            isCap
                              ? 'bg-amber-950/30 border-amber-500/50 shadow-sm'
                              : 'bg-warm-950/60 border-warm-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px]">{isCap ? '👑' : '🏏'}</span>
                            <div className="min-w-0 truncate">
                              <span className="font-bold text-sand-200 block truncate flex items-center gap-1">
                                <span>{p.name}</span>
                                {isCap && (
                                  <span className="px-1 py-0.2 rounded text-[7px] font-black uppercase bg-amber-500/25 text-amber-300 border border-amber-500/40">
                                    Cap
                                  </span>
                                )}
                              </span>
                              <span className="text-[9px] text-sand-500 block truncate">{p.role} • {p.category || 'Male'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <button
                              type="button"
                              onClick={() => {
                                setRosterHubOpen(false);
                                handleQuickSwap(team, p);
                              }}
                              className="p-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[10px] cursor-pointer"
                              title="⇄ Swap"
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRosterHubOpen(false);
                                handleQuickTransfer(team, p);
                              }}
                              className="p-1 rounded bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 text-[10px] cursor-pointer"
                              title="→ Transfer"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSquadPlayer(team, p)}
                              className="p-1 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[10px] cursor-pointer"
                              title="✕ Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setRosterHubOpen(false);
                        handleQuickAddPlayer(team);
                      }}
                      className="w-full py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
                    >
                      + Add Free Player
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-warm-800">
              <button
                type="button"
                onClick={() => setRosterHubOpen(false)}
                className="btn-primary text-xs px-6 py-2.5 cursor-pointer font-bold"
              >
                Done / Close Hub
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 5. Developer & Super Admin Quick Override Team Name Modal ── */}
      {renameModal.isOpen && renameModal.team && createPortal(
        <div className="fixed inset-0 z-[100] bg-warm-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="warm-card w-full max-w-xl p-6 sm:p-8 rounded-3xl border border-cyan-500/50 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 rounded-xl bg-warm-900 border border-warm-700">
                  {renameModal.team.logo}
                </span>
                <div>
                  <h3 className="text-xl font-black text-sand-100 flex items-center gap-2 font-display">
                    <Edit3 className="w-5 h-5 text-cyan-400" />
                    <span>Override Team Name</span>
                  </h3>
                  <p className="text-xs text-sand-400">
                    Customize the franchise title and short code at any time.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRenameModal({ isOpen: false, team: null, name: '', shortName: '' })}
                className="p-2 rounded-xl text-sand-400 hover:text-sand-100 bg-warm-900 border border-warm-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-sand-300 mb-1.5">
                  Custom Team Name
                </label>
                <input
                  type="text"
                  required
                  value={renameModal.name}
                  onChange={(e) => setRenameModal(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Nyati Titans, Cyber Kings..."
                  className="input-field text-sand-100 font-bold text-sm w-full py-2.5 px-3.5 rounded-xl bg-warm-950 border border-warm-700 focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-sand-300 mb-1.5">
                  Custom Short Code (2-4 letters)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={renameModal.shortName}
                  onChange={(e) => setRenameModal(prev => ({ ...prev, shortName: e.target.value.toUpperCase() }))}
                  placeholder="e.g. NYT, CYB, DSS..."
                  className="input-field text-sand-100 font-mono font-bold text-sm w-full py-2.5 px-3.5 rounded-xl bg-warm-950 border border-warm-700 focus:border-cyan-400 uppercase"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-warm-950/70 border border-cyan-500/20 text-xs text-sand-400 space-y-1">
                <span className="font-bold text-cyan-300 block">💡 Instant Update:</span>
                <span>Changing this custom name updates the team banner, squad rosters, scoreboard, and live auction room automatically.</span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-warm-800">
                <button
                  type="button"
                  onClick={() => setRenameModal({ isOpen: false, team: null, name: '', shortName: '' })}
                  className="px-4 py-2.5 bg-warm-900 hover:bg-warm-800 text-sand-300 rounded-xl text-xs font-bold border border-warm-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs px-6 py-2.5 cursor-pointer font-bold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Custom Name</span>
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
