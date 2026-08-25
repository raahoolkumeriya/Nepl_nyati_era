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
  Check,
  Camera,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { updateTeam as apiUpdateTeam, deleteTeam as apiDeleteTeam, updatePlayer as apiUpdatePlayer, isMongoDB } from '../services/api';
import { TEAM_COLOR_THEMES, getThemeByColor, getThemeByIndex } from '../data/teamThemes';
import { compressImage } from '../utils/imageCompressor';

export default function TeamsView({ teams, setTeams, players = [], setPlayers, onOpenAiChat }) {
  const { can, usersList } = useAuth();
  const canManage = can('canManageTeams');

  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [photoInfo, setPhotoInfo] = useState('');

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
  const [rosterHubSearch, setRosterHubSearch] = useState('');

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
    teamPhotoUrl: '',
  });

  const LOGO_OPTIONS = ['🏏', '🦁', '⚡', '👑', '🦅', '⚔️', '🔥', '🛡️', '🎯', '🐯', '🌪️', '🐆'];

  const handleManualTeamPhotoUpload = async (e, directTeamId = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressingPhoto(true);
      // High-definition lightweight compressed image (max 900x600, ~30-50KB)
      const compressedDataUrl = await compressImage(file, 900, 600, 0.75);
      const approxKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
      setPhotoInfo(`Compressed ~${approxKb} KB`);

      if (directTeamId) {
        // Direct update from team tile
        await handleUpdateTeamPhoto(directTeamId, compressedDataUrl);
      } else {
        // Update in form data modal
        setFormData(prev => ({ ...prev, teamPhotoUrl: compressedDataUrl }));
      }
    } catch (err) {
      alert('Error compressing team photo: ' + err.message);
    } finally {
      setCompressingPhoto(false);
    }
  };

  const openCreateModal = () => {
    setEditingTeam(null);
    setPhotoInfo('');
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
      teamPhotoUrl: '',
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
    setPhotoInfo('');
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
      teamPhotoUrl: team.teamPhotoUrl || '',
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
            apiUpdatePlayer(p.id, freed).catch(err => console.warn('Free captain sync error:', err));
            return freed;
          }
          return p;
        }));
      }
    }

    // 2. If a new captain is selected, add them into the squad
    let assignedCaptainName = targetTeam.owner || '';
    if (newCaptainPlayerId) {
      const playerObj = players.find(p => p.id === newCaptainPlayerId);
      if (playerObj) {
        assignedCaptainName = playerObj.name;
        
        // Remove player from existing team if they were on another team
        teams.forEach(otherTeam => {
          if (otherTeam.id !== teamId && otherTeam.squad?.some(s => s.id === newCaptainPlayerId)) {
            const cleanedSquad = otherTeam.squad.filter(s => s.id !== newCaptainPlayerId);
            const cleanedTeam = {
              ...otherTeam,
              captainId: otherTeam.captainId === newCaptainPlayerId ? null : otherTeam.captainId,
              captainName: otherTeam.captainId === newCaptainPlayerId ? null : otherTeam.captainName,
              playersCount: cleanedSquad.length,
              squad: cleanedSquad
            };
            setTeams(prev => prev.map(t => t.id === otherTeam.id ? cleanedTeam : t));
            apiUpdateTeam(otherTeam.id, cleanedTeam).catch(err => console.warn('Clean team captain sync error:', err));
          }
        });

        // Add captain into target squad if not already present
        const existingIdx = updatedSquad.findIndex(s => s.id === newCaptainPlayerId);
        const captainSquadMember = {
          id: playerObj.id,
          name: playerObj.name,
          role: playerObj.role || 'Batting All-Rounder',
          category: playerObj.category || 'Male',
          soldPrice: 0,
          avatarUrl: playerObj.avatarUrl || '/avatars/male.png',
          cricHeroesUrl: playerObj.cricHeroesUrl || '',
          isCaptain: true,
          captainOfTeamId: teamId,
        };

        if (existingIdx >= 0) {
          updatedSquad[existingIdx] = captainSquadMember;
        } else {
          updatedSquad.unshift(captainSquadMember);
        }

        // Update player record in players state & DB
        if (setPlayers) {
          setPlayers(prev => prev.map(p => {
            if (p.id === newCaptainPlayerId) {
              const updatedP = {
                ...p,
                status: 'sold',
                soldTo: teamId,
                soldPrice: 0,
                isCaptain: true,
                isAuctioneer: true,
                captainOfTeamId: teamId,
              };
              apiUpdatePlayer(p.id, updatedP).catch(err => console.warn('Captain player sync error:', err));
              return updatedP;
            }
            return p;
          }));
        }
      }
    }

    return {
      ...targetTeam,
      captainId: newCaptainPlayerId || null,
      captainName: newCaptainPlayerId ? assignedCaptainName : null,
      owner: assignedCaptainName || targetTeam.owner || 'Auctioneer Captain',
      playersCount: updatedSquad.length,
      squad: updatedSquad,
    };
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
        teamPhotoUrl: formData.teamPhotoUrl !== undefined ? formData.teamPhotoUrl : (editingTeam.teamPhotoUrl || ''),
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
        teamPhotoUrl: formData.teamPhotoUrl || '',
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

  // Super Admin: Update max squad size for all teams at once
  const handleUpdateAllSquadSizes = (newSize) => {
    if (!canManage) return;
    const targetSize = Math.max(1, Number(newSize) || 10);
    const updatedTeams = teams.map(t => ({
      ...t,
      maxSquadSize: targetSize,
    }));
    setTeams(updatedTeams);
    updatedTeams.forEach(t => {
      apiUpdateTeam(t.id, t).catch(err => console.warn('Update team capacity error:', err));
    });
  };

  // Super Admin: Update max squad size for a single team
  const handleUpdateSingleTeamSquadSize = (teamId, newSize) => {
    if (!canManage) return;
    const targetSize = Math.max(1, Number(newSize) || 10);
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const updated = { ...team, maxSquadSize: targetSize };
    setTeams(prev => prev.map(t => t.id === teamId ? updated : t));
    apiUpdateTeam(teamId, updated).catch(err => console.warn('Update team capacity error:', err));
  };

  // Super Admin: Set / Update Official Team Squad Picture
  const handleUpdateTeamPhoto = async (teamId, photoDataUrl) => {
    try {
      const updated = teams.map(t => {
        if (t.id === teamId) {
          return {
            ...t,
            teamPhotoUrl: photoDataUrl
          };
        }
        return t;
      });
      setTeams(updated);

      const targetTeam = updated.find(t => t.id === teamId);
      if (targetTeam) {
        await apiUpdateTeam(teamId, targetTeam).catch(e => console.warn('Team photo save notice:', e));
      }
    } catch (err) {
      console.error('Failed to update team picture:', err);
      alert(`Could not save team picture: ${err.message}`);
    }
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
            <>
              {/* Quick Squad Limit Selector */}
              <div className="flex flex-wrap items-center gap-1 bg-[#f4efe6] dark:bg-warm-900 px-2.5 py-1.5 rounded-xl border border-[#e2dacc] dark:border-warm-700 shadow-sm">
                <span className="text-[11px] font-bold text-slate-700 dark:text-sand-300">Squad Size:</span>
                {[8, 10, 11, 12, 14, 15, 16, 18, 20].map(size => {
                  const isActive = teams.length > 0 && teams.every(t => (t.maxSquadSize || 10) === size);
                  return (
                    <button
                      key={size}
                      onClick={() => handleUpdateAllSquadSizes(size)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black transition cursor-pointer ${
                        isActive
                          ? 'bg-cyan-500 text-slate-950 shadow'
                          : 'text-slate-600 dark:text-sand-400 hover:text-slate-900 dark:hover:text-sand-100'
                      }`}
                      title={`Set all teams max squad size to ${size} players`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setRosterHubOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-sky-800 dark:text-cyan-300 border border-cyan-500/40 font-bold text-xs shadow-[0_0_12px_rgba(0,242,254,0.25)] transition cursor-pointer"
                title="Super Admin: Roster Override & Player Swapper Hub"
              >
                <ArrowLeftRight className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <span>Roster Override Hub</span>
              </button>
            </>
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
              className="glass-panel p-6 sm:p-8 pl-7 sm:pl-9 rounded-3xl space-y-6 relative overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-2xl"
              style={{
                borderColor: `${team.color || '#d4622a'}50`,
                borderTop: `5px solid ${team.color || '#d4622a'}`,
                borderLeft: `5px solid ${team.color || '#d4622a'}`,
                background: `radial-gradient(ellipse 90% 75% at 0% 0%, ${team.color || '#d4622a'}28 0%, ${team.color || '#d4622a'}0c 45%, transparent 85%)`,
                boxShadow: `0 20px 50px -10px ${team.color || '#d4622a'}45, 0 4px 20px -2px ${team.color || '#d4622a'}25`
              }}
            >
              {/* 🌟 Top & Left Curved Accent Ribbon */}
              <div
                className="absolute inset-0 pointer-events-none rounded-3xl transition-all duration-300"
                style={{
                  borderTop: `4px solid ${team.color || '#d4622a'}`,
                  borderLeft: `4px solid ${team.color || '#d4622a'}`,
                  borderTopLeftRadius: '1.5rem',
                  boxShadow: `inset 3px 3px 20px -3px ${team.color || '#d4622a'}50, 0 0 20px -2px ${team.color || '#d4622a'}40`,
                }}
              />

              {/* Radiant Ambient Corner Glow Halo */}
              <div 
                className="absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-60 transition-all duration-500 group-hover:opacity-85"
                style={{
                  backgroundColor: team.color || '#d4622a'
                }}
              />

              <div>
                {/* Team header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center space-x-4 min-w-0 flex-1">
                    <span
                      className="text-4xl p-3.5 rounded-2xl border transition-all duration-300 shadow-xl shrink-0"
                      style={{
                        backgroundColor: `${team.color || '#d4622a'}30`,
                        borderColor: `${team.color || '#d4622a'}80`,
                        boxShadow: `0 0 25px ${team.color || '#d4622a'}45`
                      }}
                    >
                      {team.logo}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-sand-100 tracking-tight font-sans flex items-center gap-2">
                          <span>{team.name}</span>
                        </h3>
                        
                        {/* High Visibility Team Color Ribbon Badge */}
                        <span
                          className="px-3.5 py-1 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest border font-mono shadow-sm"
                          style={{
                            backgroundColor: `${team.color || '#d4622a'}30`,
                            color: team.color || '#d4622a',
                            borderColor: `${team.color || '#d4622a'}70`,
                            boxShadow: `0 0 14px ${team.color || '#d4622a'}40`
                          }}
                        >
                          {team.shortName}
                        </span>

                        {/* Developer & Admin Quick Rename Button */}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => openRenameModal(team)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-sky-800 dark:text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer"
                            title={`Rename team "${team.name}" with custom name`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Rename</span>
                          </button>
                        )}
                      </div>
                      
                      {/* Captain & Theme Identity Highlight */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-800 dark:text-amber-300 text-xs sm:text-sm font-bold shadow-sm">
                          <Crown className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                          <Zap className="w-3 h-3 text-sky-600 dark:text-cyan-300" />
                          <span>Captain: <strong className="text-slate-900 dark:text-sand-100 font-extrabold">{captainInSquad ? captainInSquad.name : (team.owner || 'Unassigned')}</strong></span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono ml-0.5">(0 PTS)</span>
                        </span>

                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs sm:text-sm font-mono font-bold"
                          style={{
                            backgroundColor: `${team.color || '#d4622a'}20`,
                            borderColor: `${team.color || '#d4622a'}50`,
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
                    <span 
                      className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider border shadow-sm"
                      style={{
                        backgroundColor: isFull ? 'rgba(16, 185, 129, 0.2)' : `${team.color || '#d4622a'}25`,
                        borderColor: isFull ? 'rgba(16, 185, 129, 0.5)' : `${team.color || '#d4622a'}60`,
                        color: isFull ? '#047857' : (team.color || '#d4622a')
                      }}
                    >
                      {squad.length}/{maxCapacity}
                    </span>

                    {/* Super Admin Direct Team Photo Upload */}
                    {canManage && (
                      <label
                        className="p-2 sm:px-3 sm:py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 text-purple-700 dark:text-purple-300 border border-purple-500/35 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold font-sans shadow-sm"
                        title="Upload official team picture (Auto compressed ~30-50KB)"
                      >
                        <Camera className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="hidden sm:inline">Set Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleManualTeamPhotoUpload(e, team.id)}
                          className="hidden"
                          disabled={compressingPhoto}
                        />
                      </label>
                    )}

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

                {/* Official Generated Squad Photo Hero Preview if Set */}
                {team.teamPhotoUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 group/pic shadow-md mt-4">
                    <img
                      src={team.teamPhotoUrl}
                      alt={`${team.name} Official Squad`}
                      className="w-full h-36 sm:h-48 object-cover object-center group-hover/pic:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex items-end justify-between p-3">
                      <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Official Team Picture</span>
                      </span>

                      {canManage && (
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-mono text-cyan-300 bg-slate-900/90 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-cyan-500/40 cursor-pointer shadow-sm">
                            <span>Replace Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleManualTeamPhotoUpload(e, team.id)}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleUpdateTeamPhoto(team.id, '')}
                            className="text-[10px] font-mono text-rose-400 bg-slate-900/90 hover:bg-red-950 px-2 py-1 rounded-lg border border-rose-500/40 cursor-pointer shadow-sm"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Purse Stats with Modern Team Color Glow Shadow */}
                <div 
                  className="mt-6 bg-[#f4efe6] dark:bg-warm-950/75 p-5 rounded-2xl border border-[#e2dacc] dark:border-warm-800/80 space-y-3.5 transition-all duration-300 shadow-lg"
                  style={{
                    borderColor: `${team.color || '#d4622a'}40`,
                    boxShadow: `0 10px 30px -6px ${team.color || '#d4622a'}25, inset 0 0 24px -10px ${team.color || '#d4622a'}15`
                  }}
                >
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: 'Total Budget', value: `₹${team.totalPurse}`, color: 'text-slate-900 dark:text-sand-100' },
                      { label: 'Spent Purse', value: `₹${team.spentPurse}`, color: 'text-rose-700 dark:text-rose-400' },
                      { label: 'Remaining Purse', value: `₹${remainingPurse}`, color: 'text-emerald-700 dark:text-emerald-400' },
                    ].map((s, i) => (
                      <div key={i} className={i > 0 ? 'border-l border-[#d4ccbd] dark:border-warm-800' : ''}>
                        <span className="text-slate-700 dark:text-slate-400 text-xs uppercase font-extrabold tracking-wider block">{s.label}</span>
                        <span className={`text-base sm:text-2xl font-black ${s.color} font-mono mt-0.5 block`}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-full bg-[#e2dacc] dark:bg-warm-900 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-500"
                      style={{ width: `${Math.max(0, Math.min(100, (remainingPurse / team.totalPurse) * 100))}%` }}
                    />
                  </div>

                  {/* Release Player Action */}
                  {squad.filter(p => !p.isCaptain).length > 0 && (can('canBid') || canManage) && (
                    <div className="pt-2.5 border-t border-[#d4ccbd] dark:border-warm-800/60 flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-400 font-mono font-bold">
                        Purse Refund Available:
                      </span>
                      <button
                        onClick={() => handleReleaseTopPlayer(team)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-800 dark:text-rose-300 border border-rose-500/30 text-xs font-bold tracking-wider uppercase transition shadow-sm cursor-pointer"
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
                    <span key={r.label} className="px-3 py-1.5 rounded-xl bg-[#f4efe6] dark:bg-warm-900 border border-[#e2dacc] dark:border-warm-700 text-slate-800 dark:text-sand-300 font-bold">
                      {r.label}: <strong className="text-slate-950 dark:text-sand-100 font-extrabold">{r.count}</strong>
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
                            className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition group/item shadow-sm ${
                              isCap 
                                ? 'bg-amber-100/70 dark:bg-amber-950/30 border-amber-400 dark:border-amber-500/60 shadow-md ring-1 ring-amber-400/30'
                                : 'bg-white dark:bg-warm-900/80 border-[#e2dacc] dark:border-warm-800/80 hover:border-cyan-500/40'
                            }`}
                          >
                            <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                              <div className="relative shrink-0">
                                <div 
                                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 bg-[#f4efe6] dark:bg-warm-950 shadow-md ${
                                    isCap ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-amber-400/20' : ''
                                  }`}
                                  style={{
                                    borderColor: isCap ? '#f59e0b' : `${team.color || '#d4622a'}80`
                                  }}
                                >
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

                  {/* Active Theme Indicator Bar + Custom Hex Color Picker */}
                  <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 mt-2 gap-2">
                    <div className="flex items-center gap-2.5">
                      <label className="relative cursor-pointer" title="Pick custom color from color wheel">
                        <input
                          type="color"
                          value={formData.color || '#3b82f6'}
                          onChange={e => setFormData({ ...formData, color: e.target.value })}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                        <span 
                          className="w-7 h-7 rounded-lg border-2 border-white/60 shadow-md block hover:scale-105 transition" 
                          style={{ backgroundColor: formData.color || '#3b82f6' }} 
                        />
                      </label>
                      <div>
                        <span className="text-xs font-bold text-slate-200 font-mono block">Color: {formData.color}</span>
                        <span className="text-[10px] text-slate-400 font-sans">Tap swatch for custom spectrum picker</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formData.color || ''}
                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                        placeholder="#3b82f6"
                        maxLength={7}
                        className="w-24 bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs px-2.5 py-1 rounded-lg uppercase focus:outline-none focus:border-cyan-400 font-bold"
                      />
                    </div>
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

                  {/* Official Team Squad Photo (Compressed HD) */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-sand-200 flex items-center gap-2 font-sans">
                        <Camera className="w-4 h-4 text-cyan-400" />
                        <span>Official Team Squad Picture</span>
                      </label>
                      {photoInfo && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30 font-bold">
                          {photoInfo}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      {/* Image Preview Thumbnail */}
                      <div className="w-24 h-16 sm:w-28 sm:h-18 rounded-xl bg-warm-900 border border-warm-700 overflow-hidden flex items-center justify-center shrink-0 shadow-inner relative group">
                        {formData.teamPhotoUrl ? (
                          <img
                            src={formData.teamPhotoUrl}
                            alt="Team Squad Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center text-slate-500 text-[10px] p-1 font-mono">
                            <ImageIcon className="w-5 h-5 mx-auto opacity-50 mb-0.5" />
                            <span>No Photo</span>
                          </div>
                        )}
                        {compressingPhoto && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Upload & Clear Controls */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-sky-800 dark:text-cyan-300 border border-cyan-500/40 text-xs font-bold font-sans cursor-pointer transition flex items-center gap-1.5 shadow-sm">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{compressingPhoto ? 'Compressing…' : 'Upload Compressed Picture'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleManualTeamPhotoUpload(e)}
                              className="hidden"
                              disabled={compressingPhoto}
                            />
                          </label>

                          {formData.teamPhotoUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, teamPhotoUrl: '' }));
                                setPhotoInfo('');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-rose-400 border border-red-500/30 text-xs font-bold font-sans transition cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-400 font-sans">
                          Auto-compresses high-res team photos to lightweight ~30-50 KB for quick loading.
                        </p>
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
              <h3 className="text-lg font-extrabold text-sand-100 flex items-center gap-2 font-sans tracking-tight">
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
              <h3 className="text-lg font-extrabold text-sand-100 flex items-center gap-2 font-sans tracking-tight">
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
              <h3 className="text-lg font-extrabold text-sand-100 flex items-center gap-2 font-sans tracking-tight">
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
        <div className="fixed inset-0 z-[100] bg-black/80 dark:bg-warm-950/95 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in">
          <div className="warm-card w-full max-w-[96vw] 2xl:max-w-[1750px] p-4 sm:p-6 md:p-8 rounded-3xl border border-cyan-500/50 space-y-4 sm:space-y-6 shadow-2xl relative h-[94vh] max-h-[96vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-cyan-500/25 pb-4 shrink-0">
              <div className="min-w-0">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-sand-100 flex items-center gap-2.5 font-sans tracking-tight">
                  <Sliders className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-500 dark:text-cyan-400 shrink-0" />
                  <span>⚡ Super Admin Roster Override & Swapper Hub</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-sand-400 mt-1 font-sans">
                  Autonomous tournament roster manager — Instant player swaps, squad transfers, and direct team assignments without auction.
                </p>
              </div>

              {/* Header Right Actions: Search & Quick Counts & Close */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {/* Search Bar */}
                <div className="relative min-w-[220px] sm:min-w-[280px]">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search player in rosters…"
                    value={rosterHubSearch}
                    onChange={e => setRosterHubSearch(e.target.value)}
                    className="w-full bg-[#f4efe6] dark:bg-warm-900 border border-[#e2dacc] dark:border-warm-700 rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-sand-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
                  />
                  {rosterHubSearch && (
                    <button
                      onClick={() => setRosterHubSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Quick Count Pill */}
                <div className="hidden xl:flex items-center gap-2 bg-[#f4efe6] dark:bg-warm-900/90 px-3.5 py-2 rounded-xl border border-[#e2dacc] dark:border-warm-700 text-xs font-mono font-bold text-slate-700 dark:text-sand-300">
                  <span>{teams.length} Teams</span>
                  <span>·</span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {teams.reduce((sum, t) => sum + (t.squad?.length || 0), 0)} Squad Members
                  </span>
                  <span>·</span>
                  <span className="text-amber-700 dark:text-amber-400">
                    {players.filter(p => p.status !== 'sold' && !teams.some(t => t.captainId === p.id)).length} Free Pool
                  </span>
                </div>

                <button
                  onClick={() => setRosterHubOpen(false)}
                  className="p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-sand-400 dark:hover:text-sand-100 bg-[#f4efe6] dark:bg-warm-900 border border-[#e2dacc] dark:border-warm-700 cursor-pointer transition shadow-sm"
                  title="Close Swapper Hub"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ── Super Admin Squad Size / Team Members Controller ── */}
            {(() => {
              const activeNeplPoolCount = players.filter(p => p.isPlayingNEPL !== false).length;
              const suggestedSquadLimit = teams.length > 0 ? Math.max(1, Math.floor(activeNeplPoolCount / teams.length)) : 10;
              
              return (
                <div className="bg-[#e9e3d5] dark:bg-warm-950/80 p-3.5 sm:p-4 rounded-2xl border border-[#d4ccbd] dark:border-cyan-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 shadow-inner">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-cyan-500/20 text-sky-800 dark:text-cyan-300 font-black text-base shadow-sm">
                      👥
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-sand-100">
                          Team Member Limit (Squad Size)
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-sky-800 dark:text-cyan-300 border border-cyan-500/30">
                          Super Admin
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Available Pool: <strong className="text-slate-900 dark:text-sand-200">{activeNeplPoolCount} players</strong> ÷ <strong className="text-slate-900 dark:text-sand-200">{teams.length} teams</strong> = <strong className="text-emerald-700 dark:text-emerald-400">{suggestedSquadLimit} members/team suggested</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-sand-300">Set All Teams:</span>
                    {[8, 10, 11, 12, 14, 15, 16, 18, 20].map(size => {
                      const allHaveThis = teams.length > 0 && teams.every(t => (t.maxSquadSize || 10) === size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleUpdateAllSquadSizes(size)}
                          className={`px-2.5 py-1 rounded-xl font-mono text-xs font-black transition cursor-pointer shadow-sm ${
                            allHaveThis
                              ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400 shadow-md'
                              : 'bg-[#f4efe6] dark:bg-warm-900 text-slate-800 dark:text-sand-200 border border-[#d4ccbd] dark:border-warm-700 hover:border-cyan-400'
                          }`}
                          title={`Set all teams max capacity to ${size} members`}
                        >
                          {size}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => handleUpdateAllSquadSizes(suggestedSquadLimit)}
                      className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                      title={`Auto-set all teams to ${suggestedSquadLimit} members based on ${activeNeplPoolCount} available players`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto ({suggestedSquadLimit})</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Quick Actions Grid - 2 Teams per Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-y-auto p-1 pr-2">
              {teams.map(team => {
                const squad = team.squad || [];
                const maxCap = team.maxSquadSize || 10;
                const isFull = squad.length >= maxCap;
                const searchLower = rosterHubSearch.trim().toLowerCase();
                const filteredSquad = searchLower
                  ? squad.filter(p => 
                      p.name.toLowerCase().includes(searchLower) || 
                      (p.role && p.role.toLowerCase().includes(searchLower)) ||
                      (p.category && p.category.toLowerCase().includes(searchLower))
                    )
                  : squad;

                return (
                  <div
                    key={team.id}
                    className="p-4 sm:p-5 rounded-3xl bg-[#f4efe6] dark:bg-warm-900/90 border border-[#e2dacc] dark:border-warm-700/80 space-y-3.5 shadow-lg flex flex-col justify-between"
                    style={{ borderTop: `5px solid ${team.color || '#00f2fe'}` }}
                  >
                    {/* Team Header Tile */}
                    <div>
                      <div className="flex items-center justify-between border-b border-[#e2dacc] dark:border-warm-800/60 pb-3 gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className="text-2xl p-1.5 rounded-xl bg-white dark:bg-warm-950 border border-[#e2dacc] dark:border-warm-800 shadow-sm shrink-0">
                            {team.logo || '🏏'}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-900 dark:text-sand-100 text-base sm:text-lg font-sans truncate">
                              {team.name}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans truncate">
                              👑 Cap: <span className="text-amber-700 dark:text-amber-400 font-bold">{team.captainName || team.owner || 'TBD'}</span>
                            </p>
                          </div>
                        </div>

                        {/* Per-team Stepper & Status Badge & Compressed Photo Upload */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          {canManage && (
                            <label
                              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 text-purple-700 dark:text-purple-300 border border-purple-500/35 transition cursor-pointer flex items-center gap-1 text-xs font-bold font-sans shadow-sm"
                              title="Upload official team picture (Auto compressed ~30-50KB)"
                            >
                              <Camera className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span className="hidden sm:inline">Photo</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleManualTeamPhotoUpload(e, team.id)}
                                className="hidden"
                                disabled={compressingPhoto}
                              />
                            </label>
                          )}

                          <div className="flex items-center gap-1 bg-white dark:bg-warm-950 px-2 py-1 rounded-xl border border-[#d4ccbd] dark:border-warm-800 shadow-sm">
                            <button
                              type="button"
                              onClick={() => handleUpdateSingleTeamSquadSize(team.id, Math.max(1, maxCap - 1))}
                              className="w-5 h-5 rounded flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-[#e2dacc] dark:hover:bg-warm-800 transition cursor-pointer"
                              title="Decrease team capacity by 1"
                            >
                              -
                            </button>
                            <span className="text-xs font-mono font-black text-slate-900 dark:text-sand-100 px-1">
                              {squad.length}/{maxCap}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateSingleTeamSquadSize(team.id, maxCap + 1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-[#e2dacc] dark:hover:bg-warm-800 transition cursor-pointer"
                              title="Increase team capacity by 1"
                            >
                              +
                            </button>
                          </div>

                          <span className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border shadow-sm shrink-0 ${
                            isFull
                              ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40'
                              : 'bg-white dark:bg-warm-950 text-sky-800 dark:text-cyan-300 border-[#d4ccbd] dark:border-cyan-500/30'
                          }`}>
                            {isFull ? 'Full' : `${maxCap - squad.length} Open`}
                          </span>
                        </div>
                      </div>

                      {/* Squad Members List - Bigger & Taller */}
                      <div className="space-y-2.5 max-h-[460px] sm:max-h-[520px] overflow-y-auto pr-1.5 mt-3.5">
                        {filteredSquad.length === 0 && searchLower ? (
                          <div className="p-4 text-center text-xs text-slate-500 font-mono">
                            No squad player matches "{rosterHubSearch}"
                          </div>
                        ) : filteredSquad.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500 font-mono bg-white/50 dark:bg-warm-950/40 rounded-2xl border border-dashed border-[#d4ccbd] dark:border-warm-800">
                            Squad is currently empty. Click below to add players.
                          </div>
                        ) : null}

                        {[...filteredSquad].sort((a, b) => {
                          const aIsCap = Boolean(a.isCaptain || (team.captainId && String(a.id) === String(team.captainId)));
                          const bIsCap = Boolean(b.isCaptain || (team.captainId && String(b.id) === String(team.captainId)));
                          if (aIsCap && !bIsCap) return -1;
                          if (!aIsCap && bIsCap) return 1;
                          return 0;
                        }).map(p => {
                          const isCap = Boolean(p.isCaptain || (team.captainId && String(p.id) === String(team.captainId)));
                          const fullPlayerData = players.find(pl => pl.id === p.id) || p;
                          
                          return (
                            <div
                              key={p.id}
                              className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 shadow-sm gap-2.5 ${
                                isCap
                                  ? 'bg-amber-100/70 dark:bg-amber-950/35 border-amber-400 dark:border-amber-500/60 ring-1 ring-amber-400/30'
                                  : 'bg-white dark:bg-warm-950/70 border-[#e2dacc] dark:border-warm-800/80 hover:border-cyan-500/40'
                              }`}
                            >
                              {/* Player Avatar + Info */}
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="relative shrink-0">
                                  <img
                                    src={fullPlayerData.avatarUrl || p.avatarUrl || '/avatars/male.png'}
                                    alt={p.name}
                                    className={`w-11 h-11 rounded-xl object-cover border shadow-sm ${
                                      isCap ? 'border-amber-400 ring-1 ring-amber-400/40' : 'border-[#d4ccbd] dark:border-warm-700'
                                    }`}
                                    onError={e => { e.target.src = '/avatars/male.png'; }}
                                  />
                                  {isCap && (
                                    <span className="absolute -top-1 -right-1 p-0.5 bg-amber-400 text-slate-950 rounded-full shadow z-10">
                                      <Crown className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <h5 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-sand-100 truncate">
                                      {p.name}
                                    </h5>
                                    {isCap && (
                                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/40 shrink-0">
                                        Cap
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                    <span className="text-xs font-bold text-sky-700 dark:text-cyan-300 truncate">{p.role}</span>
                                    <span className="text-slate-400 text-xs font-mono">•</span>
                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 truncate">{p.category || 'Male'}</span>
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-0.5">
                                    🏏 {fullPlayerData.runs ?? 0} runs · 🎯 {fullPlayerData.wickets ?? 0} wkts · ⚡ SR {fullPlayerData.strikeRate ?? '-'}
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRosterHubOpen(false);
                                    handleQuickSwap(team, p);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 text-sky-800 dark:text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-sm"
                                  title={`Swap ${p.name} with another team player`}
                                >
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Swap</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRosterHubOpen(false);
                                    handleQuickTransfer(team, p);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/35 text-blue-800 dark:text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-sm"
                                  title={`Transfer ${p.name} to another team`}
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Transfer</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSquadPlayer(team, p)}
                                  className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer shadow-sm"
                                  title={`Remove ${p.name} from squad`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Add Free Player CTA */}
                    <div className="pt-3 border-t border-[#e2dacc] dark:border-warm-800/60">
                      <button
                        type="button"
                        onClick={() => {
                          setRosterHubOpen(false);
                          handleQuickAddPlayer(team);
                        }}
                        className="w-full py-2.5 sm:py-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 text-xs sm:text-sm font-extrabold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>+ Add Free Player to Squad</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#e2dacc] dark:border-warm-800 shrink-0">
              <span className="text-xs text-slate-600 dark:text-sand-400 font-mono">
                💡 Tip: Changes update team squads immediately across live scores, fixtures, and standings.
              </span>
              <button
                type="button"
                onClick={() => setRosterHubOpen(false)}
                className="btn-primary text-xs sm:text-sm px-6 py-2.5 cursor-pointer font-bold shadow-md self-end"
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
                  <h3 className="text-xl font-extrabold text-sand-100 flex items-center gap-2 font-sans tracking-tight">
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
