/**
 * Gemini AI & Heuristic Team Generation Service for NEPL / NEFL 2026
 * Supports Google Gemini API (gemini-1.5-flash / gemini-2.0-flash) with local fallback.
 */

import { NEFL_2026_RAW_RULES_TEXT, NEFL_FORMAT_DETAILS } from '../data/neflRulesData.js';
import { TEAM_COLOR_THEMES, getThemeByIndex } from '../data/teamThemes.js';

const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Compute Player Performance Rating (0 to 100)
 */
export function calculatePlayerRating(player) {
  if (!player) return { overall: 50, batting: 50, bowling: 50 };

  const runs = Number(player.runs) || 0;
  const avg = Number(player.avg) || 0;
  const sr = Number(player.strikeRate) || 100;
  const wickets = Number(player.wickets) || 0;
  const eco = Number(player.economy) || 8.0;
  const matches = Math.max(1, Number(player.matches) || 5);

  // Batting score formula (weighted avg, strike rate, runs per match)
  const runsPerMatch = runs / matches;
  const battingRaw = (avg * 1.2) + ((sr - 80) * 0.3) + (runsPerMatch * 1.5);
  const batting = Math.min(99, Math.max(30, Math.round(battingRaw + 40)));

  // Bowling score formula (wickets per match, economy)
  const wktsPerMatch = wickets / matches;
  const ecoScore = Math.max(0, (12 - eco) * 6);
  const bowlingRaw = (wktsPerMatch * 25) + ecoScore;
  const bowling = Math.min(99, Math.max(30, Math.round(bowlingRaw + 35)));

  // Role weighting
  const role = (player.role || '').toLowerCase();
  let overall = 50;
  if (role.includes('bat') && !role.includes('all')) {
    overall = Math.round(batting * 0.7 + bowling * 0.3);
  } else if (role.includes('bowl') && !role.includes('all')) {
    overall = Math.round(bowling * 0.7 + batting * 0.3);
  } else if (role.includes('all-rounder') || role.includes('all rounder')) {
    overall = Math.round(batting * 0.5 + bowling * 0.5);
  } else if (role.includes('keeper') || role.includes('wk')) {
    overall = Math.round(batting * 0.65 + 40 * 0.35);
  } else {
    overall = Math.round((batting + bowling) / 2);
  }

  // Adjust slightly for category expectations
  const cat = (player.category || '').toLowerCase();
  if (cat.includes('super')) {
    overall = Math.min(99, overall + 2);
  }

  return {
    overall: Math.min(99, Math.max(35, overall)),
    batting,
    bowling
  };
}

/**
 * NEFL Performance-Based Team Balancer Algorithm
 * Balances teams respecting NEFL composition:
 * - 1 Super Master
 * - 1 Master
 * - 3 Female Players
 * - 7 Male / General Players
 */
