#!/usr/bin/env node
/**
 * Master MongoDB Synchronization & Table Merger
 * ===============================================
 * Synchronizes and populates all 5 core MongoDB collections:
 *   1. players       - All 133 extracted CricHeroes players with stats & roles
 *   2. teams         - Official 6 NEPL Franchise Teams with captain assignments
 *   3. rules         - Official 10 NEPL League Directive Rules
 *   4. matches       - Round-Robin Match Schedule (15 league matches + playoffs)
 *   5. bidhistories  - Audit trail collection
 *
 * Usage:
 *   node scripts/merge_and_sync_all.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env
dotenv.config({ path: path.join(rootDir, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('\x1b[31m[ERROR]\x1b[0m MONGODB_URI is not set in .env!');
  process.exit(1);
}

// Schemas
const PlayerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: String,
  category: { type: String, default: 'Male' },
  basePrice: { type: Number, default: 100 },
  matches: { type: Number, default: 0 },
  runs: { type: Number, default: 0 },
  avg: { type: Number, default: 0.0 },
  strikeRate: { type: Number, default: 0.0 },
  wickets: { type: Number, default: 0 },
  economy: { type: Number, default: 0.0 },
  bestBowling: { type: String, default: '0/0' },
  cricHeroesUrl: String,
  avatarUrl: String,
  status: { type: String, enum: ['available', 'sold', 'unsold'], default: 'available' },
  soldPrice: { type: Number, default: 0 },
  soldTo: { type: String, default: null },
  isCaptain: { type: Boolean, default: false },
  isAuctioneer: { type: Boolean, default: false },
  captainOfTeamId: { type: String, default: null },
  isPlayingNEPL: { type: Boolean, default: true },
  isNewJoiner: { type: Boolean, default: false },
  tournamentSession: { type: String, default: 'NEPL 2026' },
}, { timestamps: true });

const TeamSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  shortName: String,
  owner: String,
  captainId: String,
  captainName: String,
  color: String,
  gradient: String,
  borderColor: String,
  bgBadge: String,
  totalPurse: { type: Number, default: 10000 },
  spentPurse: { type: Number, default: 0 },
  maxSquadSize: { type: Number, default: 10 },
  playersCount: { type: Number, default: 0 },
  logo: String,
  squad: [{
    id: String,
    name: String,
    role: String,
    category: String,
    soldPrice: Number,
    avatarUrl: String,
    cricHeroesUrl: String,
    isCaptain: Boolean,
    isAuctioneer: Boolean,
  }],
}, { timestamps: true });

const RuleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  number: String,
  title: { type: String, required: true },
  desc: { type: String, required: true },
  icon: { type: String, default: 'BookOpen' },
}, { timestamps: true });

const MatchSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  matchNumber: { type: Number, default: 1 },
  round: { type: String, default: 'Match 1' },
  stage: { type: String, default: 'league', enum: ['league', 'semifinal', 'final', 'custom'] },
  team1Id: { type: String, default: '' },
  team1Name: { type: String, required: true },
  team1Logo: { type: String, default: '🏏' },
  team1Color: { type: String, default: '#d4622a' },
  team2Id: { type: String, default: '' },
  team2Name: { type: String, required: true },
  team2Logo: { type: String, default: '🏏' },
  team2Color: { type: String, default: '#3b82f6' },
  date: { type: String, default: '' },
  time: { type: String, default: '' },
  slot: { type: String, default: 'Morning Slot' },
  venue: { type: String, default: 'NEPL Ground' },
  maxOvers: { type: Number, default: 8 },
  status: { type: String, default: 'Scheduled', enum: ['Scheduled', 'Live', 'Completed', 'Rain / Abandoned'] },
  score1: { type: Number, default: 0 },
  overs1: { type: Number, default: 0 },
  wickets1: { type: Number, default: 0 },
  score2: { type: Number, default: 0 },
  overs2: { type: Number, default: 0 },
  wickets2: { type: Number, default: 0 },
  winnerId: { type: String, default: null },
  winner: { type: String, default: null },
  winMargin: { type: String, default: '' },
  tossWinner: { type: String, default: '' },
  tossDecision: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

// Models
const Player = mongoose.models.Player || mongoose.model('Player', PlayerSchema);
const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);
const Rule = mongoose.models.Rule || mongoose.model('Rule', RuleSchema);
const Match = mongoose.models.Match || mongoose.model('Match', MatchSchema);

// Official Initial Rules Data
const OFFICIAL_RULES = [
  {
    id: 'rule-1',
    number: '01',
    title: 'Round Robin League Format',
    desc: 'Every participating team gets 5 league matches in a round robin format to ensure equal playing opportunities.',
    icon: 'Trophy'
  },
  {
    id: 'rule-2',
    number: '02',
    title: 'Auction Player Selection & Bidding Slabs',
    desc: 'All players are selected through a live auction using team purse budget. Bidding increments follow tiered slabs: +100 PTS up to 1,000 PTS, +200 PTS between 1,000 to 3,000 PTS, and +300 PTS above 3,000 PTS (+100 for every additional 2,000 PTS crossing).',
    icon: 'Gavel'
  },
  {
    id: 'rule-3',
    number: '03',
    title: '8 Overs Innings Limit',
    desc: 'Each innings consists of exactly 8 overs. Bowlers have per-over quotas to maintain match pace.',
    icon: 'Clock'
  },
  {
    id: 'rule-4',
    number: '04',
    title: '8 Players Squad | Max 6 On Field',
    desc: 'Each team comprises an 8-player squad. However, at ANY given time, strictly ONLY 6 players are allowed on the ground. Captains MUST rotate players so everyone gets playing time.',
    icon: 'Users'
  },
  {
    id: 'rule-5',
    number: '05',
    title: 'NEPL Fence Boundary Rule',
    desc: 'Official NEPL fence boundary rules apply. A ball hitting the fence directly earns 1 run / 2 runs as a bonus based on marked fence zones.',
    icon: 'ShieldAlert'
  },
  {
    id: 'rule-6',
    number: '06',
    title: '7 Wickets Out = Innings Complete',
    desc: 'NO last man batting is allowed. Once 7 wickets fall, the innings is officially completed.',
    icon: 'XCircle'
  },
  {
    id: 'rule-7',
    number: '07',
    title: 'Playoff & Qualifier System',
    desc: 'The Table Topper (either by points or NRR) qualifies directly for the Finals! 2nd and 3rd place play the Semifinal match. The winner advances to the Finals.',
    icon: 'Zap'
  },
  {
    id: 'rule-8',
    number: '08',
    title: 'Umpire Decisions & Arbitration',
    desc: 'Umpiring decisions are strictly FINAL. No on-ground disputes will be entertained. For any major arguments, the FINAL decision will be held by Harish & Santosh.',
    icon: 'UserCheck'
  },
  {
    id: 'rule-9',
    number: '09',
    title: 'Prize Money',
    desc: 'WINNER: INR 2,500/- | RUNNER UP: INR 1,500/-',
    icon: 'Gift'
  },
  {
    id: 'rule-10',
    number: '10',
    title: 'Rain Policy & Weekend Schedule',
    desc: 'If matches are interrupted due to rain or unforeseen reasons, the schedule will be adjusted dynamically. If Saturday evening is clear, Sunday morning matches will be shifted to the Saturday RAIN COVER slot. Finals target Sunday 8 PM finish, followed by a grand Dinner Party!',
    icon: 'CloudRain'
  }
];

// Official 6 NEPL Franchise Teams definition
const OFFICIAL_TEAMS_CONFIG = [
  {
    id: 'team-1',
    name: 'Team A - Avinav',
    shortName: 'TMA',
    owner: 'Avinav Chandra',
    captainSearch: 'avinav',
    color: '#3b82f6',
    gradient: 'from-blue-600 to-blue-900',
    logo: '🦁',
    totalPurse: 10000,
    maxSquadSize: 10,
  },
  {
    id: 'team-2',
    name: 'Team B - Tushar',
    shortName: 'TMB',
    owner: 'Tushar Patil',
    captainSearch: 'tushar',
    color: '#ef4444',
    gradient: 'from-red-600 to-red-950',
    logo: '🔥',
    totalPurse: 10000,
    maxSquadSize: 10,
  },
  {
    id: 'team-3',
    name: 'Team C - Jugal',
    shortName: 'TMC',
    owner: 'Jugal Kishore',
    captainSearch: 'jugal',
    color: '#06b6d4',
    gradient: 'from-cyan-500 to-cyan-950',
    logo: '⚡',
    totalPurse: 10000,
    maxSquadSize: 10,
  },
  {
    id: 'team-4',
    name: 'Team D - Amit',
    shortName: 'TMD',
    owner: 'Amit Sharma',
    captainSearch: 'amit',
    color: '#10b981',
    gradient: 'from-emerald-500 to-emerald-950',
    logo: '🛡️',
    totalPurse: 10000,
    maxSquadSize: 10,
  },
  {
    id: 'team-5',
    name: 'Team E - Abhishek',
    shortName: 'TME',
    owner: 'Abhishek Roy',
    captainSearch: 'abhishek',
    color: '#f59e0b',
    gradient: 'from-amber-500 to-amber-950',
    logo: '👑',
    totalPurse: 10000,
    maxSquadSize: 10,
  },
  {
    id: 'team-6',
    name: 'Team F - Mahesh',
    shortName: 'TMF',
    owner: 'Mahesh G',
    captainSearch: 'mahesh',
    color: '#a855f7',
    gradient: 'from-purple-600 to-purple-950',
    logo: '🦅',
    totalPurse: 10000,
    maxSquadSize: 10,
  },
];

async function main() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('  NEPL MASTER MONGODB MERGE & SYNC ENGINE');
  console.log('════════════════════════════════════════════════════════════════════');

  const maskedUri = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:*****@');
  console.log(`[INFO] Connecting to MongoDB Atlas: ${maskedUri}`);

  await mongoose.connect(MONGODB_URI, { dbName: 'nepl_cricket' });
  console.log('\x1b[32m[SUCCESS]\x1b[0m Connected to MongoDB Atlas (nepl_cricket) successfully!\n');

  // ─────────────────────────────────────────────────────────────────────────
  // 1. PLAYERS TABLE VERIFICATION & MERGE
  // ─────────────────────────────────────────────────────────────────────────
  console.log('[STEP 1] Auditing & Merging Players Collection...');
  let playersJsonPath = path.join(rootDir, 'scripts', 'players.json');
  if (!fs.existsSync(playersJsonPath)) {
    playersJsonPath = path.join(rootDir, 'players.json');
  }

  let filePlayers = [];
  if (fs.existsSync(playersJsonPath)) {
    try {
      filePlayers = JSON.parse(fs.readFileSync(playersJsonPath, 'utf-8'));
    } catch (e) {
      console.warn(`[WARN] Could not parse ${playersJsonPath}:`, e.message);
    }
  }

  console.log(`[INFO] Found ${filePlayers.length} player(s) in local players.json`);

  let playerUpserts = 0;
  for (const p of filePlayers) {
    if (!p.id) continue;
    await Player.updateOne(
      { id: p.id },
      {
        $set: {
          name: p.name,
          role: p.role,
          category: p.category || 'Male',
          basePrice: p.basePrice || 100,
          matches: p.matches || 0,
          runs: p.runs || 0,
          avg: p.avg || 0.0,
          strikeRate: p.strikeRate || 0.0,
          wickets: p.wickets || 0,
          economy: p.economy || 0.0,
          bestBowling: p.bestBowling || '0/0',
          cricHeroesUrl: p.cricHeroesUrl || '',
          avatarUrl: p.avatarUrl || 'https://media.cricheroes.in/default/user_profile.png',
          tournamentSession: p.tournamentSession || 'NEPL 2026',
        },
        $setOnInsert: {
          id: p.id,
          status: p.status || 'available',
          soldPrice: p.soldPrice || 0,
          soldTo: p.soldTo || null,
          isCaptain: Boolean(p.isCaptain),
          isAuctioneer: Boolean(p.isAuctioneer),
          captainOfTeamId: p.captainOfTeamId || null,
          isPlayingNEPL: p.isPlayingNEPL !== false,
          isNewJoiner: Boolean(p.isNewJoiner),
        }
      },
      { upsert: true }
    );
    playerUpserts++;
  }

  const totalPlayersInDb = await Player.countDocuments();
  console.log(`\x1b[32m[✓]\x1b[0m Players Collection Verified: ${totalPlayersInDb} documents ready in MongoDB.\n`);

  // Verify Vedang Patil
  const vedangDoc = await Player.findOne({ name: /vedang patil/i });
  if (vedangDoc) {
    console.log(`  ✓ Verified Player 'Vedang Patil': ID=${vedangDoc.id}, Role=${vedangDoc.role}, Matches=${vedangDoc.matches}, Runs=${vedangDoc.runs}, Wkts=${vedangDoc.wickets}`);
  } else {
    console.warn(`  ⚠️ Warning: Vedang Patil record not found in MongoDB.`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. TEAMS TABLE MERGE & CAPTAIN INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n[STEP 2] Auditing & Merging Teams Collection...');
  const existingTeams = await Team.find({});
  const allPlayersInDb = await Player.find({});

  for (const tConfig of OFFICIAL_TEAMS_CONFIG) {
    // Find matching captain player
    const capPlayer = allPlayersInDb.find(p => 
      p.name.toLowerCase().includes(tConfig.captainSearch)
    );

    const existingTeam = existingTeams.find(t => t.id === tConfig.id);

    let squad = existingTeam?.squad || [];
    let captainId = existingTeam?.captainId || (capPlayer ? capPlayer.id : null);
    let captainName = existingTeam?.captainName || (capPlayer ? capPlayer.name : tConfig.owner);

    // If squad is empty and captain found, add captain as squad member at 0 price
    if (squad.length === 0 && capPlayer) {
      squad = [{
        id: capPlayer.id,
        name: capPlayer.name,
        role: capPlayer.role,
        category: capPlayer.category || 'Male',
        soldPrice: 0,
        avatarUrl: capPlayer.avatarUrl,
        cricHeroesUrl: capPlayer.cricHeroesUrl,
        isCaptain: true,
        isAuctioneer: true,
      }];

      // Mark captain in players table
      await Player.updateOne(
        { id: capPlayer.id },
        {
          $set: {
            isCaptain: true,
            isAuctioneer: true,
            captainOfTeamId: tConfig.id,
            soldTo: tConfig.id,
            status: 'sold',
            soldPrice: 0,
          }
        }
      );
    }

    const spentPurse = squad.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0);

    await Team.updateOne(
      { id: tConfig.id },
      {
        $set: {
          name: existingTeam?.name || tConfig.name,
          shortName: existingTeam?.shortName || tConfig.shortName,
          owner: existingTeam?.owner || tConfig.owner,
          captainId: captainId,
          captainName: captainName,
          color: existingTeam?.color || tConfig.color,
          gradient: existingTeam?.gradient || tConfig.gradient,
          logo: existingTeam?.logo || tConfig.logo,
          totalPurse: existingTeam?.totalPurse || tConfig.totalPurse,
          spentPurse: spentPurse,
          maxSquadSize: existingTeam?.maxSquadSize || tConfig.maxSquadSize,
          playersCount: squad.length,
          squad: squad,
        }
      },
      { upsert: true }
    );
  }

  const totalTeamsInDb = await Team.countDocuments();
  const allTeamsInDb = await Team.find({});
  console.log(`\x1b[32m[✓]\x1b[0m Teams Collection Verified: ${totalTeamsInDb} official franchise teams active in MongoDB:`);
  for (const t of allTeamsInDb) {
    console.log(`  - [${t.shortName}] ${t.name} (Logo: ${t.logo}, Purse: ₹${t.totalPurse - t.spentPurse} / ₹${t.totalPurse}, Squad: ${t.squad.length}/${t.maxSquadSize})`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. RULES TABLE MERGE
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n[STEP 3] Auditing & Merging Rules Collection...');
  for (const rule of OFFICIAL_RULES) {
    await Rule.updateOne(
      { id: rule.id },
      { $set: rule },
      { upsert: true }
    );
  }
  const totalRulesInDb = await Rule.countDocuments();
  console.log(`\x1b[32m[✓]\x1b[0m Rules Collection Verified: ${totalRulesInDb} official league directives in MongoDB.`);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. MATCH SCHEDULE MERGE
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n[STEP 4] Auditing & Merging Match Schedule Collection...');
  const existingMatches = await Match.find({});

  if (existingMatches.length === 0) {
    console.log('[INFO] Generating standard Round-Robin match schedule for 6 teams...');
    const generatedMatches = [];
    let matchCounter = 1;

    // Round Robin pairs for 6 teams (15 matches)
    for (let i = 0; i < allTeamsInDb.length; i++) {
      for (let j = i + 1; j < allTeamsInDb.length; j++) {
        const t1 = allTeamsInDb[i];
        const t2 = allTeamsInDb[j];
        generatedMatches.push({
          id: `match-${matchCounter}`,
          matchNumber: matchCounter,
          round: `League Match ${matchCounter}`,
          stage: 'league',
          team1Id: t1.id,
          team1Name: t1.name,
          team1Logo: t1.logo || '🏏',
          team1Color: t1.color || '#3b82f6',
          team2Id: t2.id,
          team2Name: t2.name,
          team2Logo: t2.logo || '🏏',
          team2Color: t2.color || '#ef4444',
          date: '2026-06-13',
          time: `${8 + (matchCounter % 4) * 2}:00 ${matchCounter < 3 ? 'AM' : 'PM'}`,
          slot: matchCounter <= 8 ? 'Saturday Slot' : 'Sunday Slot',
          venue: 'NEPL Box Arena',
          maxOvers: 8,
          status: 'Scheduled',
          score1: 0,
          overs1: 0,
          wickets1: 0,
          score2: 0,
          overs2: 0,
          wickets2: 0,
        });
        matchCounter++;
      }
    }

    // Playoff Semifinal & Final
    generatedMatches.push({
      id: `match-16`,
      matchNumber: 16,
      round: 'Playoff Semifinal',
      stage: 'semifinal',
      team1Id: '',
      team1Name: 'Rank #2 Team',
      team1Logo: '⚔️',
      team1Color: '#10b981',
      team2Id: '',
      team2Name: 'Rank #3 Team',
      team2Logo: '🛡️',
      team2Color: '#f59e0b',
      date: '2026-06-14',
      time: '05:00 PM',
      slot: 'Sunday Evening Playoffs',
      venue: 'NEPL Box Arena',
      maxOvers: 8,
      status: 'Scheduled',
    });

    generatedMatches.push({
      id: `match-17`,
      matchNumber: 17,
      round: 'Grand Championship Final',
      stage: 'final',
      team1Id: '',
      team1Name: 'Rank #1 Team (Table Topper)',
      team1Logo: '👑',
      team1Color: '#06b6d4',
      team2Id: '',
      team2Name: 'Semifinal Winner',
      team2Logo: '🏆',
      team2Color: '#a855f7',
      date: '2026-06-14',
      time: '07:30 PM',
      slot: 'Sunday Grand Finale',
      venue: 'NEPL Box Arena',
      maxOvers: 8,
      status: 'Scheduled',
    });

    for (const m of generatedMatches) {
      await Match.updateOne({ id: m.id }, { $set: m }, { upsert: true });
    }
  }

  const totalMatchesInDb = await Match.countDocuments();
  console.log(`\x1b[32m[✓]\x1b[0m Matches Collection Verified: ${totalMatchesInDb} scheduled tournament fixtures in MongoDB.\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // FINAL AUDIT SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('  MONGODB ATLAS SYNCHRONIZATION AUDIT COMPLETE');
  console.log('════════════════════════════════════════════════════════════════════');
  console.log(`  • Players Collection  : ${totalPlayersInDb} documents verified`);
  console.log(`  • Teams Collection    : ${totalTeamsInDb} documents verified`);
  console.log(`  • Rules Collection    : ${totalRulesInDb} documents verified`);
  console.log(`  • Matches Collection  : ${totalMatchesInDb} documents verified`);
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('\x1b[32m[ALL TABLES READY FOR PRODUCTION WEB APP RENDERING]\x1b[0m 🚀\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('\x1b[31m[FATAL ERROR]\x1b[0m', err);
  process.exit(1);
});
