#!/usr/bin/env python3
"""
Python MongoDB Player Data Dump Script
======================================
Reads players JSON (e.g. players.json / players_output.json) and dumps
the documents directly into MongoDB.

Usage:
  python3 scripts/dump_to_mongo.py
  python3 scripts/dump_to_mongo.py --file players.json
  python3 scripts/dump_to_mongo.py --uri "mongodb+srv://.../nepl_cricket"
  python3 scripts/dump_to_mongo.py --mode replace  # drops and replaces players
  python3 scripts/dump_to_mongo.py --mode upsert   # updates or inserts by id (default)
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

# Find project root directory
SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent

def load_dotenv(dotenv_path: Path):
    """Simple .env file parser if python-dotenv is not installed."""
    if not dotenv_path.exists():
        return
    with open(dotenv_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                if key and key not in os.environ:
                    os.environ[key] = val

# Load .env
load_dotenv(ROOT_DIR / ".env")

def parse_args():
    parser = argparse.ArgumentParser(
        description="Dump players JSON directly into MongoDB"
    )
    parser.add_argument(
        "-f", "--file",
        default="players.json",
        help="Path to players JSON file (default: players.json or players_output.json)",
    )
    parser.add_argument(
        "-u", "--uri",
        default=os.environ.get("MONGODB_URI", "mongodb://localhost:27017/box_cricket"),
        help="MongoDB connection URI (default: MONGODB_URI from .env)",
    )
    parser.add_argument(
        "-d", "--db",
        default=None,
        help="Database name (default: parsed from URI or 'box_cricket')",
    )
    parser.add_argument(
        "-c", "--collection",
        default="players",
        help="MongoDB collection name (default: 'players')",
    )
    parser.add_argument(
        "-m", "--mode",
        choices=["upsert", "replace"],
        default="upsert",
        help="Import mode: 'upsert' (update or insert) or 'replace' (drop & insert)",
    )
    return parser.parse_args()

def resolve_file(filepath: str) -> Path:
    p = Path(filepath)
    if p.is_absolute() and p.exists():
        return p
    
    candidates = [
        Path.cwd() / filepath,
        Path.cwd() / "players_output.json",
        ROOT_DIR / filepath,
        ROOT_DIR / "players_output.json",
        SCRIPT_DIR / filepath,
        SCRIPT_DIR / "players_output.json",
    ]
    for c in candidates:
        if c.exists() and c.is_file():
            return c
    return p

def extract_db_name(uri: str, default: str = "box_cricket") -> str:
    """Extract database name from MongoDB URI."""
    try:
        # Match standard /dbname or /dbname?query
        match = re.search(r"/([^/?]+)(\?|$)", uri.split("://")[-1])
        if match and match.group(1):
            return match.group(1)
    except Exception:
        pass
    return default

def dump_with_pymongo(uri: str, db_name: str, coll_name: str, players: list, mode: str):
    import pymongo

    masked_uri = re.sub(r"//([^:]+):([^@]+)@", r"//\1:*****@", uri)
    print(f"\033[36m[INFO]\033[0m Connecting to MongoDB with PyMongo: {masked_uri}")
    
    client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=10000)
    # Check connection
    client.admin.command("ping")
    print("\033[32m[SUCCESS]\033[0m Connected to MongoDB!")

    db = client[db_name]
    coll = db[coll_name]

    if mode == "replace":
        print("\033[33m[WARN]\033[0m Dropping existing documents in collection...")
        del_res = coll.delete_many({})
        print(f"\033[36m[INFO]\033[0m Deleted {del_res.deleted_count} record(s).")
        if players:
            ins_res = coll.insert_many(players, ordered=False)
            print(f"\033[32m[SUCCESS]\033[0m Inserted {len(ins_res.inserted_ids)} player(s).")
    else:
        inserted = 0
        updated = 0
        for p in players:
            pid = p.get("id")
            if not pid:
                continue
            res = coll.update_one({"id": pid}, {"$set": p}, upsert=True)
            if res.upserted_id:
                inserted += 1
            else:
                updated += 1
        print("\033[32m[SUCCESS]\033[0m Upsert complete:")
        print(f"  - Newly Inserted : {inserted}")
        print(f"  - Updated/Matched: {updated}")

    total = coll.count_documents({})
    print(f"\033[32m[DONE]\033[0m Total players currently in database: {total}")
    client.close()

def dump_with_node_fallback(file_path: Path, uri: str, mode: str):
    """Fallback to dump_to_mongo.js via Node if pymongo is unavailable."""
    import subprocess
    js_script = SCRIPT_DIR / "dump_to_mongo.js"
    if js_script.exists():
        print("\033[36m[INFO]\033[0m Invoking Node.js MongoDB driver helper...")
        cmd = ["node", str(js_script), "--file", str(file_path), "--uri", uri, "--mode", mode]
        subprocess.run(cmd, check=True)
    else:
        raise RuntimeError("Neither PyMongo nor Node dump script is available.")

def main():
    args = parse_args()
    file_path = resolve_file(args.file)

    if not file_path.exists():
        print(f"\033[31m[ERROR]\033[0m File not found: {args.file}")
        print("Please run `python3 scripts/scrape_cricheroes.py` first to generate the player data.")
        sys.exit(1)

    print(f"\033[36m[INFO]\033[0m Reading players from: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    players = data if isinstance(data, list) else data.get("players", [data])
    print(f"\033[36m[INFO]\033[0m Loaded {len(players)} player record(s).")

    if not players:
        print("\033[33m[WARN]\033[0m No players found in file. Exiting.")
        sys.exit(0)

    db_name = args.db or extract_db_name(args.uri)

    try:
        dump_with_pymongo(args.uri, db_name, args.collection, players, args.mode)
    except Exception as e:
        print(f"\033[33m[WARN]\033[0m PyMongo failed ({e}). Falling back to Node.js Mongoose runner...")
        try:
            dump_with_node_fallback(file_path, args.uri, args.mode)
        except Exception as e2:
            print(f"\033[31m[ERROR]\033[0m Failed to dump data to MongoDB: {e2}")
            sys.exit(1)

if __name__ == "__main__":
    main()