export function generateBalancedNEFLTeams(playersList, teamCount = 4, customTeamNames = [], onlyActivePlayers = true, targetSquadSize = 10) {
  if (!Array.isArray(playersList) || playersList.length === 0) {
    return { error: 'No players available in the pool to generate teams.' };
  }

  // Filter for players listed to play in NEPL tournament
  const eligiblePlayers = onlyActivePlayers 
    ? playersList.filter(p => p.isPlayingNEPL !== false) 
    : playersList;

  if (eligiblePlayers.length === 0) {
    return { error: 'No players are currently flagged as "Playing NEPL". Please mark players as playing in the Players Pool.' };
  }

  const defaultNames = [
    'Cyber Strikers', 'Era Titans', 'Nyati Knights', 'Matrix Royals',
    'Quantum Kings', 'Apex Warriors', 'Thunder Bolts', 'Hyper Vipers',
    'Neon Challengers', 'Vortex Gladiators'
  ];

  const numTeams = Math.max(2, Math.min(24, teamCount));
  const maxSquad = Math.max(4, Math.min(30, Number(targetSquadSize) || 10));

  // Augment players with calculated ratings
  const augmented = eligiblePlayers.map(p => {
    const ratings = calculatePlayerRating(p);
    const cat = (p.category || '').toLowerCase();
    let normalizedCategory = 'male';
    if (cat.includes('super master') || cat.includes('super_master') || cat.includes('supermaster')) {
      normalizedCategory = 'super_master';
    } else if (cat.includes('master')) {
      normalizedCategory = 'master';
    } else if (cat.includes('female') || cat.includes('women') || (p.gender && p.gender.toLowerCase() === 'female')) {
      normalizedCategory = 'female';
    } else {
      normalizedCategory = 'male';
    }

    return {
      ...p,
      ratings,
      normalizedCategory,
      isCaptain: false,
      captainOfTeamId: null
    };
  });

  // Separate by categories
  const superMasters = augmented.filter(p => p.normalizedCategory === 'super_master').sort((a, b) => b.ratings.overall - a.ratings.overall);
  const masters = augmented.filter(p => p.normalizedCategory === 'master').sort((a, b) => b.ratings.overall - a.ratings.overall);
  const females = augmented.filter(p => p.normalizedCategory === 'female').sort((a, b) => b.ratings.overall - a.ratings.overall);
  const males = augmented.filter(p => p.normalizedCategory === 'male').sort((a, b) => b.ratings.overall - a.ratings.overall);

  // Initialize teams with unique color identities and franchise themes
  const teams = Array.from({ length: numTeams }, (_, i) => {
    const theme = getThemeByIndex(i);
    return {
      id: `nefl-gen-team-${i + 1}`,
      name: customTeamNames[i] || theme.name,
      shortName: (customTeamNames[i] ? customTeamNames[i].substring(0, 3) : theme.shortName).toUpperCase(),
      logo: theme.logo || '🏏',
      color: theme.color || '#3b82f6',
      maxSquadSize: maxSquad,
      players: [],
      captain: null,
      viceCaptain: null,
      captainId: null,
      captainName: null,
      totalRating: 0,
      avgRating: 0,
      battingPower: 0,
      bowlingPower: 0,
      purse: 10000,
      spent: 0,
      categoryCounts: {
        super_master: 0,
        master: 0,
        female: 0,
        male: 0
      }
    };
  });

  // Snake draft distribution function
  const distributeCategory = (pool, quotaPerTeam) => {
    const poolCopy = [...pool];
    for (let round = 0; round < quotaPerTeam; round++) {
      // Sort teams by current total rating to balance dynamically
      const sortedTeamIndices = teams
        .map((t, idx) => ({ idx, rating: t.totalRating }))
        .sort((a, b) => a.rating - b.rating)
        .map(t => t.idx);

      for (const tIdx of sortedTeamIndices) {
        if (poolCopy.length > 0 && teams[tIdx].players.length < maxSquad) {
          const picked = poolCopy.shift();
          teams[tIdx].players.push(picked);
          teams[tIdx].categoryCounts[picked.normalizedCategory] = (teams[tIdx].categoryCounts[picked.normalizedCategory] || 0) + 1;
          teams[tIdx].totalRating += picked.ratings.overall;
        }
      }
    }
    return poolCopy; // unallocated leftovers if any
  };

  // Dynamic distribution quotas based on target squad size
  const superPerTeam = Math.min(Math.floor(superMasters.length / numTeams), 1);
  const masterPerTeam = Math.min(Math.floor(masters.length / numTeams), 1);
  const femalePerTeam = Math.min(Math.floor(females.length / numTeams), Math.max(1, Math.round(maxSquad * 0.25)));
  const malePerTeam = Math.max(1, maxSquad - superPerTeam - masterPerTeam - femalePerTeam);

  // 1. Distribute Super Masters
  const leftSuper = distributeCategory(superMasters, superPerTeam > 0 ? superPerTeam : 1);
  // 2. Distribute Masters
  const leftMasters = distributeCategory(masters, masterPerTeam > 0 ? masterPerTeam : 1);
  // 3. Distribute Females
  const leftFemales = distributeCategory(females, femalePerTeam);
  // 4. Distribute Males
  const leftMales = distributeCategory(males, malePerTeam);

  // Remaining players if squad not complete up to maxSquad
  const allLeftovers = [...leftSuper, ...leftMasters, ...leftFemales, ...leftMales];
  while (allLeftovers.length > 0) {
    const leastSquadTeam = teams
      .filter(t => t.players.length < maxSquad)
      .sort((a, b) => a.players.length - b.players.length || a.totalRating - b.totalRating)[0];
    
    if (!leastSquadTeam) break;
    const player = allLeftovers.shift();
    leastSquadTeam.players.push(player);
    leastSquadTeam.categoryCounts[player.normalizedCategory] = (leastSquadTeam.categoryCounts[player.normalizedCategory] || 0) + 1;
    leastSquadTeam.totalRating += player.ratings.overall;
  }

  // Calculate final team analytics & designate captains
  teams.forEach(team => {
    const count = team.players.length || 1;
    team.avgRating = Math.round(team.totalRating / count);
    team.battingPower = Math.round(team.players.reduce((sum, p) => sum + (p.ratings?.batting || 50), 0) / count);
    team.bowlingPower = Math.round(team.players.reduce((sum, p) => sum + (p.ratings?.bowling || 50), 0) / count);

    // Reset all players in squad to isCaptain: false
    team.players.forEach(p => {
      p.isCaptain = false;
      p.captainOfTeamId = null;
    });

    // Pick Captain (highest rating player) & Vice Captain (2nd highest)
    const sortedBySkill = [...team.players].sort((a, b) => b.ratings.overall - a.ratings.overall);
    if (sortedBySkill.length > 0) {
      const topPlayer = sortedBySkill[0];
      topPlayer.isCaptain = true;
      topPlayer.captainOfTeamId = team.id;
      team.captain = topPlayer;
      team.captainId = topPlayer.id;
      team.captainName = topPlayer.name;
    }
    if (sortedBySkill.length > 1) {
      team.viceCaptain = sortedBySkill[1];
    }
  });

  return {
    teams,
    totalPlayersAssigned: teams.reduce((acc, t) => acc + t.players.length, 0),
    unassignedPlayers: allLeftovers,
    squadSizePerTeam: maxSquad,
    formula: `NEFL ${new Date().getFullYear()} Season: ${maxSquad} Players/Squad balanced by composite skill ratings and category quotas`
  };
}

