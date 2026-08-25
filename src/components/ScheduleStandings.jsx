import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Trophy,
  Calendar,
  Zap,
  Award,
  CheckCircle2,
  PlayCircle,
  PlusCircle,
  RotateCcw,
  Sparkles,
  Clock,
  MapPin,
  Edit3,
  Trash2,
  Plus,
  X,
  Lock,
  ChevronRight,
  ShieldAlert,
  Shuffle,
  CalendarDays,
  Filter,
  Save,
  Flame,
  AlertCircle,
  Radio,
  Crown,
  Activity,
  Check,
  TrendingUp,
  AwardIcon,
  Bot,
  Send,
  RefreshCw,
  Users,
  Layers,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { calculateNRR, sortStandings, oversToBalls, ballsToOversDisplay, ballsToDecimalOvers } from '../utils/nrr';
import { updateMatch as apiUpdateMatch, deleteMatch as apiDeleteMatch, saveMatches as apiSaveMatches } from '../services/api';
import { generateAIGroupFixtures } from '../services/gemini';
import FormattedChatMessage from './FormattedChatMessage';

const DEFAULT_SLOTS = [
  'Saturday Morning (Slot 1)',
  'Saturday Morning (Slot 2)',
  'Saturday Afternoon',
  'Saturday Evening (Prime Lights)',
  'Sunday Morning (Slot 1)',
  'Sunday Morning (Slot 2)',
  'Sunday Rain Cover Slot (Rule 10)',
  'Sunday Evening (Semifinals & Finals 🏆)',
];

