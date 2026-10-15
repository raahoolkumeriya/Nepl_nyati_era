#!/usr/bin/env node
/**
 * Wipe Bidding History & Clean Setup Script for Supreme Master
 * =============================================================
 * - Purges all BidHistory records from MongoDB Atlas
 * - Resets all players back to 'available' with soldPrice=0, soldTo=null, currentBid=100
 * - Seeds/resets the official 6 franchise teams (spentPurse=0, playersCount=0, squad=[], totalPurse=10000)
 * - Registers/updates Supreme Master (developer@nepl.in) and Super Admin (admin@nepl.in) in users collection
 * - Resets live auction room state (auctionstates) to idle
 * - Ready for a clean fresh auction setup!
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI is not defined in .env file!');
  process.exit(1);
}

const OFFICIAL_TEAMS = [
  {
    id: 'team-1',
    name: 'Team A',
    shortName: 'TMA',
    owner: 'Owner A',
    captainId: 'ply-16318362',
    captainName: 'Owner A',
    color: '#3b82f6',
    gradient: 'from-blue-600 to-blue-900',
    logo: '🦁',
    totalPurse: 10000,
    spentPurse: 0,
    maxSquadSize: 10,
    playersCount: 0,
    squad: []
  },
  {
    id: 'team-2',
    name: 'Team B',
    shortName: 'TMB',
    owner: 'Owner B',
    captainId: 'ply-14309852',
    captainName: 'Owner B',
    color: '#ef4444',
    gradient: 'from-red-600 to-red-950',
    logo: '🔥',
    totalPurse: 10000,
    spentPurse: 0,
    maxSquadSize: 10,
    playersCount: 0,
    squad: []
  },
  {
    id: 'team-3',
    name: 'Team C',
    shortName: 'TMC',
    owner: 'Owner C',
    captainId: 'ply-3738018',
    captainName: 'Owner C',
    color: '#06b6d4',
    gradient: 'from-cyan-500 to-cyan-950',
    logo: '⚡',
    totalPurse: 10000,
    spentPurse: 0,
    maxSquadSize: 10,
    playersCount: 0,
    squad: []
  },
  {
    id: 'team-4',
    name: 'Team D',
    shortName: 'TMD',
    owner: 'Owner D',
    captainId: 'ply-11756557',
    captainName: 'Owner D',
    color: '#10b981',
    gradient: 'from-emerald-500 to-emerald-950',
    logo: '🛡️',
    totalPurse: 10000,
    spentPurse: 0,
    maxSquadSize: 10,
    playersCount: 0,
    squad: []
  },
  {
    id: 'team-5',
    name: 'Team E',
    shortName: 'TME',
    owner: 'Owner E',
    captainId: 'ply-3013867',
    captainName: 'Owner E',
    color: '#f59e0b',
    gradient: 'from-amber-500 to-amber-950',
    logo: '👑',
    totalPurse: 10000,
    spentPurse: 0,
    maxSquadSize: 10,
    playersCount: 0,
    squad: []
  },
  {
    id: 'team-6',
    name: 'Team F',
    shortName: 'TMF',
    owner: 'Owner F',
    captainId: 'ply-6913504',
    captainName: 'Owner F',
    color: '#a855f7',
    gradient: 'from-purple-600 to-purple-950',
    logo: '🦅',
    totalPurse: 10000,
    spentPurse: 0,
    maxSquadSize: 10,
    playersCount: 0,
    squad: []
  }
];

async function runCleanSetup() {
  console.log('🔄 Connecting to MongoDB Atlas...');
  await mongoose.connect(uri, { dbName: 'nepl_cricket' });
  console.log('✅ Connected successfully to MongoDB Atlas (nepl_cricket).');

  const db = mongoose.connection.db;

  // 1. Wipe BidHistory
  const deletedHistory = await db.collection('bidhistories').deleteMany({});
  console.log(`🗑️  Deleted ${deletedHistory.deletedCount} bidding history logs.`);

  // 2. Reset Players to available & clear sold info
  const resetPlayers = await db.collection('players').updateMany(
    {},
    {
      $set: {
        status: 'available',
        soldPrice: 0,
        soldTo: null,
        currentBid: 100,
        bidHistory: []
      }
    }
  );
  console.log(`🏏 Reset ${resetPlayers.modifiedCount} players back to 'available' with 0 sold price.`);

  // 3. Ensure Official 6 Teams exist and reset purse
  const currentSettings = await db.collection('settings').findOne({ id: 'tournament_settings' });
  const startupPurse = currentSettings?.startupPurse || 10000;
  console.log(`💰 Active Startup Purse (Total Budget): ₹${startupPurse.toLocaleString()} PTS`);

  const existingTeamsCount = await db.collection('teams').countDocuments();
  if (existingTeamsCount === 0) {
    const teamsToSeed = OFFICIAL_TEAMS.map(t => ({ ...t, totalPurse: startupPurse }));
    await db.collection('teams').insertMany(teamsToSeed);
    console.log(`🛡️  Seeded all ${teamsToSeed.length} official franchise teams with ₹${startupPurse.toLocaleString()} purse.`);
  } else {
    // Reset existing teams
    const resetTeams = await db.collection('teams').updateMany(
      {},
      {
        $set: {
          spentPurse: 0,
          playersCount: 0,
          squad: []
        }
      }
    );
    console.log(`🛡️  Reset ${resetTeams.modifiedCount} existing teams to full purse (spent: 0, squad: empty).`);
  }

  // 4. Ensure Supreme Master user exists in users collection
  await db.collection('users').deleteMany({ $or: [{ id: null }, { email: 'developer@nepl.in' }, { email: 'admin@nepl.in' }] });

  const supremePass = (process.env.SUPREMEMASTER_PASS || process.env.VITE_SUPREMEMASTER_PASS || '').trim();
  if (!supremePass) {
    throw new Error("❌ SUPREMEMASTER_PASS (or VITE_SUPREMEMASTER_PASS) is not defined in environment variables!");
  }

  const supremeUser = {
    id: 'usr-supreme-master-default',
    email: (process.env.SUPREMEMASTER_EMAIL || process.env.VITE_SUPREMEMASTER_EMAIL || 'developer@nepl.in').trim().toLowerCase(),
    password: supremePass,
    name: 'Supreme Master (App Developer)',
    role: 'suprememaster',
    avatar: '👑',
    isDefault: true,
    isDisabled: false,
    updatedAt: new Date(),
  };

  await db.collection('users').updateOne(
    { email: supremeUser.email },
    { $set: supremeUser },
    { upsert: true }
  );
  console.log(`👑 Supreme Master user (${supremeUser.email}) synced in users collection.`);

  // 5. Ensure Super Admin user exists in users collection
  const adminPass = (process.env.SUPERUSER_PASS || process.env.VITE_SUPERUSER_PASS || '').trim();
  if (!adminPass) {
    throw new Error("❌ SUPERUSER_PASS (or VITE_SUPERUSER_PASS) is not defined in environment variables!");
  }

  const adminUser = {
    id: 'usr-admin-default',
    email: (process.env.SUPERUSER_EMAIL || process.env.VITE_SUPERUSER_EMAIL || 'admin@nepl.in').trim().toLowerCase(),
    password: adminPass,
    name: 'Super Admin',
    role: 'superuser',
    avatar: '⚡',
    isDefault: true,
    isDisabled: false,
    updatedAt: new Date(),
  };

  await db.collection('users').updateOne(
    { email: adminUser.email },
    { $set: adminUser },
    { upsert: true }
  );
  console.log(`⚡ Super Admin user (${adminUser.email}) synced in users collection.`);

  // 6. Reset live auction room state
  const resetAuction = await db.collection('auctionstates').updateMany(
    {},
    {
      $set: {
        id: 'active_session',
        status: 'idle',
        activePlayerId: null,
        currentBid: 100,
        highBidder: { id: null, name: null, color: null, logo: null },
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );
  console.log(`⚡ Reset active live auction state (${resetAuction.modifiedCount || 1} updated).`);

  // Verify status summary
  const summary = {
    bidHistoriesCount: await db.collection('bidhistories').countDocuments(),
    playersCount: await db.collection('players').countDocuments(),
    teamsCount: await db.collection('teams').countDocuments(),
    usersCount: await db.collection('users').countDocuments(),
  };
  console.log('\n📊 Database Status Summary:', summary);

  await mongoose.disconnect();
  console.log('\n✨ Clean Auction Setup complete! Ready for fresh bidding.');
}

runCleanSetup().catch(err => {
  console.error('❌ Error during clean setup:', err.message);
  process.exit(1);
});