/**
 * Query Gemini AI Model for Rules Explanation / Custom Ingestion / Strategy
 */
export async function queryGeminiChat({
  prompt,
  conversationHistory = [],
  customRules = '',
  apiKey = '',
  players = [],
  teams = []
}) {
  const effectiveKey = apiKey || (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : '') || '';
  const currentYear = new Date().getFullYear();

  const systemContext = `
You are the Official "AI Tournament Strategist & Rules Arbitrator" for the box cricket tournament ${currentYear}.
You are fully knowledgeable about all tournament formats, especially the official **Box Cricket Season Rules & Format**.

=== OFFICIAL NEPL ${currentYear} RULES KNOWLEDGE BASE ===
${NEFL_2026_RAW_RULES_TEXT}

=== ACTIVE TOURNAMENT STATE ===
- Total Registered Players in Pool: ${players.length}
- Total Teams Formed: ${teams.length}
${customRules ? `=== CUSTOM USER-PROVIDED RULES ===\n${customRules}\n` : ''}

=== YOUR CAPABILITIES ===
1. Accurately explain all NEPL (Nyati Era Premiere League) rules:
   - 12 Overs Match Breakdown (5 Privilege: 1 Super Master, 1 Master, 3 Females + 7 General: 7 Males).
   - Female Circular Strike Rotation (F1 -> F2 -> F3 -> F1).
   - Fence Boundary Scoring (+1 run zone, +2 runs zone, catch touching fence is NOT OUT + bonus + running, 4/6 straight net).
   - Fielding Rules (Max 2 behind crease, max 2 before crease, keeper mandatory, max 6 fielders on ground).
   - Deficiency Rules (Super Master: 6 runs/over, Master: 7 runs/over, Female: 6 runs/over to opposition; dual deficiency logic).
   - Knockouts & Male Super Over on ties.
2. Formulate and explain balanced team rosters based on player performance ratings and category quotas.
3. Resolve ambiguous match scenarios with clarity, fair arbitration, and rule citations.
4. Keep responses crisp, engaging, structured with markdown tables and bullet points.
`;

  // If Gemini API Key is available, make the live LLM call
  if (effectiveKey && effectiveKey.trim().length > 10) {
    try {
      const contents = [];
      // Include system context
      contents.push({
        role: 'user',
        parts: [{ text: systemContext + `\n\nUser Question: ${prompt}` }]
      });

      // Add recent history if provided
      for (const msg of conversationHistory.slice(-4)) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      }

      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${effectiveKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1500,
            topP: 0.9,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API Error (${response.status})`);
      }

      const data = await response.json();
      const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textOutput) {
        return {
          text: textOutput,
          source: 'Gemini 1.5 Flash (Live AI)',
          isLiveAI: true
        };
      }
    } catch (err) {
      console.warn('[Gemini Service] Live API call failed, falling back to local engine:', err);
    }
  }

  // Smart Offline Fallback Engine
  return generateLocalAIResponse(prompt, customRules, players, teams);
}

/**
 * Offline Intelligent Rules & Strategy Engine (Rule-based NLP Fallback)
 */
function generateLocalAIResponse(prompt, customRules, players = [], teams = []) {
  const p = prompt.toLowerCase();

  if (p.includes('deficiency') || p.includes('shortage') || p.includes('penalty') || p.includes('absent')) {
    return {
      text: `### 📋 NEPL 2026 Deficiency Rule & Bonus Matrix

When a team has fewer players in the **Privilege Category** than allotted:
* **Super Master Shortage:** **6 bonus runs per over** awarded to the opponent.
* **Master Shortage:** **7 bonus runs per over** awarded to the opponent.
* **Female Shortage:** **6 bonus runs per over** awarded to the opponent.

#### 🔄 Dual Deficiency Scenarios (Both Teams Short)
* If **neither team has female players (0 vs 0)**, both sides receive **18 bonus runs (3 overs × 6 runs)**, and the remaining 9 overs are played normally.
* If Team A has 0 females and Team B has 1 female, Team B gets **18 bonus runs** or chooses to play the 3 overs!

> ⚠️ **Minimum Squad Requirement:** A team must have at least **2 privilege** and **3 general category** players present; otherwise the match is forfeited!`,
      source: 'NEPL Rules Engine (Built-in Knowledge Base)',
      isLiveAI: false
    };
  }

  if (p.includes('strike') || p.includes('circular') || p.includes('female rotation') || p.includes('rotation')) {
    return {
      text: `### 🔄 Female Category Circular Strike Rotation Rule

During the 3 Female Privilege Overs:
1. **Opening Pair:** Female 1 (F1) and Female 2 (F2) start the innings.
2. **Circular Rotation on Dismissal:** Order is strictly **F1 ➔ F2 ➔ F3 ➔ F1...**
3. **On Wicket:**
   - The dismissed batter leaves the ground immediately.
   - The surviving batter takes the striker's end.
   - The next batter in the rotation (e.g. F3) joins at the **non-striker's end**.
4. **Re-entry:** When a previously dismissed batter returns later in the circular queue, she always enters at the **non-striker's end**!`,
      source: 'NEPL Rules Engine (Built-in Knowledge Base)',
      isLiveAI: false
    };
  }

  if (p.includes('fence') || p.includes('bonus run') || p.includes('boundary') || p.includes('net')) {
    return {
      text: `### 🏏 NEPL 2026 Fence & Boundary Scoring Rules

* **+1 Bonus Run:** Direct hit from the Net starting point up to the Pole parallel to the bowling crease.
* **+2 Bonus Runs:** Direct hit from the Bowling crease Pole to the Boundary lines.
* **Running Runs Added:** Any physical runs completed while hitting the side fence are **added to the bonus** (e.g. 1 bonus + 2 running = 3 runs total).
* **Fence Contact Catch:** If a fielder touches the bonus net area while catching, the batter is **NOT OUT**, and the bonus + running runs are awarded!
* **Straight Net 4s & 6s:**
  - Indirect ground contact to straight net = **4 Runs**
  - Direct aerial hit to straight net = **6 Runs**`,
      source: 'NEPL Rules Engine (Built-in Knowledge Base)',
      isLiveAI: false
    };
  }

  if (p.includes('field') || p.includes('restriction') || p.includes('keeper') || p.includes('crease')) {
    return {
      text: `### 🛡️ NEPL 2026 Fielding Restrictions & Formations

* **Crease Division Constraint:** Maximum **2 fielders behind the bowling crease** and maximum **2 fielders before the bowling crease** (excluding bowler and wicketkeeper).
* **Wicketkeeper Mandatory:** Presence of a dedicated wicketkeeper is compulsory.
* **General Overs On-Field Cap:** Maximum **6 players allowed on the ground** during general overs (out of 7 squad players; bowling team rotates fielders on the go).
* **Privilege Overs Keeper Rule:** A male player may keep wickets during privilege category overs, but is **NOT permitted to field** in any other position.
* **Violation Penalty:** Any breach of fielding placement is declared a **NO BALL** (no free hit).`,
      source: 'NEPL Rules Engine (Built-in Knowledge Base)',
      isLiveAI: false
    };
  }

  if (p.includes('team') || p.includes('generate') || p.includes('balance') || p.includes('rating') || p.includes('roster')) {
    return {
      text: `### ⚡ NEPL Performance-Based Team Balancing System

The NEPL 2026 squad composition standardizes:
* **1 Super Master**
* **1 Master**
* **3 Female Players**
* **7 Male Players** (Total 12 Squad Members)

💡 *Tip: Click the **"Generate Balanced Teams"** button right below to automatically calculate composite performance ratings (runs, strike rate, wickets, economy) and balance the full player pool across teams!*`,
      source: 'Pavillion AI Bot',
      isLiveAI: false
    };
  }

  // General catch-all
  return {
    text: `### 🏏 AI Tournament Strategist Assistant Response

The **NEPL 2026 Summer Season Format** features a 12-overs match structure:
* **5 Privilege Overs:** 1 Super Master + 1 Master + 3 Female (Circular Strike)
* **7 General Overs:** 7 Male Players (Counterpart Matchups)

**Quick Topics You Can Ask Me:**
* *"Explain the deficiency bonus runs matrix"*
* *"How does the female circular strike rotation work?"*
* *"What are the fence boundary scoring rules?"*
* *"What are the 2-behind / 2-before fielding restrictions?"*
* *"Generate balanced NEPL teams from our registered players pool"*

*(Tip: Enter a Google Gemini API Key in Chat Settings for full autonomous live reasoning!)*`,
    source: 'NEPL Knowledge Base',
    isLiveAI: false
  };
}