export default function ScheduleStandings({ teams = [], matches = [], setMatches }) {
  const { can } = useAuth();
  const canManage = can('canManageTeams') || can('canManageRules') || can('canBid');

  // Filter & View states
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTeam, setSearchTeam] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [showAutoSchedulerModal, setShowAutoSchedulerModal] = useState(false);
  const [scoringMatch, setScoringMatch] = useState(null);

  // Auto Scheduler Configuration State
  const [schedulerConfig, setSchedulerConfig] = useState({
    startDate: new Date().toISOString().split('T')[0],
    startTime: '08:30',
    matchIntervalMinutes: 60,
    matchesPerDay: 4,
    venue: 'NEPL Box Cricket Turf',
    maxOvers: 8,
  });

  // Add / Edit Match Form State
  const [matchForm, setMatchForm] = useState({
    round: '',
    stage: 'league',
    team1Id: '',
    team2Id: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    slot: DEFAULT_SLOTS[0],
    venue: 'NEPL Box Cricket Turf',
    maxOvers: 8,
  });

  // ── Gemini AI Match Architect & Group Scheduler State ──────────────────────
  const [aiPrompt, setAiPrompt] = useState('Set the two groups A and B, divide the teams into groups and then create the matches');
  const [aiGroupCount, setAiGroupCount] = useState(2);
  const [aiMaxOvers, setAiMaxOvers] = useState(8);
  const [aiIncludeKnockouts, setAiIncludeKnockouts] = useState(true);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiFixtureResult, setAiFixtureResult] = useState(null);
  const [aiAppliedSuccess, setAiAppliedSuccess] = useState(false);
  const [isAiChatExpanded, setIsAiChatExpanded] = useState(true);

  const handleGenerateAiFixtures = async (overridePrompt) => {
    const promptToUse = overridePrompt || aiPrompt;
    setIsAiGenerating(true);
    setAiAppliedSuccess(false);

    try {
      const result = await generateAIGroupFixtures({
        teams,
        prompt: promptToUse,
        groupCount: aiGroupCount,
        maxOvers: aiMaxOvers,
        startDate: schedulerConfig.startDate,
        includeKnockouts: aiIncludeKnockouts
      });
      setAiFixtureResult(result);
    } catch (err) {
      alert(`⚠️ AI Match Generator: ${err.message}`);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleApplyAiFixtures = async () => {
    if (!aiFixtureResult || !aiFixtureResult.matches?.length) return;
    if (matches.length > 0) {
      if (!window.confirm(`This will REPLACE the existing ${matches.length} tournament matches with ${aiFixtureResult.matches.length} newly generated AI Group matches. Continue?`)) {
        return;
      }
    }

    try {
      if (setMatches) {
        setMatches(aiFixtureResult.matches);
      }
      await apiSaveMatches(aiFixtureResult.matches);
      setAiAppliedSuccess(true);
      setTimeout(() => setAiAppliedSuccess(false), 4000);
    } catch (err) {
      alert(`⚠️ Failed to save generated AI fixtures: ${err.message}`);
    }
  };

  // ── Standings Calculation strictly from Completed Matches ───────────────────
  const standings = useMemo(() => {
    const map = {};

    // 1. Initialize standings map for every registered team
    teams.forEach(t => {
      map[t.id || t.name] = {
        id: t.id,
        name: t.name,
        shortName: t.shortName || t.name.substring(0, 3).toUpperCase(),
        logo: t.logo || '🏏',
        color: t.color || '#d4622a',
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        points: 0,
        runsScored: 0,
        ballsFaced: 0,
        wicketsLost: 0,
        runsConceded: 0,
        ballsBowled: 0,
        wicketsTaken: 0,
        nrr: 0,
        form: [], // e.g. ['W', 'L', 'W']
      };
    });

    // 2. Accumulate scores & results from all completed league matches
    const leagueMatches = matches.filter(m => m.stage === 'league' || (!m.stage && !m.round?.toLowerCase().includes('semi') && !m.round?.toLowerCase().includes('final')));

    leagueMatches.forEach(m => {
      if (m.status === 'Completed') {
        const t1Key = m.team1Id || Object.keys(map).find(k => map[k].name === m.team1Name) || m.team1Name;
        const t2Key = m.team2Id || Object.keys(map).find(k => map[k].name === m.team2Name) || m.team2Name;

        const t1 = map[t1Key];
        const t2 = map[t2Key];

        const s1 = Number(m.score1) || 0;
        const ov1Balls = oversToBalls(Number(m.overs1) || 0);
        const w1 = Number(m.wickets1) || 0;

        const s2 = Number(m.score2) || 0;
        const ov2Balls = oversToBalls(Number(m.overs2) || 0);
        const w2 = Number(m.wickets2) || 0;

        if (t1) {
          t1.played += 1;
          t1.runsScored += s1;
          t1.ballsFaced += ov1Balls;
          t1.wicketsLost += w1;
          t1.runsConceded += s2;
          t1.ballsBowled += ov2Balls;
          t1.wicketsTaken += w2;
        }

        if (t2) {
          t2.played += 1;
          t2.runsScored += s2;
          t2.ballsFaced += ov2Balls;
          t2.wicketsLost += w2;
          t2.runsConceded += s1;
          t2.ballsBowled += ov1Balls;
          t2.wicketsTaken += w1;
        }

        if (t1 && t2) {
          if (s1 > s2) {
            t1.won += 1;
            t1.points += 2;
            t1.form.push('W');
            t2.lost += 1;
            t2.form.push('L');
          } else if (s2 > s1) {
            t2.won += 1;
            t2.points += 2;
            t2.form.push('W');
            t1.lost += 1;
            t1.form.push('L');
          } else {
            t1.tied += 1;
            t1.points += 1;
            t1.form.push('T');
            t2.tied += 1;
            t2.points += 1;
            t2.form.push('T');
          }
        }
      }
    });

    // 3. Compute official NRR for all teams
    Object.values(map).forEach(team => {
      team.nrr = calculateNRR(team.runsScored, team.ballsFaced, team.runsConceded, team.ballsBowled);
    });

    return sortStandings(Object.values(map));
  }, [teams, matches]);

  const tableTopper = standings[0];
  const rank2 = standings[1];
  const rank3 = standings[2];
  const rank4 = standings[3];

  // ── Find Playoff Matches in State ──────────────────────────────────────────
  const semifinalMatch = useMemo(() => {
    return matches.find(m => m.stage === 'semifinal' || m.round?.toLowerCase().includes('semifinal') || m.round?.toLowerCase().includes('semi-final'));
  }, [matches]);

  const finalMatch = useMemo(() => {
    return matches.find(m => m.stage === 'final' || m.round?.toLowerCase().includes('grand final') || m.round?.toLowerCase().includes('final 🏆') || (m.round?.toLowerCase().includes('final') && !m.round?.toLowerCase().includes('semi')));
  }, [matches]);

  const championTeam = useMemo(() => {
    if (finalMatch && finalMatch.status === 'Completed' && finalMatch.winner) {
      return teams.find(t => t.name === finalMatch.winner || t.id === finalMatch.winnerId) || { name: finalMatch.winner, logo: '🏆', color: '#c9a227' };
    }
    return null;
  }, [finalMatch, teams]);

  // ── Auto Generate / Sync Playoff Matches from Standings ─────────────────────
  const handleGeneratePlayoffsFromStandings = () => {
    if (!tableTopper || !rank2 || !rank3) {
      alert("⚠️ Need at least 3 teams to generate Playoff fixtures!");
      return;
    }

    const currentMatches = [...matches];
    let updatedMatches = currentMatches;

    // 1. Create or update Semifinal match (Rank 2 vs Rank 3)
    const existingSemiIndex = updatedMatches.findIndex(m => m.stage === 'semifinal' || m.round?.toLowerCase().includes('semifinal'));
    const semiFixture = {
      id: existingSemiIndex >= 0 ? updatedMatches[existingSemiIndex].id : `m-semi-${Date.now()}`,
      matchNumber: existingSemiIndex >= 0 ? updatedMatches[existingSemiIndex].matchNumber : updatedMatches.length + 1,
      round: 'Playoff Semifinal (Seed 2 vs Seed 3)',
      stage: 'semifinal',
      team1Id: rank2.id,
      team1Name: rank2.name,
      team1Logo: rank2.logo || '🏏',
      team1Color: rank2.color || '#10b981',
      team2Id: rank3.id,
      team2Name: rank3.name,
      team2Logo: rank3.logo || '🏏',
      team2Color: rank3.color || '#06b6d4',
      date: new Date().toISOString().split('T')[0],
      time: '18:00',
      slot: 'Sunday Evening (Playoff Semifinal)',
      venue: 'NEPL Box Cricket Turf',
      maxOvers: 8,
      status: existingSemiIndex >= 0 ? updatedMatches[existingSemiIndex].status : 'Scheduled',
      score1: existingSemiIndex >= 0 ? updatedMatches[existingSemiIndex].score1 : 0,
      overs1: existingSemiIndex >= 0 ? updatedMatches[existingSemiIndex].overs1 : 0,
      wickets1: existingSemiIndex >= 0 ? updatedMatches[existingSemiIndex].wickets1 : 0,
      score2: existingSemiIndex >= 0 ? updatedMatches[existingSemiIndex].score2 : 0,
      overs2: existingSemiIndex >= 0 ? updatedMatches[existingSemiIndex].overs2 : 0,
      wickets2: existingSemiIndex >= 0 ? updatedMatches[existingSemiIndex].wickets2 : 0,
      winnerId: existingSemiIndex >= 0 ? updatedMatches[existingSemiIndex].winnerId : null,
      winner: existingSemiIndex >= 0 ? updatedMatches[existingSemiIndex].winner : null,
      winMargin: existingSemiIndex >= 0 ? updatedMatches[existingSemiIndex].winMargin : '',
    };

    if (existingSemiIndex >= 0) {
      updatedMatches[existingSemiIndex] = { ...updatedMatches[existingSemiIndex], ...semiFixture };
    } else {
      updatedMatches.push(semiFixture);
    }

    // 2. Create or update Grand Finals match (Rank 1 vs Semifinal Winner)
    const semiWinnerName = semiFixture.winner || `${rank2.name} / ${rank3.name}`;
    const semiWinnerTeam = teams.find(t => t.name === semiFixture.winner) || { id: '', name: semiWinnerName, logo: '⚡', color: '#3b82f6' };

    const existingFinalIndex = updatedMatches.findIndex(m => m.stage === 'final' || m.round?.toLowerCase().includes('final') && !m.round?.toLowerCase().includes('semi'));
    const finalFixture = {
      id: existingFinalIndex >= 0 ? updatedMatches[existingFinalIndex].id : `m-final-${Date.now()}`,
      matchNumber: existingFinalIndex >= 0 ? updatedMatches[existingFinalIndex].matchNumber : updatedMatches.length + 1,
      round: 'NEPL Grand Finals 🏆',
      stage: 'final',
      team1Id: tableTopper.id,
      team1Name: tableTopper.name,
      team1Logo: tableTopper.logo || '👑',
      team1Color: tableTopper.color || '#c9a227',
      team2Id: semiWinnerTeam.id || '',
      team2Name: semiWinnerTeam.name,
      team2Logo: semiWinnerTeam.logo || '⚡',
      team2Color: semiWinnerTeam.color || '#3b82f6',
      date: new Date().toISOString().split('T')[0],
      time: '19:30',
      slot: 'Sunday Night (Grand Finals 🏆)',
      venue: 'NEPL Box Cricket Turf',
      maxOvers: 8,
      status: existingFinalIndex >= 0 ? updatedMatches[existingFinalIndex].status : 'Scheduled',
      score1: existingFinalIndex >= 0 ? updatedMatches[existingFinalIndex].score1 : 0,
      overs1: existingFinalIndex >= 0 ? updatedMatches[existingFinalIndex].overs1 : 0,
      wickets1: existingFinalIndex >= 0 ? updatedMatches[existingFinalIndex].wickets1 : 0,
      score2: existingFinalIndex >= 0 ? updatedMatches[existingFinalIndex].score2 : 0,
      overs2: existingFinalIndex >= 0 ? updatedMatches[existingFinalIndex].overs2 : 0,
      wickets2: existingFinalIndex >= 0 ? updatedMatches[existingFinalIndex].wickets2 : 0,
      winnerId: existingFinalIndex >= 0 ? updatedMatches[existingFinalIndex].winnerId : null,
      winner: existingFinalIndex >= 0 ? updatedMatches[existingFinalIndex].winner : null,
      winMargin: existingFinalIndex >= 0 ? updatedMatches[existingFinalIndex].winMargin : '',
    };

    if (existingFinalIndex >= 0) {
      updatedMatches[existingFinalIndex] = { ...updatedMatches[existingFinalIndex], ...finalFixture };
    } else {
      updatedMatches.push(finalFixture);
    }

    setMatches(updatedMatches);
    apiSaveMatches(updatedMatches).catch(err => console.warn('Save playoffs error:', err));
  };

  // ── Round Robin Schedule Generator ─────────────────────────────────────────
  const handleGenerateRoundRobin = () => {
    if (teams.length < 2) {
      alert("⚠️ Need at least 2 teams registered in 'Teams & Purse' to generate a Round Robin schedule!");
      return;
    }

    if (matches.length > 0) {
      if (!window.confirm("⚠️ This will regenerate the tournament schedule for all available teams. Existing match results will be overwritten. Continue?")) {
        return;
      }
    }

    const newMatches = [];
    let matchCount = 1;
    const baseDate = new Date(schedulerConfig.startDate || new Date());
    const [startH, startM] = (schedulerConfig.startTime || '08:30').split(':').map(Number);

    // Pair all teams: round robin algorithm
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const team1 = teams[i];
        const team2 = teams[j];

        const dayOffset = Math.floor((matchCount - 1) / schedulerConfig.matchesPerDay);
        const matchIndexInDay = (matchCount - 1) % schedulerConfig.matchesPerDay;

        const matchDate = new Date(baseDate);
        matchDate.setDate(baseDate.getDate() + dayOffset);
        const dateStr = matchDate.toISOString().split('T')[0];

        const totalMinutes = startH * 60 + startM + matchIndexInDay * Number(schedulerConfig.matchIntervalMinutes);
        const h = Math.floor(totalMinutes / 60) % 24;
        const m = totalMinutes % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        const slotLabel = matchIndexInDay === 0 ? 'Morning Slot 1' :
          matchIndexInDay === 1 ? 'Morning Slot 2' :
          matchIndexInDay === 2 ? 'Afternoon Slot' : 'Evening Prime Lights';

        newMatches.push({
          id: `m-rr-${Date.now()}-${matchCount}`,
          matchNumber: matchCount,
          round: `League Match ${matchCount}`,
          stage: 'league',
          team1Id: team1.id,
          team1Name: team1.name,
          team1Logo: team1.logo || '🏏',
          team1Color: team1.color || '#d4622a',
          team2Id: team2.id,
          team2Name: team2.name,
          team2Logo: team2.logo || '🏏',
          team2Color: team2.color || '#3b82f6',
          date: dateStr,
          time: timeStr,
          slot: `Day ${dayOffset + 1} · ${slotLabel}`,
          venue: schedulerConfig.venue || 'NEPL Box Cricket Turf',
          maxOvers: schedulerConfig.maxOvers || 8,
          status: 'Scheduled',
          score1: 0,
          overs1: 0,
          wickets1: 0,
          score2: 0,
          overs2: 0,
          wickets2: 0,
          winnerId: null,
          winner: null,
          winMargin: '',
          notes: '8 Overs Innings · Max 6 On Ground · 7 Wickets Out Limit',
        });

        matchCount++;
      }
    }

    setMatches(newMatches);
    apiSaveMatches(newMatches).catch(err => console.warn('Save matches error:', err));
    setShowAutoSchedulerModal(false);
  };

  // ── Open Add / Edit Match Modal ────────────────────────────────────────────
  const openAddMatchModal = () => {
    setEditingMatch(null);
    const nextMatchNum = matches.length + 1;
    setMatchForm({
      round: `Match ${nextMatchNum}`,
      stage: 'league',
      team1Id: teams[0]?.id || '',
      team2Id: teams[1]?.id || '',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      slot: DEFAULT_SLOTS[0],
      venue: 'NEPL Box Cricket Turf',
      maxOvers: 8,
    });
    setShowAddModal(true);
  };

  const openEditMatchModal = (match) => {
    setEditingMatch(match);
    setMatchForm({
      round: match.round,
      stage: match.stage || 'league',
      team1Id: match.team1Id || teams.find(t => t.name === match.team1Name)?.id || '',
      team2Id: match.team2Id || teams.find(t => t.name === match.team2Name)?.id || '',
      date: match.date || new Date().toISOString().split('T')[0],
      time: match.time || '09:00',
      slot: match.slot || DEFAULT_SLOTS[0],
      venue: match.venue || 'NEPL Box Cricket Turf',
      maxOvers: match.maxOvers || 8,
    });
    setShowAddModal(true);
  };

  // ── Save or Update Match ───────────────────────────────────────────────────
  const handleSaveMatchForm = (e) => {
    e.preventDefault();
    const t1 = teams.find(t => t.id === matchForm.team1Id);
    const t2 = teams.find(t => t.id === matchForm.team2Id);

    if (!t1 || !t2) {
      alert("Please select both Team 1 and Team 2 from the available teams.");
      return;
    }

    if (t1.id === t2.id) {
      alert("Team 1 and Team 2 cannot be the same team!");
      return;
    }

    if (editingMatch) {
      const updated = {
        ...editingMatch,
        round: matchForm.round.trim(),
        stage: matchForm.stage,
        team1Id: t1.id,
        team1Name: t1.name,
        team1Logo: t1.logo || '🏏',
        team1Color: t1.color || '#d4622a',
        team2Id: t2.id,
        team2Name: t2.name,
        team2Logo: t2.logo || '🏏',
        team2Color: t2.color || '#3b82f6',
        date: matchForm.date,
        time: matchForm.time,
        slot: matchForm.slot,
        venue: matchForm.venue,
        maxOvers: Number(matchForm.maxOvers) || 8,
      };

      const nextMatches = matches.map(m => m.id === editingMatch.id ? updated : m);
      setMatches(nextMatches);
      apiUpdateMatch(editingMatch.id, updated).catch(err => console.warn('Update match error:', err));
    } else {
      const newMatchId = `m-${Date.now()}`;
      const newMatch = {
        id: newMatchId,
        matchNumber: matches.length + 1,
        round: matchForm.round.trim() || `Match ${matches.length + 1}`,
        stage: matchForm.stage,
        team1Id: t1.id,
        team1Name: t1.name,
        team1Logo: t1.logo || '🏏',
        team1Color: t1.color || '#d4622a',
        team2Id: t2.id,
        team2Name: t2.name,
        team2Logo: t2.logo || '🏏',
        team2Color: t2.color || '#3b82f6',
        date: matchForm.date,
        time: matchForm.time,
        slot: matchForm.slot,
        venue: matchForm.venue,
        maxOvers: Number(matchForm.maxOvers) || 8,
        status: 'Scheduled',
        score1: 0,
        overs1: 0,
        wickets1: 0,
        score2: 0,
        overs2: 0,
        wickets2: 0,
        winnerId: null,
        winner: null,
        winMargin: '',
        notes: '',
      };

      const nextMatches = [...matches, newMatch];
      setMatches(nextMatches);
      apiSaveMatches(nextMatches).catch(err => console.warn('Save matches error:', err));
    }

    setShowAddModal(false);
  };

  // ── Delete Match ───────────────────────────────────────────────────────────
  const handleDeleteMatch = (match) => {
    if (!canManage) return;
    if (window.confirm(`Delete ${match.round} (${match.team1Name} vs ${match.team2Name})?`)) {
      const nextMatches = matches.filter(m => m.id !== match.id);
      setMatches(nextMatches);
      apiDeleteMatch(match.id).catch(err => console.warn('Delete match error:', err));
    }
  };

  // ── Scorekeeper Save ───────────────────────────────────────────────────────
  const handleSaveScore = (matchId, s1, ov1, w1, s2, ov2, w2, status, tossWinner = '', tossDecision = '') => {
    const runs1 = parseInt(s1, 10);
    const overs1 = parseFloat(ov1);
    const wickets1 = Math.min(7, Math.max(0, parseInt(w1, 10) || 0));

    const runs2 = parseInt(s2, 10);
    const overs2 = parseFloat(ov2);
    const wickets2 = Math.min(7, Math.max(0, parseInt(w2, 10) || 0));

    if (isNaN(runs1) || isNaN(overs1) || isNaN(runs2) || isNaN(overs2)) {
      alert("Please enter valid numeric runs and overs for both teams!");
      return;
    }

    const current = matches.find(m => m.id === matchId);
    if (!current) return;

    let winnerName = null;
    let winnerId = null;
    let winMargin = '';

    if (status === 'Completed') {
      if (runs1 > runs2) {
        winnerName = current.team1Name;
        winnerId = current.team1Id;
        winMargin = `Won by ${runs1 - runs2} runs`;
      } else if (runs2 > runs1) {
        winnerName = current.team2Name;
        winnerId = current.team2Id;
        const wkLeft = 7 - wickets2;
        winMargin = `Won by ${wkLeft} wicket${wkLeft === 1 ? '' : 's'}`;
      } else {
        winnerName = 'Match Tied';
        winMargin = 'Super Over / Tie';
      }
    }

    const updated = {
      ...current,
      score1: runs1,
      overs1: overs1,
      wickets1: wickets1,
      score2: runs2,
      overs2: overs2,
      wickets2: wickets2,
      status,
      winner: winnerName,
      winnerId,
      winMargin,
      tossWinner,
      tossDecision,
    };

    let nextMatches = matches.map(m => m.id === matchId ? updated : m);

    // If a semifinal match completed, update final match team 2 with the semifinal winner!
    if (updated.stage === 'semifinal' && updated.status === 'Completed' && updated.winner) {
      nextMatches = nextMatches.map(m => {
        if (m.stage === 'final' || m.round?.toLowerCase().includes('grand final')) {
          const winTeam = teams.find(t => t.name === updated.winner) || { id: updated.winnerId, name: updated.winner, logo: '⚡', color: '#10b981' };
          return {
            ...m,
            team2Id: winTeam.id,
            team2Name: winTeam.name,
            team2Logo: winTeam.logo || '⚡',
            team2Color: winTeam.color || '#10b981',
          };
        }
        return m;
      });
    }

    setMatches(nextMatches);
    apiUpdateMatch(matchId, updated).catch(err => console.warn('Update score error:', err));
    setScoringMatch(null);
  };

  // ── Reset Match Score ──────────────────────────────────────────────────────
  const handleResetScore = (matchId) => {
    if (!window.confirm("Reset this match score back to Scheduled?")) return;
    const current = matches.find(m => m.id === matchId);
    if (!current) return;

    const reset = {
      ...current,
      score1: 0,
      overs1: 0,
      wickets1: 0,
      score2: 0,
      overs2: 0,
      wickets2: 0,
      status: 'Scheduled',
      winner: null,
      winnerId: null,
      winMargin: '',
    };

    const nextMatches = matches.map(m => m.id === matchId ? reset : m);
    setMatches(nextMatches);
    apiUpdateMatch(matchId, reset).catch(err => console.warn('Reset score error:', err));
  };

  // ── Filtered Matches ───────────────────────────────────────────────────────
  const filteredMatches = matches.filter(m => {
    if (filterStatus !== 'ALL' && m.status !== filterStatus) return false;
    if (searchTeam) {
      const q = searchTeam.toLowerCase();
      const matchT1 = (m.team1Name || '').toLowerCase().includes(q);
      const matchT2 = (m.team2Name || '').toLowerCase().includes(q);
      const matchRound = (m.round || '').toLowerCase().includes(q);
      const matchSlot = (m.slot || '').toLowerCase().includes(q);
      if (!matchT1 && !matchT2 && !matchRound && !matchSlot) return false;
    }
    return true;
  });

  const completedMatchesCount = matches.filter(m => m.status === 'Completed').length;

  return (
    <div className="space-y-8">

      {/* ── Top Header Banner ── */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-warm-700/50 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>NEPL Live Match Center & Standings Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-sand-100 font-sans tracking-tight flex items-center gap-3">
            <Calendar className="w-7 h-7 text-cricket-emerald" />
            Tournament Schedule & Standings
          </h2>
          <p className="text-sand-400 text-xs sm:text-sm max-w-2xl">
            Points Table and Playoff Brackets dynamically calculated in real time from recorded match results.
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2.5 z-10">
            <button
              onClick={handleGeneratePlayoffsFromStandings}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-900/30 transition cursor-pointer"
              title="Auto-sync Playoff Semifinals and Finals matches from current Points Table"
            >
              <Zap className="w-4 h-4 text-slate-950" />
              <span>Sync Playoff Bracket</span>
            </button>

            <button
              onClick={() => setShowAutoSchedulerModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition cursor-pointer"
              title="Automatically generate round robin matches for all teams in Teams & Purse"
            >
              <Shuffle className="w-4 h-4" />
              <span>Auto Round-Robin</span>
            </button>

            <button
              onClick={openAddMatchModal}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-terracotta-900/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Match</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Warning Banner if No Teams in MongoDB ── */}
      {teams.length === 0 && (
        <div className="p-6 rounded-3xl bg-amber-950/30 border border-amber-500/40 text-amber-200 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <h4 className="font-bold text-sand-100 text-base">No Teams Found in Database</h4>
            <p className="text-amber-300/90">
              Please go to the <strong>Teams & Purse</strong> tab to register or create participating teams first. Once created, return here to generate round-robin schedules and record live match scores.
            </p>
          </div>
        </div>
      )}

      {/* ── CHAMPIONS BANNER (When Grand Finals is Completed) ── */}
      {championTeam && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/50 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 space-y-4 text-center relative overflow-hidden shadow-[0_0_50px_rgba(201,162,39,0.25)] animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg">
            <Trophy className="w-4 h-4 text-slate-950" />
            <span>NEPL {new Date().getFullYear()} OFFICIAL CHAMPIONS 🏆</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
            <span className="text-6xl p-3 bg-amber-500/20 rounded-3xl border border-amber-500/40 shadow-inner">
              {championTeam.logo}
            </span>
            <div className="text-center sm:text-left">
              <h2 className="text-3xl sm:text-4xl font-black text-white font-serif tracking-tight">
                {championTeam.name}
              </h2>
              <p className="text-amber-300 font-mono text-sm font-bold mt-1">
                Grand Finals Winners · Prize: INR 2,500 + Golden Trophy 🏆
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-sand-300 pt-2 border-t border-amber-500/30">
            <span>Result: <strong className="text-white">{finalMatch.winner} {finalMatch.winMargin ? `(${finalMatch.winMargin})` : ''}</strong></span>
            <span>·</span>
            <span>Score: <strong className="text-white">{finalMatch.team1Name} {finalMatch.score1}/{finalMatch.wickets1} vs {finalMatch.team2Name} {finalMatch.score2}/{finalMatch.wickets2}</strong></span>
          </div>
        </div>
      )}

      {/* ── League Points Table (Standings) ── */}
      <div className="glass-panel p-6 rounded-3xl border border-warm-700/50 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-800/60 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Trophy className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white font-sans flex items-center gap-2 tracking-tight">
                NEPL {new Date().getFullYear()} Points Table & NRR Standings
              </h3>
              <p className="text-sand-500 text-xs">
                Dynamically calculated from all completed league matches. Sorted by Points $\rightarrow$ NRR $\rightarrow$ Wins.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-sand-400 bg-warm-950/60 px-3 py-1.5 rounded-xl border border-warm-800">
            <span>Teams: <strong className="text-white">{teams.length}</strong></span>
            <span>·</span>
            <span>Completed Matches: <strong className="text-cricket-emerald">{completedMatchesCount}</strong>/{matches.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-sand-300">
            <thead className="bg-warm-900/80 text-sand-400 font-mono uppercase tracking-wider border-b border-warm-700/50">
              <tr>
                <th className="py-3.5 px-4 text-center">Pos</th>
                <th className="py-3.5 px-4">Team</th>
                <th className="py-3.5 px-4 text-center">P</th>
                <th className="py-3.5 px-4 text-center">W</th>
                <th className="py-3.5 px-4 text-center">L</th>
                <th className="py-3.5 px-4 text-center">T/NR</th>
                <th className="py-3.5 px-4 text-center font-bold text-amber-300">PTS</th>
                <th className="py-3.5 px-4 text-center">For (Runs/Ov)</th>
                <th className="py-3.5 px-4 text-center">Against</th>
                <th className="py-3.5 px-4 text-center font-bold text-cyan-400">NRR</th>
                <th className="py-3.5 px-4 text-center">Form</th>
                <th className="py-3.5 px-4 text-right">Playoff Seed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-700/40 font-mono">
              {standings.length > 0 ? (
                standings.map((team, idx) => {
                  const isTopper = idx === 0 && team.played > 0;
                  const isSemi = (idx === 1 || idx === 2) && team.played > 0;

                  return (
                    <tr
                      key={team.id || team.name}
                      className={`hover:bg-warm-900/50 transition ${
                        isTopper
                          ? 'bg-gradient-to-r from-amber-500/15 via-transparent to-transparent font-bold'
                          : isSemi
                          ? 'bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent'
                          : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-bold">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs ${
                          idx === 0 ? 'bg-amber-400 text-slate-950 font-black shadow-md' :
                          idx === 1 ? 'bg-emerald-400 text-slate-950 font-black' :
                          idx === 2 ? 'bg-teal-400 text-slate-950 font-black' :
                          'bg-warm-800 text-sand-400'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-sans font-bold text-white">
                        <div className="flex items-center space-x-2.5">
                          <span
                            className="p-1.5 rounded-lg border text-sm"
                            style={{
                              backgroundColor: `${team.color}20`,
                              borderColor: `${team.color}40`,
                            }}
                          >
                            {team.logo}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{team.name}</span>
                              <span
                                className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-black"
                                style={{
                                  backgroundColor: `${team.color}25`,
                                  color: team.color,
                                }}
                              >
                                {team.shortName}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-sand-200">{team.played}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-cricket-emerald">{team.won}</td>
                      <td className="py-3.5 px-4 text-center text-rose-400">{team.lost}</td>
                      <td className="py-3.5 px-4 text-center text-sand-500">{team.tied}</td>
                      <td className="py-3.5 px-4 text-center font-black text-amber-400 text-sm">
                        {team.points}
                      </td>
                      <td className="py-3.5 px-4 text-center text-sand-400 text-[11px]">
                        {team.runsScored} / {ballsToOversDisplay(team.ballsFaced)} ov
                      </td>
                      <td className="py-3.5 px-4 text-center text-sand-400 text-[11px]">
                        {team.runsConceded} / {ballsToOversDisplay(team.ballsBowled)} ov
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded ${
                          team.nrr > 0 ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' :
                          team.nrr < 0 ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' :
                          'text-sand-500'
                        }`}>
                          {team.nrr > 0 ? `+${team.nrr.toFixed(3)}` : team.nrr.toFixed(3)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {team.form && team.form.length > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            {team.form.slice(-4).map((res, fIdx) => (
                              <span
                                key={fIdx}
                                className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                                  res === 'W' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                                  res === 'L' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                                  'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}
                              >
                                {res}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sand-600 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        {idx === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-extrabold text-[10px] uppercase border border-amber-500/30 shadow-sm">
                            <Trophy className="w-3 h-3 text-amber-400" />
                            Finals Direct (Seed #1) 🏆
                          </span>
                        ) : idx === 1 || idx === 2 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 font-bold text-[10px] uppercase border border-emerald-500/30">
                            <Zap className="w-3 h-3 text-emerald-400" />
                            Semifinalist (Seed #{idx + 1}) ⚡
                          </span>
                        ) : (
                          <span className="text-sand-600 text-[10px] font-mono">Contender</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-sand-500 font-sans">
                    No teams available in database yet. Add teams in the "Teams & Purse" tab.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Official NEPL Playoff & Qualifier Bracket (Rendered strictly from match results & standings) ── */}
      <div className="glass-panel p-6 rounded-3xl border border-warm-700/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-800/60 pb-3">
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2 font-serif">
              <Zap className="w-5 h-5 text-amber-400" />
              Official NEPL Playoff & Qualifier Bracket
            </h3>
            <p className="text-sand-500 text-xs mt-0.5">
              Derived automatically from League Results. Rank 1 advances to Finals; Rank 2 vs 3 battle in Semifinal.
            </p>
          </div>

          {canManage && (
            <button
              onClick={handleGeneratePlayoffsFromStandings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-warm-900 hover:bg-warm-800 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold transition cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Update Bracket from Standings</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

          {/* Semifinal Match Card */}
          <div className="p-5 rounded-2xl bg-warm-900/80 border border-warm-700/50 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between text-xs text-cyan-400 font-bold font-mono">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-cyan-400" />
                PLAYOFF SEMIFINAL (Seed #2 vs Seed #3)
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] ${
                semifinalMatch?.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' :
                semifinalMatch?.status === 'Live' ? 'bg-rose-500/20 text-rose-300 animate-pulse' :
                'bg-warm-950 text-sand-400'
              }`}>
                {semifinalMatch?.status || 'Projected'}
              </span>
            </div>

            <div className="p-4 bg-warm-950 rounded-xl space-y-3 border border-warm-800">
              
              {/* Seed 2 Team */}
              <div className="flex items-center justify-between text-sm font-bold text-white">
                <div className="flex items-center gap-2">
                  <span className="text-base">{semifinalMatch?.team1Logo || rank2?.logo || '🏏'}</span>
                  <span>{semifinalMatch?.team1Name || rank2?.name || 'Rank 2 Team'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {semifinalMatch && semifinalMatch.status !== 'Scheduled' && (
                    <span className="font-mono text-sand-100 font-bold">
                      {semifinalMatch.score1}/{semifinalMatch.wickets1} ({semifinalMatch.overs1} ov)
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-mono">
                    Seed #2
                  </span>
                </div>
              </div>

              <div className="text-center text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-black">
                ⚔️ VS ⚔️
              </div>

              {/* Seed 3 Team */}
              <div className="flex items-center justify-between text-sm font-bold text-white">
                <div className="flex items-center gap-2">
                  <span className="text-base">{semifinalMatch?.team2Logo || rank3?.logo || '🏏'}</span>
                  <span>{semifinalMatch?.team2Name || rank3?.name || 'Rank 3 Team'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {semifinalMatch && semifinalMatch.status !== 'Scheduled' && (
                    <span className="font-mono text-sand-100 font-bold">
                      {semifinalMatch.score2}/{semifinalMatch.wickets2} ({semifinalMatch.overs2} ov)
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-mono">
                    Seed #3
                  </span>
                </div>
              </div>
            </div>

            {/* Semifinal Status & Actions */}
            <div className="text-[11px] text-sand-400 flex items-center justify-between pt-1 border-t border-warm-800">
              {semifinalMatch?.winner ? (
                <span className="text-emerald-400 font-bold font-mono flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Winner: {semifinalMatch.winner} ({semifinalMatch.winMargin || 'Advances to Finals'})
                </span>
              ) : (
                <span>Winner advances to Grand Finals</span>
              )}

              {canManage && (
                <button
                  onClick={() => {
                    if (semifinalMatch) {
                      setScoringMatch(semifinalMatch);
                    } else {
                      handleGeneratePlayoffsFromStandings();
                    }
                  }}
                  className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold cursor-pointer"
                >
                  {semifinalMatch ? (semifinalMatch.status === 'Completed' ? 'Edit Semifinal' : 'Score Semifinal') : 'Schedule Semifinal'}
                </button>
              )}
            </div>
          </div>

          {/* Grand Finals Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-tr from-amber-500/15 via-yellow-500/5 to-amber-500/25 border border-amber-500/40 flex flex-col justify-between space-y-4 shadow-xl">
            <div className="flex items-center justify-between text-xs text-amber-300 font-bold font-mono">
              <span className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                NEPL GRAND FINALS 🏆
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] ${
                finalMatch?.status === 'Completed' ? 'bg-amber-400 text-slate-950 font-black' :
                finalMatch?.status === 'Live' ? 'bg-rose-500/20 text-rose-300 animate-pulse' :
                'bg-amber-500/20 text-amber-300'
              }`}>
                {finalMatch?.status || 'Sunday 8:00 PM'}
              </span>
            </div>

            <div className="p-4 bg-warm-950/90 rounded-xl space-y-3 border border-amber-500/30">
              
              {/* Seed 1 Direct Finalist */}
              <div className="flex items-center justify-between text-sm font-extrabold text-amber-300">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{finalMatch?.team1Logo || tableTopper?.logo || '👑'}</span>
                  <span>{finalMatch?.team1Name || tableTopper?.name || 'League Table Topper'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {finalMatch && finalMatch.status !== 'Scheduled' && (
                    <span className="font-mono text-sand-100 font-bold">
                      {finalMatch.score1}/{finalMatch.wickets1} ({finalMatch.overs1} ov)
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                    Seed #1
                  </span>
                </div>
              </div>

              <div className="text-center text-[10px] font-mono text-amber-400 uppercase tracking-widest font-black">
                🏆 CHAMPIONSHIP CLASH 🏆
              </div>

              {/* Semifinal Winner Finalist */}
              <div className="flex items-center justify-between text-sm font-bold text-white">
                <div className="flex items-center gap-2">
                  <span className="text-base">{finalMatch?.team2Logo || '⚡'}</span>
                  <span>{finalMatch?.team2Name || (semifinalMatch?.winner ? semifinalMatch.winner : 'Winner of Semifinal')}</span>
                </div>
                <div className="flex items-center gap-2">
                  {finalMatch && finalMatch.status !== 'Scheduled' && (
                    <span className="font-mono text-sand-100 font-bold">
                      {finalMatch.score2}/{finalMatch.wickets2} ({finalMatch.overs2} ov)
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-warm-900 border border-warm-700 text-sand-400 text-[10px] font-mono">
                    {semifinalMatch?.winner ? 'Qualifier' : 'Semifinal Winner'}
                  </span>
                </div>
              </div>
            </div>

            {/* Finals Status & Actions */}
            <div className="text-[11px] text-amber-300 font-semibold flex items-center justify-between pt-1 border-t border-amber-500/30">
              {finalMatch?.winner ? (
                <span className="text-amber-300 font-bold font-mono flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  CHAMPION: {finalMatch.winner} ({finalMatch.winMargin})
                </span>
              ) : (
                <span>Prize: Winner ₹2,500 + Golden Trophy 🏆</span>
              )}

              {canManage && (
                <button
                  onClick={() => {
                    if (finalMatch) {
                      setScoringMatch(finalMatch);
                    } else {
                      handleGeneratePlayoffsFromStandings();
                    }
                  }}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] uppercase cursor-pointer"
                >
                  {finalMatch ? (finalMatch.status === 'Completed' ? 'Edit Finals' : 'Score Grand Finals') : 'Schedule Finals'}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Round Robin Match Center & Scorekeeper ── */}
      <div className="glass-panel p-6 rounded-3xl border border-warm-700/50 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-800/60 pb-4">
          <div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2 font-sans tracking-tight">
              <PlayCircle className="w-6 h-6 text-cyan-400" />
              Round Robin League Match Center & Scorekeeper
            </h3>
            <p className="text-sand-500 text-xs mt-0.5">
              Live score recording with runs, overs (8 overs max), and wickets (7 wickets limit).
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-warm-950 p-1 rounded-xl border border-warm-800 text-xs font-mono">
              {['ALL', 'Scheduled', 'Live', 'Completed'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    filterStatus === status
                      ? 'bg-cyan-500 text-slate-950 shadow-md'
                      : 'text-sand-400 hover:text-sand-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search team or slot..."
              value={searchTeam}
              onChange={e => setSearchTeam(e.target.value)}
              className="bg-warm-950 border border-warm-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-sand-600 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>
        </div>

        {/* ── 🤖 Gemini AI Match Architect & Group Scheduler Screen ── */}
        <div className="bg-[#0b1120]/95 border border-cyan-500/30 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl relative overflow-hidden font-sans">
          
          {/* Header & Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 p-[2px] shadow-[0_0_20px_rgba(0,242,254,0.4)] shrink-0">
                <div className="w-full h-full bg-[#070b14] rounded-[14px] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                    Gemini AI Match Architect & Group Fixture Scheduler
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-extrabold border border-cyan-500/40">
                    Gemini AI
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Accept tournament rules, split teams into Group A & Group B, and generate official match fixtures with AI.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAiChatExpanded(prev => !prev)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-extrabold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>{isAiChatExpanded ? 'Collapse Engine' : 'Expand Engine'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAiChatExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {isAiChatExpanded && (
            <div className="space-y-4">
              
              {/* Quick Strategy Preset Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    label: '⚡ 2 Groups (A & B) + Round-Robin Matches',
                    prompt: 'Set the two groups A and B, divide the teams into groups and then create the matches'
                  },
                  {
                    label: '🏆 2 Groups + Semi-Finals & Grand Final',
                    prompt: 'Divide all registered teams into Group A and Group B (balanced by squad strength), create intra-group round-robin fixtures, and add Knockout Semi-Finals & Grand Final.'
                  },
                  {
                    label: '🏏 1 Single Pool (All Play All)',
                    prompt: 'Set a single unified league pool where all teams play each other once, followed by Grand Final.'
                  },
                  {
                    label: '⚖️ Power & Purse Balanced Groups',
                    prompt: 'Perform balanced snake-draft seeding for Group A and Group B based on team total ratings and purse budgets.'
                  }
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAiPrompt(chip.prompt);
                      handleGenerateAiFixtures(chip.prompt);
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#070b14] hover:bg-cyan-500/15 text-slate-300 hover:text-cyan-300 border border-cyan-500/25 transition cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Chat Input & Rule Submission Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGenerateAiFixtures();
                }}
                className="space-y-3"
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g. Set the two groups A and B, divide the teams into groups and then create the matches"
                      className="w-full bg-[#070b14] border border-cyan-500/30 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isAiGenerating || teams.length < 2}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:from-cyan-300 hover:to-purple-500 text-slate-950 font-extrabold text-xs sm:text-sm tracking-tight transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.35)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {isAiGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Architecting Matches…</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Generate AI Groups & Matches</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Config Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-[#070b14] p-3 rounded-2xl border border-cyan-500/20">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-slate-400 font-mono">Groups:</label>
                      <select
                        value={aiGroupCount}
                        onChange={(e) => setAiGroupCount(Number(e.target.value))}
                        className="bg-[#0b1120] border border-cyan-500/30 text-cyan-300 text-xs rounded-xl px-2.5 py-1 font-mono focus:outline-none"
                      >
                        <option value={2}>2 Groups (Group A & Group B)</option>
                        <option value={3}>3 Groups (A, B, C)</option>
                        <option value={1}>1 Single Pool (All vs All)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-slate-400 font-mono">Match Overs:</label>
                      <select
                        value={aiMaxOvers}
                        onChange={(e) => setAiMaxOvers(Number(e.target.value))}
                        className="bg-[#0b1120] border border-cyan-500/30 text-cyan-300 text-xs rounded-xl px-2.5 py-1 font-mono focus:outline-none"
                      >
                        <option value={6}>6 Overs Match</option>
                        <option value={8}>8 Overs Match (Official Standard)</option>
                        <option value={10}>10 Overs Match</option>
                        <option value={12}>12 Overs Match (Full Summer Spec)</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={aiIncludeKnockouts}
                        onChange={(e) => setAiIncludeKnockouts(e.target.checked)}
                        className="accent-cyan-400 cursor-pointer"
                      />
                      <span>Include Semi-Finals & Grand Final</span>
                    </label>
                  </div>

                  <span className="text-slate-500 font-mono text-[11px]">
                    Available Teams: <strong className="text-white">{teams.length} Teams</strong>
                  </span>
                </div>
              </form>

              {/* AI Generation Loading State */}
              {isAiGenerating && (
                <div className="p-6 text-center rounded-2xl bg-[#070b14] border border-cyan-500/30 space-y-2 animate-pulse">
                  <div className="flex items-center justify-center gap-2 text-cyan-300 font-extrabold text-sm">
                    <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                    <span>Gemini AI is analyzing teams, group balancing, and scheduling fixtures…</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Applying round-robin intra-group rotation, venue constraints, and championship qualification rules.
                  </p>
                </div>
              )}

              {/* AI Response Display & Generated Groups + Matches Preview */}
              {aiFixtureResult && !isAiGenerating && (
                <div className="space-y-4 pt-2 animate-fade-in">
                  
                  {/* AI Strategy Briefing Commentary */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#070b14] border border-cyan-500/30 text-xs sm:text-sm text-slate-200 leading-relaxed shadow-lg space-y-2">
                    <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                      <span className="font-extrabold text-cyan-300 flex items-center gap-1.5 text-xs sm:text-sm">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        AI Tournament Architecture Briefing
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Source: <span className="text-cyan-400">{aiFixtureResult.source}</span>
                      </span>
                    </div>
                    <div className="border-t border-cyan-500/15 pt-2 font-sans">
                      <FormattedChatMessage content={aiFixtureResult.aiCommentary} />
                    </div>
                  </div>

                  {/* Groups Breakdown Preview */}
                  {aiFixtureResult.groups && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.entries(aiFixtureResult.groups).map(([gName, gTeams]) => (
                        <div
                          key={gName}
                          className="p-4 rounded-2xl bg-[#070b14] border border-cyan-500/25 space-y-3 shadow-md"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <h5 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                              {gName} ({gTeams.length} Teams)
                            </h5>
                            <span className="text-xs text-slate-400 font-mono">
                              Round-Robin Pool
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {gTeams.map((t, idx) => (
                              <div
                                key={t.id || idx}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-xs"
                              >
                                <div className="flex items-center space-x-2.5">
                                  <span className="text-lg">{t.logo || '🏏'}</span>
                                  <div>
                                    <span className="font-extrabold text-white text-xs block font-sans">{t.name}</span>
                                    <span className="text-[10px] text-slate-400 font-sans">
                                      Captain: <strong className="text-amber-300">{t.owner || 'Unassigned'}</strong>
                                    </span>
                                  </div>
                                </div>

                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border"
                                  style={{
                                    backgroundColor: `${t.color || '#00f2fe'}15`,
                                    borderColor: `${t.color || '#00f2fe'}40`,
                                    color: t.color || '#00f2fe'
                                  }}
                                >
                                  {t.shortName || 'NEPL'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Generated Fixtures Schedule Preview & Apply Bar */}
                  <div className="p-4 rounded-2xl bg-[#070b14] border border-cyan-500/30 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
                      <div>
                        <h5 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-cyan-400" />
                          Generated Match Schedule ({aiFixtureResult.matches?.length || 0} Fixtures)
                        </h5>
                        <p className="text-xs text-slate-400">
                          Review fixtures below and click "Apply to Live Tournament" to publish.
                        </p>
                      </div>

                      {canManage && (
                        <button
                          type="button"
                          onClick={handleApplyAiFixtures}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm tracking-tight transition flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.45)] cursor-pointer shrink-0"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Apply AI Fixtures to Live Tournament</span>
                        </button>
                      )}
                    </div>

                    {aiAppliedSuccess && (
                      <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs sm:text-sm text-center font-bold animate-fade-in">
                        ✅ Success! Official AI tournament fixtures have been published to the live Match Center!
                      </div>
                    )}

                    {/* Fixture preview pills list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                      {aiFixtureResult.matches?.map((m) => (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span className="text-cyan-300 font-bold">{m.round}</span>
                            <span>{m.time} · {m.date}</span>
                          </div>

                          <div className="flex items-center justify-between font-sans">
                            <span className="font-extrabold text-white text-xs truncate max-w-[45%]">
                              {m.team1Name}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-amber-400 px-1 bg-amber-500/10 rounded">
                              VS
                            </span>
                            <span className="font-extrabold text-white text-xs truncate max-w-[45%] text-right">
                              {m.team2Name}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* Match Cards Grid */}
        {filteredMatches.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 gap-5">
            {filteredMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                canManage={canManage}
                onOpenScoring={(m) => setScoringMatch(m)}
                onEditMatch={openEditMatchModal}
                onDeleteMatch={handleDeleteMatch}
                onResetScore={handleResetScore}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-warm-950/40 border border-dashed border-warm-800 space-y-4">
            <CalendarDays className="w-10 h-10 text-sand-600 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sand-200 font-bold text-sm">No matches found for current filter</h4>
              <p className="text-sand-500 text-xs">
                {matches.length === 0
                  ? "Click 'Auto Round-Robin' above to generate the full tournament schedule based on registered teams."
                  : "Try clearing search filters or changing the status tab."}
              </p>
            </div>
            {matches.length === 0 && canManage && (
              <button
                onClick={() => setShowAutoSchedulerModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cricket-emerald hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase cursor-pointer"
              >
                <Shuffle className="w-4 h-4" />
                Generate Match Fixtures Now
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Auto Round-Robin Schedule Generator & Time Slot Planner ── */}
      {showAutoSchedulerModal && canManage && createPortal(
        <div className="fixed inset-0 z-[100] bg-warm-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="warm-card w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-warm-700/60 space-y-6 relative max-h-[90vh] overflow-y-auto shadow-2xl my-auto">
            
            <div className="flex items-center justify-between border-b border-warm-700/50 pb-4">
              <h3 className="text-xl font-black text-sand-100 flex items-center gap-2 font-serif">
                <Shuffle className="w-5 h-5 text-cricket-emerald" />
                Auto-Generate Round Robin Schedule
              </h3>
              <button
                onClick={() => setShowAutoSchedulerModal(false)}
                className="p-1.5 rounded-lg text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-sand-300">
              <div className="bg-emerald-950/20 p-4 rounded-2xl border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300">Participating Teams in MongoDB:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                    {teams.length} Teams
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {teams.map(t => (
                    <span key={t.id} className="px-2 py-1 rounded-lg bg-warm-900 border border-warm-700 text-white text-[11px] flex items-center gap-1 font-bold">
                      <span>{t.logo}</span>
                      <span>{t.name}</span>
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-sand-400 pt-1">
                  Total matches generated: <strong>{(teams.length * (teams.length - 1)) / 2} Round Robin Fixtures</strong>.
                </p>
              </div>

              {/* Date & Time Configurations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Tournament Start Date</label>
                  <input
                    type="date"
                    value={schedulerConfig.startDate}
                    onChange={e => setSchedulerConfig({ ...schedulerConfig, startDate: e.target.value })}
                    className="warm-input font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">First Match Start Time</label>
                  <input
                    type="time"
                    value={schedulerConfig.startTime}
                    onChange={e => setSchedulerConfig({ ...schedulerConfig, startTime: e.target.value })}
                    className="warm-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Match Slot Duration (mins)</label>
                  <input
                    type="number"
                    min={30}
                    step={15}
                    value={schedulerConfig.matchIntervalMinutes}
                    onChange={e => setSchedulerConfig({ ...schedulerConfig, matchIntervalMinutes: Number(e.target.value) })}
                    className="warm-input font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Matches Per Day</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={schedulerConfig.matchesPerDay}
                    onChange={e => setSchedulerConfig({ ...schedulerConfig, matchesPerDay: Number(e.target.value) })}
                    className="warm-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-sand-400 block mb-1.5">Tournament Venue</label>
                <input
                  type="text"
                  value={schedulerConfig.venue}
                  onChange={e => setSchedulerConfig({ ...schedulerConfig, venue: e.target.value })}
                  className="warm-input"
                  placeholder="e.g. NEPL Box Cricket Turf"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-warm-700/50">
                <button
                  type="button"
                  onClick={() => setShowAutoSchedulerModal(false)}
                  className="btn-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateRoundRobin}
                  className="btn-primary flex items-center gap-2 cursor-pointer"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Generate Schedule Now</span>
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ── Modal: Add / Edit Custom Match ── */}
      {showAddModal && canManage && createPortal(
        <div className="fixed inset-0 z-[100] bg-warm-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="warm-card w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-warm-700/60 space-y-6 relative max-h-[90vh] overflow-y-auto shadow-2xl my-auto">
            
            <div className="flex items-center justify-between border-b border-warm-700/50 pb-4">
              <h3 className="text-xl font-black text-sand-100 flex items-center gap-2 font-serif">
                <Calendar className="w-5 h-5 text-terracotta-400" />
                {editingMatch ? `Edit ${editingMatch.round}` : 'Add Match Fixture'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMatchForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Match / Round Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. League Match 1 / Semifinal"
                    value={matchForm.round}
                    onChange={e => setMatchForm({ ...matchForm, round: e.target.value })}
                    className="warm-input font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Stage</label>
                  <select
                    value={matchForm.stage}
                    onChange={e => setMatchForm({ ...matchForm, stage: e.target.value })}
                    className="warm-input cursor-pointer"
                  >
                    <option value="league">Round Robin League</option>
                    <option value="semifinal">Semifinal Playoff</option>
                    <option value="final">Grand Finals 🏆</option>
                    <option value="custom">Custom / Exhibition</option>
                  </select>
                </div>
              </div>

              {/* Team 1 vs Team 2 Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-warm-950/70 p-4 rounded-2xl border border-warm-800">
                <div>
                  <label className="text-xs font-bold text-amber-300 block mb-1.5 flex items-center gap-1">
                    <span>🏏 Team 1</span>
                  </label>
                  <select
                    required
                    value={matchForm.team1Id}
                    onChange={e => setMatchForm({ ...matchForm, team1Id: e.target.value })}
                    className="warm-input cursor-pointer"
                  >
                    <option value="">-- Select Team 1 --</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.logo} {t.name} ({t.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-cyan-300 block mb-1.5 flex items-center gap-1">
                    <span>🏏 Team 2</span>
                  </label>
                  <select
                    required
                    value={matchForm.team2Id}
                    onChange={e => setMatchForm({ ...matchForm, team2Id: e.target.value })}
                    className="warm-input cursor-pointer"
                  >
                    <option value="">-- Select Team 2 --</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.logo} {t.name} ({t.shortName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Match Date</label>
                  <input
                    type="date"
                    required
                    value={matchForm.date}
                    onChange={e => setMatchForm({ ...matchForm, date: e.target.value })}
                    className="warm-input font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Match Time</label>
                  <input
                    type="time"
                    required
                    value={matchForm.time}
                    onChange={e => setMatchForm({ ...matchForm, time: e.target.value })}
                    className="warm-input font-mono"
                  />
                </div>
              </div>

              {/* Slot & Venue */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Time Slot Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Saturday Morning / Rain Cover"
                    value={matchForm.slot}
                    onChange={e => setMatchForm({ ...matchForm, slot: e.target.value })}
                    className="warm-input"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Max Overs Limit</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={matchForm.maxOvers}
                    onChange={e => setMatchForm({ ...matchForm, maxOvers: e.target.value })}
                    className="warm-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-sand-400 block mb-1.5">Venue</label>
                <input
                  type="text"
                  value={matchForm.venue}
                  onChange={e => setMatchForm({ ...matchForm, venue: e.target.value })}
                  className="warm-input"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-warm-700/50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary cursor-pointer"
                >
                  {editingMatch ? 'Save Changes' : 'Create Fixture'}
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body
      )}

      {/* ── Modal: Live Match Scorekeeper & Result Entry ── */}
      {scoringMatch && canManage && (
        <ScorekeeperModal
          match={scoringMatch}
          onClose={() => setScoringMatch(null)}
          onSave={handleSaveScore}
        />
      )}

    </div>
  );
}

// ── Individual Match Card Component ──────────────────────────────────────────
function MatchCard({ match, canManage, onOpenScoring, onEditMatch, onDeleteMatch, onResetScore }) {
  const isCompleted = match.status === 'Completed';
  const isLive = match.status === 'Live';

  return (
    <div className="glass-panel p-5 rounded-2xl border border-warm-700/50 space-y-4 relative overflow-hidden flex flex-col justify-between group hover:border-warm-600 transition duration-200">
      
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between text-xs border-b border-warm-800/60 pb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md border font-bold font-mono text-[11px] ${
              match.stage === 'final' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
              match.stage === 'semifinal' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
              'bg-warm-900 border-warm-700 text-sand-200'
            }`}>
              {match.round}
            </span>
            <span className="text-[10px] text-sand-500 font-mono flex items-center gap-1">
              <Calendar className="w-3 h-3 text-sand-500" />
              {match.date || 'TBD'} · {match.time || 'TBD'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono tracking-wider ${
              isCompleted ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
              isLive ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' :
              'bg-warm-900 text-sand-400 border border-warm-700'
            }`}>
              {isLive && '🔴 '}{match.status}
            </span>

            {canManage && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEditMatch(match)}
                  className="p-1 rounded text-sand-500 hover:text-sand-200 hover:bg-warm-800 transition cursor-pointer"
                  title="Edit Match Details, Date & Time"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteMatch(match)}
                  className="p-1 rounded text-sand-500 hover:text-rose-400 hover:bg-warm-800 transition cursor-pointer"
                  title="Delete Match"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Slot / Venue info */}
        <div className="flex items-center justify-between text-[10px] text-sand-500 mt-2 font-mono">
          <span className="flex items-center gap-1 text-cyan-400/80">
            <Clock className="w-3 h-3" />
            {match.slot || 'Standard Slot'}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-sand-600" />
            {match.venue || 'NEPL Box Cricket Ground'}
          </span>
        </div>

        {/* Teams & Scores Scoreboard */}
        <div className="mt-3.5 space-y-2 text-xs">
          
          {/* Team 1 Row */}
          <div className={`flex items-center justify-between p-3 rounded-xl border transition ${
            match.winner === match.team1Name
              ? 'bg-emerald-950/25 border-emerald-500/40 shadow-sm'
              : 'bg-warm-950/80 border-warm-800'
          }`}>
            <div className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: match.team1Color || '#d4622a' }}
              />
              <span className="text-base">{match.team1Logo || '🏏'}</span>
              <span className="font-bold text-white text-sm">{match.team1Name}</span>
            </div>

            <div className="text-right font-mono">
              {isCompleted || isLive ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-black text-sand-100">{match.score1}</span>
                  <span className="text-sand-500 text-xs">/ {match.wickets1 || 0}</span>
                  <span className="text-[11px] text-cyan-400 ml-1">({match.overs1} ov)</span>
                </div>
              ) : (
                <span className="text-sand-600 text-xs font-mono">Yet to Bat</span>
              )}
            </div>
          </div>

          {/* Team 2 Row */}
          <div className={`flex items-center justify-between p-3 rounded-xl border transition ${
            match.winner === match.team2Name
              ? 'bg-emerald-950/25 border-emerald-500/40 shadow-sm'
              : 'bg-warm-950/80 border-warm-800'
          }`}>
            <div className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: match.team2Color || '#3b82f6' }}
              />
              <span className="text-base">{match.team2Logo || '🏏'}</span>
              <span className="font-bold text-white text-sm">{match.team2Name}</span>
            </div>

            <div className="text-right font-mono">
              {isCompleted || isLive ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-black text-sand-100">{match.score2}</span>
                  <span className="text-sand-500 text-xs">/ {match.wickets2 || 0}</span>
                  <span className="text-[11px] text-cyan-400 ml-1">({match.overs2} ov)</span>
                </div>
              ) : (
                <span className="text-sand-600 text-xs font-mono">Yet to Bat</span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Outcome / Result Footer */}
      <div className="pt-3 border-t border-warm-800/60 flex items-center justify-between">
        {match.winner ? (
          <div className="flex items-center gap-1.5 text-xs text-cricket-emerald font-bold font-mono">
            <CheckCircle2 className="w-4 h-4 text-cricket-emerald" />
            <span>{match.winner} {match.winMargin ? `(${match.winMargin})` : 'WON'}</span>
          </div>
        ) : (
          <span className="text-[11px] text-sand-500 font-mono">
            Max {match.maxOvers || 8} Overs · 7 Wickets Out
          </span>
        )}

        {canManage && (
          <div className="flex items-center gap-2">
            {isCompleted && (
              <button
                onClick={() => onResetScore(match.id)}
                className="p-1.5 rounded-lg text-sand-500 hover:text-amber-400 hover:bg-warm-800 transition cursor-pointer"
                title="Reset Score back to Scheduled"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onOpenScoring(match)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] uppercase tracking-wider transition cursor-pointer shadow-md shadow-cyan-900/20"
            >
              <Edit3 className="w-3 h-3" />
              <span>{isCompleted ? 'Edit Score' : 'Score Match'}</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Scorekeeper Modal Dialog ──────────────────────────────────────────────────
function ScorekeeperModal({ match, onClose, onSave }) {
  const [s1, setS1] = useState(match.score1 || 0);
  const [ov1, setOv1] = useState(match.overs1 || 0);
  const [w1, setW1] = useState(match.wickets1 || 0);

  const [s2, setS2] = useState(match.score2 || 0);
  const [ov2, setOv2] = useState(match.overs2 || 0);
  const [w2, setW2] = useState(match.wickets2 || 0);

  const [status, setStatus] = useState(match.status === 'Scheduled' ? 'Completed' : match.status);
  const [tossWinner, setTossWinner] = useState(match.tossWinner || match.team1Name);
  const [tossDecision, setTossDecision] = useState(match.tossDecision || 'Bat');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(match.id, s1, ov1, w1, s2, ov2, w2, status, tossWinner, tossDecision);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-warm-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="warm-card w-full max-w-xl p-6 sm:p-8 rounded-3xl border border-warm-700/60 space-y-6 relative max-h-[90vh] overflow-y-auto shadow-2xl my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-warm-700/50 pb-4">
          <div>
            <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider font-bold block">
              {match.round} · Match Center Scorekeeper
            </span>
            <h3 className="text-xl font-black text-sand-100 flex items-center gap-2 font-serif mt-0.5">
              <span>{match.team1Logo} {match.team1Name}</span>
              <span className="text-sand-500 font-mono text-sm">vs</span>
              <span>{match.team2Logo} {match.team2Name}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Toss Info */}
          <div className="p-4 bg-warm-950/70 rounded-2xl border border-warm-800 space-y-2">
            <label className="text-xs font-bold text-sand-300 block">Toss Decision</label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={tossWinner}
                onChange={e => setTossWinner(e.target.value)}
                className="warm-input cursor-pointer text-xs"
              >
                <option value={match.team1Name}>{match.team1Name} won toss</option>
                <option value={match.team2Name}>{match.team2Name} won toss</option>
              </select>

              <select
                value={tossDecision}
                onChange={e => setTossDecision(e.target.value)}
                className="warm-input cursor-pointer text-xs"
              >
                <option value="Bat">Elected to Bat</option>
                <option value="Bowl">Elected to Bowl</option>
              </select>
            </div>
          </div>

          {/* Innings 1: Team 1 */}
          <div className="p-4 rounded-2xl bg-warm-900/80 border border-warm-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{match.team1Logo || '🏏'}</span>
                <span className="font-bold text-white text-sm">{match.team1Name} (1st Innings)</span>
              </div>
              <span className="text-[10px] text-sand-500 font-mono">Max {match.maxOvers || 8} ov · 7 wk</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-sand-400 block mb-1">Runs Scored</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={s1}
                  onChange={e => setS1(e.target.value)}
                  className="warm-input font-mono text-center font-bold text-base"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-sand-400 block mb-1">Overs Faced</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min={0}
                  max={match.maxOvers || 8}
                  value={ov1}
                  onChange={e => setOv1(e.target.value)}
                  className="warm-input font-mono text-center font-bold text-base"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-sand-400 block mb-1">Wickets Lost</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={7}
                  value={w1}
                  onChange={e => setW1(e.target.value)}
                  className="warm-input font-mono text-center font-bold text-base text-rose-400"
                />
              </div>
            </div>
          </div>

          {/* Innings 2: Team 2 */}
          <div className="p-4 rounded-2xl bg-warm-900/80 border border-warm-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{match.team2Logo || '🏏'}</span>
                <span className="font-bold text-white text-sm">{match.team2Name} (2nd Innings)</span>
              </div>
              <span className="text-[10px] text-sand-500 font-mono">Target: {Number(s1) + 1} Runs</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-sand-400 block mb-1">Runs Scored</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={s2}
                  onChange={e => setS2(e.target.value)}
                  className="warm-input font-mono text-center font-bold text-base"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-sand-400 block mb-1">Overs Faced</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min={0}
                  max={match.maxOvers || 8}
                  value={ov2}
                  onChange={e => setOv2(e.target.value)}
                  className="warm-input font-mono text-center font-bold text-base"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-sand-400 block mb-1">Wickets Lost</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={7}
                  value={w2}
                  onChange={e => setW2(e.target.value)}
                  className="warm-input font-mono text-center font-bold text-base text-rose-400"
                />
              </div>
            </div>
          </div>

          {/* Match Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-sand-400 block mb-1.5">Match Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="warm-input cursor-pointer font-bold"
              >
                <option value="Completed">Completed (Final Result)</option>
                <option value="Live">Live In-Progress 🔴</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Rain / Abandoned">Rain / Abandoned (Rule 10)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <div className="p-3 bg-warm-950 rounded-xl border border-warm-800 text-xs font-mono text-center">
                {Number(s1) > Number(s2) ? (
                  <span className="text-emerald-400 font-bold">
                    Projected: {match.team1Name} WON by {Number(s1) - Number(s2)} runs
                  </span>
                ) : Number(s2) > Number(s1) ? (
                  <span className="text-emerald-400 font-bold">
                    Projected: {match.team2Name} WON by {7 - Number(w2)} wickets
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold">Projected: Match Tied / Equal</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t border-warm-700/50">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-emerald-900/30 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Record Result & Update Standings</span>
            </button>
          </div>

        </form>

      </div>
    </div>,
    document.body
  );
}
