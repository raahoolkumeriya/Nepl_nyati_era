#!/usr/bin/env node
/**
 * MongoDB Player Data Dump Script
 * ================================
 * Reads players JSON (e.g. players.json / players_output.json) and dumps
 * the documents into MongoDB using Mongoose.
 *
 * Usage:
 *   node scripts/dump_to_mongo.js
 *   node scripts/dump_to_mongo.js --file players.json
 *   node scripts/dump_to_mongo.js --uri "mongodb+srv://.../nepl_cricket"
 *   node scripts/dump_to_mongo.js --mode replace  # drops & replaces players
 *   node scripts/dump_to_mongo.js --mode upsert   # updates or inserts by id (default)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env
dotenv.config({ path: path.join(rootDir, '.env') });

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    file: 'players.json',
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/box_cricket',
    mode: 'upsert', // 'upsert' or 'replace'
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--file' || arg === '-f') {
      options.file = args[++i];
    } else if (arg === '--uri' || arg === '-u') {
      options.uri = args[++i];
    } else if (arg === '--mode' || arg === '-m') {
      options.mode = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

// Player Schema (matches server/models/Player.js)
const PlayerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: String,
  category: String,
  basePrice: Number,
  matches: Number,
  runs: Number,
  avg: Number,
  strikeRate: Number,
  wickets: Number,
  economy: Number,
  bestBowling: String,
  cricHeroesUrl: String,
  avatarUrl: String,
  status: { type: String, enum: ['available', 'sold', 'unsold'], default: 'available' },
  soldPrice: { type: Number, default: 0 },
  soldTo: { type: String, default: null },
  _source: Object,
}, { timestamps: true });

const Player = mongoose.models.Player || mongoose.model('Player', PlayerSchema);

async function main() {
  const options = parseArgs();

  if (options.help) {
    console.log(`
MongoDB Player Dump Tool
========================
Usage:
  node scripts/dump_to_mongo.js [options]

Options:
  -f, --file <path>    Path to players JSON file (default: players.json or players_output.json)
  -u, --uri <uri>      MongoDB connection URI (default: MONGODB_URI from .env)
  -m, --mode <mode>    Import mode: 'upsert' (default) or 'replace'
  -h, --help           Show this help message
    `);
    process.exit(0);
  }

  // Resolve JSON file path
  let filePath = path.isAbsolute(options.file)
    ? options.file
    : path.resolve(process.cwd(), options.file);

  // Fallback to players_output.json or scripts/players.json if not found
  if (!fs.existsSync(filePath)) {
    const fallbacks = [
      path.resolve(process.cwd(), 'players_output.json'),
      path.resolve(rootDir, 'players.json'),
      path.resolve(rootDir, 'players_output.json'),
      path.resolve(__dirname, 'players.json'),
      path.resolve(__dirname, 'players_output.json'),
    ];
    for (const fb of fallbacks) {
      if (fs.existsSync(fb)) {
        filePath = fb;
        break;
      }
    }
  }

  if (!fs.existsSync(filePath)) {
    console.error(`\x1b[31m[ERROR]\x1b[0m File not found: ${options.file}`);
    console.error(`Please make sure you have generated the players file using scrape_cricheroes.py first.`);
    process.exit(1);
  }

  console.log(`\x1b[36m[INFO]\x1b[0m Reading players from: ${filePath}`);
  let rawData;
  try {
    rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Failed to parse JSON file: ${err.message}`);
    process.exit(1);
  }

  const players = Array.isArray(rawData) ? rawData : (rawData.players || [rawData]);
  console.log(`\x1b[36m[INFO]\x1b[0m Loaded ${players.length} player record(s) from JSON.`);

  if (players.length === 0) {
    console.log(`\x1b[33m[WARN]\x1b[0m No players found in file. Exiting.`);
    process.exit(0);
  }

  // Mask URI credentials for logging
  const maskedUri = options.uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:*****@');
  console.log(`\x1b[36m[INFO]\x1b[0m Connecting to MongoDB: ${maskedUri}`);

  try {
    await mongoose.connect(options.uri);
    console.log(`\x1b[32m[SUCCESS]\x1b[0m Connected to MongoDB successfully!`);
  } catch (err) {
    console.error(`\x1b[31m[ERROR]\x1b[0m MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }

  console.log(`\x1b[36m[INFO]\x1b[0m Import mode: ${options.mode.toUpperCase()}`);

  try {
    if (options.mode === 'replace') {
      console.log(`\x1b[33m[WARN]\x1b[0m Clearing existing players collection...`);
      const deleteResult = await Player.deleteMany({});
      console.log(`\x1b[36m[INFO]\x1b[0m Deleted ${deleteResult.deletedCount} existing player(s).`);

      const insertResult = await Player.insertMany(players, { ordered: false });
      console.log(`\x1b[32m[SUCCESS]\x1b[0m Inserted ${insertResult.length} players into MongoDB.`);
    } else {
      // Upsert mode (default)
      let insertedCount = 0;
      let updatedCount = 0;

      for (const p of players) {
        if (!p.id) {
          console.warn(`\x1b[33m[WARN]\x1b[0m Skipping player without 'id': ${p.name || 'Unknown'}`);
          continue;
        }

        const res = await Player.updateOne(
          { id: p.id },
          { $set: p },
          { upsert: true }
        );

        if (res.upsertedCount > 0) {
          insertedCount++;
        } else if (res.modifiedCount > 0 || res.matchedCount > 0) {
          updatedCount++;
        }
      }

      console.log(`\x1b[32m[SUCCESS]\x1b[0m Upsert complete:`);
      console.log(`  - Newly Inserted : ${insertedCount}`);
      console.log(`  - Updated/Matched: ${updatedCount}`);
    }

    const totalInDb = await Player.countDocuments();
    console.log(`\x1b[32m[DONE]\x1b[0m Total players currently in database: ${totalInDb}`);

  } catch (err) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Database operation error: ${err.message}`);
  } finally {
    await mongoose.disconnect();
    console.log(`\x1b[36m[INFO]\x1b[0m Database connection closed.`);
  }
}

main();