/**
 * AI Group Match Scheduler & Fixtures Architect
 * Divides teams into balanced Groups (A & B), formats round-robin fixtures and knockout stages.
 */
export async function generateAIGroupFixtures({
  teams = [],
  prompt = '',
  groupCount = 2,
  maxOvers = 8,
  startDate = new Date().toISOString().split('T')[0],
  includeKnockouts = true,
  apiKey = ''
}) {
  if (!teams || teams.length < 2) {
    throw new Error('At least 2 teams are required to generate tournament group fixtures.');
  }

  const effectiveKey = apiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('nepl_gemini_api_key') : '') || (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : '') || '';

  // 1. Organize Teams into Groups (Group A & Group B)
  const sortedTeams = [...teams].sort((a, b) => {
    // Sort by squad rating or purse balance
    const aRating = (a.squad || []).reduce((acc, p) => acc + (p.ratings?.overall || 60), 0);
    const bRating = (b.squad || []).reduce((acc, p) => acc + (p.ratings?.overall || 60), 0);
    return bRating - aRating;
  });

  const groupNames = ['Group A', 'Group B', 'Group C', 'Group D'];
  const actualGroupCount = Math.min(groupCount || 2, teams.length);
  const groups = {};

  for (let i = 0; i < actualGroupCount; i++) {
    groups[groupNames[i]] = [];
  }

  // Snake draft distribution for fair group balancing
  sortedTeams.forEach((team, idx) => {
    const cycle = Math.floor(idx / actualGroupCount);
    const pos = idx % actualGroupCount;
    const targetGroupIndex = cycle % 2 === 0 ? pos : (actualGroupCount - 1 - pos);
    groups[groupNames[targetGroupIndex]].push({
      ...team,
      group: groupNames[targetGroupIndex]
    });
  });

  // 2. Generate Intra-Group Matches
  const DEFAULT_TIME_SLOTS = [
    '08:30 AM (Morning Slot 1)',
    '09:45 AM (Morning Slot 2)',
    '11:00 AM (Morning Slot 3)',
    '04:30 PM (Evening Slot 1)',
    '05:45 PM (Evening Slot 2)',
    '07:00 PM (Prime Lights Slot 3)',
    '08:15 PM (Dinner Party Derby)'
  ];

  const generatedMatches = [];
  let matchCounter = 1;
  let dayOffset = 0;
  let slotIndex = 0;

  const baseDate = new Date(startDate || Date.now());

  Object.entries(groups).forEach(([groupName, groupTeams]) => {
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        const t1 = groupTeams[i];
        const t2 = groupTeams[j];

        const matchDate = new Date(baseDate);
        matchDate.setDate(baseDate.getDate() + dayOffset);
        const dateStr = matchDate.toISOString().split('T')[0];

        const slot = DEFAULT_TIME_SLOTS[slotIndex % DEFAULT_TIME_SLOTS.length];
        const timeStr = slot.split(' ')[0];

        generatedMatches.push({
          id: `match-ai-${Date.now()}-${matchCounter}`,
          matchNumber: matchCounter,
          round: `${groupName} · Match ${matchCounter}`,
          group: groupName,
          stage: 'league',
          team1Id: t1.id,
          team1Name: t1.name,
          team1Logo: t1.logo || '🏏',
          team1Color: t1.color || '#00f2fe',
          team2Id: t2.id,
          team2Name: t2.name,
          team2Logo: t2.logo || '🏏',
          team2Color: t2.color || '#a855f7',
          date: dateStr,
          time: timeStr,
          slot: `${groupName} — ${slot}`,
          venue: 'NEPL Box Cricket Turf (Nyati Era)',
          maxOvers: maxOvers || 8,
          status: 'Scheduled',
          score1: 0,
          overs1: 0,
          wickets1: 0,
          score2: 0,
          overs2: 0,
          wickets2: 0,
          winner: null,
          resultText: null
        });

        matchCounter++;
        slotIndex++;
        if (slotIndex % 4 === 0) {
          dayOffset++;
        }
      }
    }
  });

  // 3. Add Knockout Matches (Semi Finals & Grand Finals) if requested
  if (includeKnockouts && actualGroupCount >= 2) {
    const finalsDate = new Date(baseDate);
    finalsDate.setDate(baseDate.getDate() + dayOffset + 1);
    const finalsDateStr = finalsDate.toISOString().split('T')[0];

    // Semi-Final 1: Winner Group A vs Runner-up Group B
    generatedMatches.push({
      id: `match-ai-${Date.now()}-${matchCounter}`,
      matchNumber: matchCounter,
      round: 'Semi-Final 1 🏆',
      group: 'Knockout',
      stage: 'semifinal',
      team1Id: groups['Group A']?.[0]?.id || '',
      team1Name: `${groups['Group A']?.[0]?.name || 'Winner Group A'} (A1)`,
      team1Logo: groups['Group A']?.[0]?.logo || '👑',
      team1Color: groups['Group A']?.[0]?.color || '#00f2fe',
      team2Id: groups['Group B']?.[1]?.id || groups['Group B']?.[0]?.id || '',
      team2Name: `${groups['Group B']?.[1]?.name || 'Runner-Up Group B'} (B2)`,
      team2Logo: groups['Group B']?.[1]?.logo || '🎯',
      team2Color: groups['Group B']?.[1]?.color || '#ec4899',
      date: finalsDateStr,
      time: '06:00 PM',
      slot: 'Sunday Evening — Semi-Final 1 (Prime Lights)',
      venue: 'NEPL Box Cricket Turf (Nyati Era)',
      maxOvers: maxOvers || 8,
      status: 'Scheduled',
      score1: 0,
      overs1: 0,
      wickets1: 0,
      score2: 0,
      overs2: 0,
      wickets2: 0,
      winner: null,
      resultText: null
    });
    matchCounter++;

    // Semi-Final 2: Winner Group B vs Runner-up Group A
    generatedMatches.push({
      id: `match-ai-${Date.now()}-${matchCounter}`,
      matchNumber: matchCounter,
      round: 'Semi-Final 2 🏆',
      group: 'Knockout',
      stage: 'semifinal',
      team1Id: groups['Group B']?.[0]?.id || '',
      team1Name: `${groups['Group B']?.[0]?.name || 'Winner Group B'} (B1)`,
      team1Logo: groups['Group B']?.[0]?.logo || '👑',
      team1Color: groups['Group B']?.[0]?.color || '#a855f7',
      team2Id: groups['Group A']?.[1]?.id || groups['Group A']?.[0]?.id || '',
      team2Name: `${groups['Group A']?.[1]?.name || 'Runner-Up Group A'} (A2)`,
      team2Logo: groups['Group A']?.[1]?.logo || '🎯',
      team2Color: groups['Group A']?.[1]?.color || '#00f2fe',
      date: finalsDateStr,
      time: '07:15 PM',
      slot: 'Sunday Evening — Semi-Final 2 (Prime Lights)',
      venue: 'NEPL Box Cricket Turf (Nyati Era)',
      maxOvers: maxOvers || 8,
      status: 'Scheduled',
      score1: 0,
      overs1: 0,
      wickets1: 0,
      score2: 0,
      overs2: 0,
      wickets2: 0,
      winner: null,
      resultText: null
    });
    matchCounter++;

    // Grand Finale
    generatedMatches.push({
      id: `match-ai-${Date.now()}-${matchCounter}`,
      matchNumber: matchCounter,
      round: `NEPL ${new Date().getFullYear()} Grand Championship Final 🏆👑`,
      group: 'Knockout',
      stage: 'final',
      team1Id: '',
      team1Name: 'Winner SF1',
      team1Logo: '🏆',
      team1Color: '#f59e0b',
      team2Id: '',
      team2Name: 'Winner SF2',
      team2Logo: '🏆',
      team2Color: '#10b981',
      date: finalsDateStr,
      time: '08:45 PM',
      slot: 'Sunday Night — Grand Championship Final & Dinner Party',
      venue: 'NEPL Box Cricket Turf (Nyati Era)',
      maxOvers: maxOvers || 8,
      status: 'Scheduled',
      score1: 0,
      overs1: 0,
      wickets1: 0,
      score2: 0,
      overs2: 0,
      wickets2: 0,
      winner: null,
      resultText: null
    });
  }

  // 4. If live Gemini API Key is provided, ask Gemini for an analytical commentary & strategy briefing
  let aiCommentary = `### 🤖 Gemini AI Match Architect Analysis & Tournament Structure

* **Format:** **${actualGroupCount} Groups (${Object.keys(groups).join(' & ')})** with Round-Robin Group Stage + Knockouts.
* **Total Matches Formed:** **${generatedMatches.length} Matches** (${generatedMatches.filter(m => m.stage === 'league').length} League + ${generatedMatches.filter(m => m.stage !== 'league').length} Knockout/Finals).
* **Overs Standard:** **${maxOvers} Overs per match** with 7 wickets limit.
* **Groups Distribution:**
${Object.entries(groups).map(([gName, gTeams]) => `  * **${gName} (${gTeams.length} Teams):** ${gTeams.map(t => `${t.logo || '🏏'} ${t.name}`).join(', ')}`).join('\n')}

> 💡 **Tournament Schedule Status:** All fixtures have been pre-arranged across balanced weekend slots with intra-group rivalries and championship knockouts. Click **"Apply AI Fixtures to Live Tournament"** to publish!`;

  if (effectiveKey) {
    try {
      const geminiPrompt = `You are the Official Tournament Director & Chief Scorer for NEPL (Nyati Era Premier League) Box Cricket ${new Date().getFullYear()}.
The tournament organizer asked: "${prompt || 'Divide teams into Group A and Group B and create the round robin matches and finals'}".

Here are the registered teams:
${teams.map(t => `- ${t.name} (Short: ${t.shortName}, Squad Size: ${(t.squad || []).length}, Captain: ${t.owner || 'TBD'})`).join('\n')}

We have divided them into:
${Object.entries(groups).map(([g, gTeams]) => `${g}: ${gTeams.map(t => t.name).join(', ')}`).join('\n')}

And generated ${generatedMatches.length} matches.

Provide a short, exciting, professional tournament briefing (markdown format) explaining the group structure, key marquee matchups, qualification pathways for Group A and Group B, and strategic insights under NEPL 2026 rules.`;

      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${effectiveKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt }] }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          aiCommentary = candidateText;
        }
      }
    } catch (e) {
      console.warn('[Gemini Service] AI Commentary fetch error:', e);
    }
  }

  return {
    groups,
    matches: generatedMatches,
    aiCommentary,
    source: effectiveKey ? 'Gemini 1.5 Flash (Live AI)' : 'NEPL Autonomous Tournament Engine'
  };
}
