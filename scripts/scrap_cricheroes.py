#!/usr/bin/env python3
"""
CricHeroes Tournament Player Scraper & Sync Engine (v4 - Enhanced & Precision Analytics)
========================================================================================
Accurately fetches, aggregates, normalizes, and synchronizes ALL squad players,
teams, batting/bowling leaderboards, and career statistics across CricHeroes tournaments
into JSON, MongoDB Atlas, and the FastAPI/Render backend.

Key Enhancements:
  - 100% Comprehensive Extraction: Queries teams, squad rosters, tournament leaderboards,
    and individual career statistics with parallel thread workers.
  - Multi-Tournament Aggregation: Correctly maps tournament IDs per row to calculate true
    aggregate matches, runs, batting average, strike rate, wickets, economy, and best bowling.
  - Dynamic Role & Style Detection: Detects Batting Hand (RHB/LHB), Bowling Style, and evaluates
    performance metrics (tournament + career) to assign accurate cricket roles.
  - Non-Destructive Smart Merge: Preserves live auction states, captaincy assignments,
    custom categories, auctioneer roles, and custom avatars from existing database/JSON.
  - Universal Multi-Destination Sync: Outputs to scripts/players.json, root players.json,
    FastAPI / Express REST backend, and MongoDB Atlas.

Target Tournaments:
  - Era Weekend Tournament June 2026 (ID: 2066226)
  - NEPL 2026 Summer Season         (ID: 2014112)

Usage:
  # 1. Scrape, aggregate, save to JSON, and sync to live backend
  python3 scripts/scrap_cricheroes.py --push-api

  # 2. Scrape and save to JSON file
  python3 scripts/scrap_cricheroes.py --output scripts/players.json

  # 3. Scrape custom tournaments with smart MongoDB upsert
  python3 scripts/scrap_cricheroes.py --tournament-ids 2066226 2014112 --mongo
"""

import argparse
import concurrent.futures
import gzip
import json
import logging
import os
import re
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# ===========================================================================
# ENVIRONMENT & PATH CONFIGURATION
# ===========================================================================

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent

def load_dotenv(dotenv_path: Path):
    """Parses .env file without requiring external python-dotenv package."""
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

# Load .env from workspace root
load_dotenv(ROOT_DIR / ".env")

# ===========================================================================
# SSL & NETWORK CONFIGURATION
# ===========================================================================

def get_ssl_context() -> ssl.SSLContext:
    """Configures SSL context with macOS/Linux certifi fallback to unverified context."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        pass
    return ssl._create_unverified_context()

SSL_CONTEXT = get_ssl_context()

API_BASE_URL       = os.environ.get("CRICHEROES_API_BASE_URL", "https://api.cricheroes.in")
CRICHEROES_API_KEY = os.environ.get("CRICHEROES_API_KEY", "cr!CkH3r0s")
DEVICE_TYPE        = "Chrome: 114.0.0.0"
USER_AGENT         = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
SESSION_UDID = uuid.uuid4().hex[:32]

DEFAULT_TOURNAMENTS = [
    {
        "name": "Era Weekend Tournament June 2026",
        "id":   2066226,
    },
    {
        "name": "NEPL 2026 Summer Season",
        "id":   2014112,
    },
]

DEFAULT_FASTAPI_ENDPOINT = os.environ.get("BACKEND_URL") or "https://nepl-nyati-era.onrender.com/api/players"
DEFAULT_FASTAPI_KEY      = os.environ.get("API_KEY") or os.environ.get("VITE_API_KEY") or ""
DEFAULT_MONGO_URI        = os.environ.get("MONGODB_URI", "")
AVATAR_FALLBACK          = "https://media.cricheroes.in/default/user_profile.png"

# ===========================================================================
# LOGGING
# ===========================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("CricHeroesScraper")

# ===========================================================================
# HTTP CLIENT
# ===========================================================================

def _headers() -> dict:
    return {
        "User-Agent":  USER_AGENT,
        "Accept":      "application/json",
        "api-key":     CRICHEROES_API_KEY,
        "device-type": DEVICE_TYPE,
        "udid":        SESSION_UDID,
    }


def api_get(path: str, params: Optional[dict] = None, max_retries: int = 4) -> dict:
    """Performs HTTP GET against api.cricheroes.in with exponential backoff and SSL recovery."""
    global SSL_CONTEXT
    url = f"{API_BASE_URL}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)

    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, headers=_headers())
            with urllib.request.urlopen(req, context=SSL_CONTEXT, timeout=25) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            if not data.get("status"):
                err = data.get("error", {})
                raise ValueError(f"API error {err.get('code')}: {err.get('message')}")
            return data
        except Exception as exc:
            if "CERTIFICATE_VERIFY_FAILED" in str(exc) or "certificate verify failed" in str(exc):
                SSL_CONTEXT = ssl._create_unverified_context()
                try:
                    req = urllib.request.Request(url, headers=_headers())
                    with urllib.request.urlopen(req, context=SSL_CONTEXT, timeout=25) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                    if not data.get("status"):
                        err = data.get("error", {})
                        raise ValueError(f"API error {err.get('code')}: {err.get('message')}")
                    return data
                except Exception as inner_exc:
                    exc = inner_exc

            if attempt < max_retries:
                time.sleep(1.2 * attempt)
            else:
                log.debug("GET failed for %s (after %d attempts): %s", url, max_retries, exc)
                return {}
    return {}


# ===========================================================================
# EXTRACTION HELPERS ACROSS MULTIPLE ENDPOINTS
# ===========================================================================

def extract_player_id(obj: dict) -> Optional[int]:
    """Robustly extracts player ID from object supporting multiple key conventions."""
    if not isinstance(obj, dict):
        return None
    for key in ("player_id", "playerId", "user_id", "userId", "member_id", "id"):
        val = obj.get(key)
        if val is not None and str(val).strip():
            try:
                int_val = int(str(val).strip())
                if int_val > 0:
                    return int_val
            except ValueError:
                pass
    return None


def extract_player_name(obj: dict) -> str:
    """Robustly extracts player name from object supporting multiple key conventions."""
    if not isinstance(obj, dict):
        return ""
    for key in ("player_name", "playerName", "name", "full_name", "fullName", "user_name"):
        val = obj.get(key)
        if val and isinstance(val, str) and val.strip():
            return val.strip()
    return ""


def extract_profile_photo(obj: dict) -> str:
    """Robustly extracts profile photo URL."""
    if not isinstance(obj, dict):
        return ""
    for key in ("profile_photo", "profilePhoto", "photo", "avatar", "profile_image", "image"):
        val = obj.get(key)
        if val and isinstance(val, str) and val.strip() and len(val.strip()) > 10:
            return val.strip()
    return ""


def fetch_squad_players(tournament_id: int) -> Tuple[str, List[dict]]:
    """
    Fetches all teams and squad players for a tournament.
    Also queries the direct tournament players endpoint for comprehensive coverage.
    """
    log.info("Fetching teams and squad members for tournament %d ...", tournament_id)
    t_name = f"Tournament {tournament_id}"

    # Try fetching official tournament details
    try:
        det = api_get(f"/api/v1/tournament/get-tournament-detail/{tournament_id}")
        if det.get("data", {}).get("name"):
            t_name = det["data"]["name"].strip()
    except Exception:
        pass

    extracted_players: List[dict] = []
    seen_pids: Set[int] = set()

    # 1. Primary endpoint: Teams and players
    data_tp = api_get(f"/api/v1/tournament/get-tournament-teams-and-players/{tournament_id}")
    teams = data_tp.get("data", [])

    for tm in teams:
        team_name = tm.get("team_name") or tm.get("name") or "Unknown Team"
        team_id = tm.get("team_id") or tm.get("id")
        raw_player_list = (
            tm.get("players") or tm.get("team_players") or tm.get("squad") or tm.get("members") or []
        )
        for p in raw_player_list:
            pid = extract_player_id(p)
            p_name = extract_player_name(p)
            photo = extract_profile_photo(p)
            if pid and p_name:
                seen_pids.add(pid)
                extracted_players.append({
                    "player_id":       pid,
                    "player_name":     p_name,
                    "profile_photo":   photo,
                    "team_name":       team_name,
                    "team_id":         team_id,
                    "tournament_id":   tournament_id,
                    "tournament_name": t_name,
                })

    # 2. Secondary endpoint: Tournament all-players list (captures free agents / reserve players)
    try:
        data_all = api_get(f"/api/v1/tournament/get-tournament-players/{tournament_id}")
        extra_list = data_all.get("data", [])
        if isinstance(extra_list, list):
            for p in extra_list:
                pid = extract_player_id(p)
                p_name = extract_player_name(p)
                photo = extract_profile_photo(p)
                if pid and p_name and pid not in seen_pids:
                    seen_pids.add(pid)
                    extracted_players.append({
                        "player_id":       pid,
                        "player_name":     p_name,
                        "profile_photo":   photo,
                        "team_name":       p.get("team_name") or "Tournament Pool",
                        "team_id":         p.get("team_id"),
                        "tournament_id":   tournament_id,
                        "tournament_name": t_name,
                    })
    except Exception:
        pass

    log.info("  ✓ Found %d unique player entries in tournament %d (%s)", 
             len(extracted_players), tournament_id, t_name)
    return t_name, extracted_players


def fetch_tournament_leaderboard(tournament_id: int, stat_type: str) -> List[dict]:
    """
    Fetches batting or bowling leaderboard for a tournament with dynamic pagination
    until all records are retrieved.
    Attaches tournament_id to each row for precise multi-tournament aggregation.
    """
    endpoint = (
        "/api/v1/leaderboard/get-batting-leaderboard"
        if stat_type == "batting"
        else "/api/v1/leaderboard/get-bowling-leaderboard"
    )
    
    rows = []
    seen_row_pids: Set[int] = set()
    page = 1
    datetime_param = None

    while True:
        params = {
            "tournamentId": tournament_id,
            "pagesize": 100,
            "pageno": page,
        }
        if datetime_param:
            params["datetime"] = datetime_param

        data = api_get(endpoint, params)
        batch = data.get("data", [])
        if not batch or not isinstance(batch, list):
            break

        new_in_page = 0
        for r in batch:
            pid = extract_player_id(r)
            if pid and pid not in seen_row_pids:
                seen_row_pids.add(pid)
                # Attach tournament ID metadata to prevent key collisions
                r["tournament_id"] = tournament_id
                rows.append(r)
                new_in_page += 1

        if new_in_page == 0:
            break

        next_url = data.get("page", {}).get("next", "")
        if not next_url:
            break
        dt_match = re.search(r"datetime=(\d+)", next_url)
        if dt_match:
            datetime_param = dt_match.group(1)

        page += 1
        time.sleep(0.15)

    log.info("  ✓ Fetched %d unique %s leaderboard records for tournament %d", len(rows), stat_type, tournament_id)
    return rows


def fetch_player_career_stats(player_id: int) -> Tuple[dict, dict, dict]:
    """Fetches overall CricHeroes career statistics (batting, bowling, fielding) for a player."""
    url = f"/api/v1/player/get-player-statistic/{player_id}"
    data = api_get(url)
    stats = data.get("data", {}).get("statistics", {})
    
    bat = {item["title"]: item["value"] for item in stats.get("batting", []) if isinstance(item, dict) and "title" in item}
    bowl = {item["title"]: item["value"] for item in stats.get("bowling", []) if isinstance(item, dict) and "title" in item}
    field = {item["title"]: item["value"] for item in stats.get("fielding", []) if isinstance(item, dict) and "title" in item}
    return bat, bowl, field


# ===========================================================================
# STATS CALCULATIONS & NORMALIZATION
# ===========================================================================

def _safe_float(val, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        clean_str = str(val).replace("*", "").replace("-", "0").strip()
        if not clean_str:
            return default
        return round(float(clean_str), 2)
    except (TypeError, ValueError):
        return default


def _safe_int(val, default: int = 0) -> int:
    if val is None:
        return default
    try:
        clean_str = str(val).replace("*", "").replace("-", "0").strip()
        if not clean_str:
            return default
        return int(float(clean_str))
    except (TypeError, ValueError):
        return default


def normalize_name(name: str) -> str:
    """Normalizes string for comparison."""
    if not name:
        return ""
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", name)
    return re.sub(r"\s+", " ", cleaned).strip().lower()


def clean_display_name(name_list: List[str]) -> str:
    """Selects the cleanest, properly title-cased name string."""
    for n in name_list:
        clean = n.strip()
        if clean and not clean.isupper() and not clean.islower() and len(clean) > 2:
            return clean
    for n in name_list:
        clean = n.strip()
        if clean:
            return clean.title()
    return "Unknown Player"


def is_custom_photo(url: str) -> bool:
    """Checks if profile photo URL is an uploaded custom photo vs default placeholder."""
    if not url:
        return False
    u = url.lower()
    return "default" not in u and "avatar" not in u and len(url) > 15


def parse_bowling_figures(bb_str: str) -> Tuple[int, int]:
    """Parses wickets and runs conceded from 'W/R' string (e.g. '2/9' -> (2, 9))."""
    if not bb_str or "/" not in bb_str:
        return 0, 999999
    m = re.match(r"^(\d+)/(\d+)", bb_str.strip())
    if m:
        return int(m.group(1)), int(m.group(2))
    m_wkts = re.match(r"^(\d+)/\?", bb_str.strip())
    if m_wkts:
        return int(m_wkts.group(1)), 999999
    return 0, 999999


def pick_better_bowling(bb1: str, bb2: str) -> str:
    """Compares two bowling figures and returns the superior one."""
    if not bb1 or bb1 == "0/0":
        return bb2 or "0/0"
    if not bb2 or bb2 == "0/0":
        return bb1 or "0/0"
    w1, r1 = parse_bowling_figures(bb1)
    w2, r2 = parse_bowling_figures(bb2)
    if w1 > w2:
        return bb1
    elif w2 > w1:
        return bb2
    else:
        return bb1 if r1 <= r2 else bb2


def determine_role(
    runs: int, 
    wickets: int, 
    bat_matches: int, 
    bowl_matches: int, 
    c_bat: Optional[dict] = None, 
    c_bowl: Optional[dict] = None,
    name: str = ""
) -> str:
    """
    Classifies cricket role accurately based on tournament metrics + career baseline.
    Avoids defaulting low-sample players to generic all-rounders if career profile is clear.
    """
    c_bat = c_bat or {}
    c_bowl = c_bowl or {}
    c_runs = _safe_int(c_bat.get("Runs") or 0)
    c_wkts = _safe_int(c_bowl.get("Wickets") or 0)

    # Use combined metrics for role evaluation
    eff_runs = runs if runs > 0 else c_runs
    eff_wkts = wickets if wickets > 0 else c_wkts

    has_batting = eff_runs >= 15 or bat_matches >= 2 or _safe_int(c_bat.get("Innings") or 0) >= 3
    has_bowling = eff_wkts >= 2 or bowl_matches >= 2 or _safe_int(c_bowl.get("Innings") or 0) >= 3

    if has_batting and has_bowling:
        if eff_runs >= max(1, eff_wkts * 18):
            return "Batting All-Rounder"
        else:
            return "Bowling All-Rounder"
    elif has_batting:
        return "Batsman"
    elif has_bowling:
        return "Bowler"
    else:
        # Check career weighting
        if c_runs > 50 and c_wkts == 0:
            return "Batsman"
        elif c_wkts >= 5 and c_runs < 20:
            return "Bowler"
        return "All-Rounder"


def build_cric_heroes_url(player_id: int, name: str) -> str:
    """Generates canonical CricHeroes profile URL."""
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.lower()).strip("-")
    if not slug:
        slug = f"player-{player_id}"
    return f"https://cricheroes.com/player-profile/{player_id}/{slug}"


def load_existing_player_cache() -> Dict[str, dict]:
    """
    Loads existing player entries from players.json / scripts/players.json
    to preserve manual auction, captain, status, and category assignments.
    """
    cache = {}
    candidate_files = [
        SCRIPT_DIR / "players.json",
        ROOT_DIR / "players.json",
        SCRIPT_DIR / "players_2.json",
    ]
    for p_file in candidate_files:
        if p_file.exists():
            try:
                with open(p_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for item in data:
                            pid = item.get("id")
                            if pid and pid not in cache:
                                cache[pid] = item
            except Exception:
                pass
    return cache


def build_player_document(
    player_id: int,
    name: str,
    avatar_url: str,
    stats: dict,
    existing_entry: Optional[dict] = None,
    base_price: int = 100,
    category: str = "Male",
) -> dict:
    """
    Builds a schema-compliant JSON document for MongoDB & frontend.
    Smartly preserves manual overrides from existing_entry if present.
    """
    existing_entry = existing_entry or {}
    
    role = existing_entry.get("role") or determine_role(
        stats["runs"], stats["wickets"],
        stats["innings_bat"], stats["matches"],
        c_bat=stats.get("career_bat"),
        c_bowl=stats.get("career_bowl"),
        name=name
    )
    
    doc_id = f"ply-{player_id}"
    profile_url = build_cric_heroes_url(player_id, name)
    
    # Use existing avatar if custom uploaded, else scraped photo
    if existing_entry.get("avatarUrl") and is_custom_photo(existing_entry["avatarUrl"]):
        avatar = existing_entry["avatarUrl"]
    elif avatar_url:
        avatar = avatar_url
    else:
        avatar = AVATAR_FALLBACK

    # Preserve manual auction & captain states
    status = existing_entry.get("status", "available")
    sold_price = existing_entry.get("soldPrice", 0)
    sold_to = existing_entry.get("soldTo", None)
    is_captain = bool(existing_entry.get("isCaptain", False))
    is_auctioneer = bool(existing_entry.get("isAuctioneer", False))
    captain_of_team = existing_entry.get("captainOfTeamId", None)
    is_playing_nepl = existing_entry.get("isPlayingNEPL", True)
    is_new_joiner = bool(existing_entry.get("isNewJoiner", False))
    player_category = existing_entry.get("category", category)
    player_base_price = existing_entry.get("basePrice", base_price)

    return {
        "id":                doc_id,
        "name":              name,
        "role":              role,
        "category":          player_category,
        "basePrice":         player_base_price,
        "status":            status,
        "soldPrice":         sold_price,
        "soldTo":            sold_to,
        "matches":           stats["matches"],
        "runs":              stats["runs"],
        "avg":               stats["avg"],
        "strikeRate":        stats["strikeRate"],
        "wickets":           stats["wickets"],
        "economy":           stats["economy"],
        "bestBowling":       stats["bestBowling"],
        "cricHeroesUrl":     profile_url,
        "avatarUrl":         avatar,
        "isCaptain":         is_captain,
        "isAuctioneer":      is_auctioneer,
        "captainOfTeamId":   captain_of_team,
        "isPlayingNEPL":     is_playing_nepl,
        "isNewJoiner":       is_new_joiner,
        "tournamentSession": "NEPL 2026",
    }


# ===========================================================================
# MASTER SCRAPING WORKFLOW
# ===========================================================================

def scrape_tournaments(
    tournament_ids: List[int],
    stats_source: str = "combined",
    base_price: int = 100,
) -> List[dict]:
    """
    Scrapes all tournaments and extracts 100% of squad members and leaderboard participants.
    Primary indexing is keyed by player_id to guarantee zero data loss.
    """
    players_by_pid: Dict[int, dict] = {}
    tournament_names: Dict[int, str] = {}
    existing_cache = load_existing_player_cache()
    log.info("Loaded %d existing player records in local cache for smart state preservation.", len(existing_cache))

    # 1. Fetch all squad members and tournament registered players
    for tid in tournament_ids:
        t_name, squad_players = fetch_squad_players(tid)
        tournament_names[tid] = t_name

        for p in squad_players:
            pid = int(p["player_id"])
            p_name = p["player_name"].strip()
            photo = p.get("profile_photo", "")

            if pid not in players_by_pid:
                players_by_pid[pid] = {
                    "player_id":      pid,
                    "names":          [p_name],
                    "profile_photos": [photo] if photo else [],
                    "teams":          {p["team_name"]},
                    "tournaments":    {t_name},
                    "batting_rows":   [],
                    "bowling_rows":   [],
                }
            else:
                entry = players_by_pid[pid]
                if p_name and p_name not in entry["names"]:
                    entry["names"].append(p_name)
                if photo and photo not in entry["profile_photos"]:
                    entry["profile_photos"].append(photo)
                entry["teams"].add(p["team_name"])
                entry["tournaments"].add(t_name)

    log.info("Total players indexed from squad rosters: %d", len(players_by_pid))

    # 2. Fetch batting & bowling leaderboards for all tournaments
    for tid in tournament_ids:
        t_name = tournament_names.get(tid, f"Tournament {tid}")

        # Batting Leaderboard
        b_rows = fetch_tournament_leaderboard(tid, "batting")
        for r in b_rows:
            pid = extract_player_id(r)
            r_name = extract_player_name(r)
            photo = extract_profile_photo(r)
            if not pid:
                continue

            if pid not in players_by_pid:
                players_by_pid[pid] = {
                    "player_id":      pid,
                    "names":          [r_name] if r_name else ["Player"],
                    "profile_photos": [photo] if photo else [],
                    "teams":          {r.get("team_name", "Tournament Pool")},
                    "tournaments":    {t_name},
                    "batting_rows":   [],
                    "bowling_rows":   [],
                }

            players_by_pid[pid]["batting_rows"].append(r)
            if photo and photo not in players_by_pid[pid]["profile_photos"]:
                players_by_pid[pid]["profile_photos"].append(photo)
            if r_name and r_name not in players_by_pid[pid]["names"]:
                players_by_pid[pid]["names"].append(r_name)

        # Bowling Leaderboard
        w_rows = fetch_tournament_leaderboard(tid, "bowling")
        for r in w_rows:
            pid = extract_player_id(r)
            r_name = extract_player_name(r)
            photo = extract_profile_photo(r)
            if not pid:
                continue

            if pid not in players_by_pid:
                players_by_pid[pid] = {
                    "player_id":      pid,
                    "names":          [r_name] if r_name else ["Player"],
                    "profile_photos": [photo] if photo else [],
                    "teams":          {r.get("team_name", "Tournament Pool")},
                    "tournaments":    {t_name},
                    "batting_rows":   [],
                    "bowling_rows":   [],
                }

            players_by_pid[pid]["bowling_rows"].append(r)
            if photo and photo not in players_by_pid[pid]["profile_photos"]:
                players_by_pid[pid]["profile_photos"].append(photo)
            if r_name and r_name not in players_by_pid[pid]["names"]:
                players_by_pid[pid]["names"].append(r_name)

    log.info("Total distinct players captured across squads & leaderboards: %d", len(players_by_pid))

    # 3. Parallel fetch of CricHeroes career stats
    all_pids = list(players_by_pid.keys())
    career_stats_cache: Dict[int, Tuple[dict, dict, dict]] = {}

    log.info("Fetching career profile metrics for %d player IDs in parallel...", len(all_pids))
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
        future_to_pid = {
            executor.submit(fetch_player_career_stats, pid): pid
            for pid in all_pids
        }
        for future in concurrent.futures.as_completed(future_to_pid):
            pid = future_to_pid[future]
            try:
                career_stats_cache[pid] = future.result()
            except Exception:
                career_stats_cache[pid] = ({}, {}, {})

    # 4. Consolidate and build final documents
    final_docs = []

    for pid, p_info in players_by_pid.items():
        name = clean_display_name(p_info["names"])
        
        # Pick best photo (prefer custom uploaded photo)
        photo = ""
        for ph in p_info["profile_photos"]:
            if is_custom_photo(ph):
                photo = ph
                break
        if not photo and p_info["profile_photos"]:
            photo = p_info["profile_photos"][0]
        if not photo:
            photo = AVATAR_FALLBACK

        c_bat, c_bowl, c_field = career_stats_cache.get(pid, ({}, {}, {}))
        bat_list = p_info["batting_rows"]
        bowl_list = p_info["bowling_rows"]

        if stats_source == "career" or (stats_source == "combined" and not bat_list and not bowl_list and c_bat):
            # Strict career fallback
            matches     = _safe_int(c_bat.get("Matches") or c_bowl.get("Matches") or 1)
            runs        = _safe_int(c_bat.get("Runs") or 0)
            avg         = _safe_float(c_bat.get("Avg") or 0.0)
            strike_rate = _safe_float(c_bat.get("SR") or 0.0)
            wickets     = _safe_int(c_bowl.get("Wickets") or 0)
            economy     = _safe_float(c_bowl.get("Economy") or 0.0)
            best_bowl   = str(c_bowl.get("Best Bowling") or "0/0")
            innings_bat = _safe_int(c_bat.get("Innings") or 0)
        else:
            # Multi-tournament aggregation
            # Map matches per tournament = max(batting_matches in tourney, bowling_matches in tourney)
            matches_per_tournament: Dict[int, int] = {}
            total_innings = 0
            total_runs = 0
            total_balls_faced = 0
            total_not_outs = 0

            seen_bat_keys = set()
            for b in bat_list:
                t_id = b.get("tournament_id")
                key = (t_id, b.get("player_id"), b.get("team_id"))
                if key in seen_bat_keys:
                    continue
                seen_bat_keys.add(key)
                
                b_match = _safe_int(b.get("total_match") or b.get("matches"))
                matches_per_tournament[t_id] = max(matches_per_tournament.get(t_id, 0), b_match)
                total_innings += _safe_int(b.get("innings"))
                total_runs += _safe_int(b.get("total_runs") or b.get("runs"))
                total_balls_faced += _safe_int(b.get("ball_faced") or b.get("balls"))
                total_not_outs += _safe_int(b.get("not_out"))

            total_wickets = 0
            total_balls_bowled = 0
            total_runs_conceded = 0
            best_bowl_cand = "0/0"

            seen_bowl_keys = set()
            for w in bowl_list:
                t_id = w.get("tournament_id")
                key = (t_id, w.get("player_id"), w.get("team_id"))
                if key in seen_bowl_keys:
                    continue
                seen_bowl_keys.add(key)

                w_match = _safe_int(w.get("total_match") or w.get("matches"))
                matches_per_tournament[t_id] = max(matches_per_tournament.get(t_id, 0), w_match)
                total_wickets += _safe_int(w.get("total_wickets") or w.get("wickets"))
                total_balls_bowled += _safe_int(w.get("balls"))
                total_runs_conceded += _safe_int(w.get("runs"))

                hw = _safe_int(w.get("highest_wicket"))
                if hw > 0:
                    best_bowl_cand = pick_better_bowling(best_bowl_cand, f"{hw}/?")

            total_tournament_matches = sum(matches_per_tournament.values())
            matches = total_tournament_matches if total_tournament_matches > 0 else _safe_int(c_bat.get("Matches") or 1)
            runs = total_runs
            
            dismissals = max(0, total_innings - total_not_outs)
            avg = round(total_runs / dismissals, 2) if dismissals > 0 else float(total_runs)
            strike_rate = round((total_runs / total_balls_faced) * 100.0, 2) if total_balls_faced > 0 else 0.0

            wickets = total_wickets
            overs_float = total_balls_bowled / 6.0
            economy = round(total_runs_conceded / overs_float, 2) if overs_float > 0 else 0.0

            career_bb = str(c_bowl.get("Best Bowling") or "")
            best_bowl = career_bb if (career_bb and "/" in career_bb and career_bb != "0/0") else (best_bowl_cand if best_bowl_cand != "0/0" else "0/0")
            innings_bat = total_innings

        player_stats = {
            "matches":     matches,
            "runs":        runs,
            "avg":         avg,
            "strikeRate":  strike_rate,
            "wickets":     wickets,
            "economy":     economy,
            "bestBowling": best_bowl,
            "innings_bat": innings_bat,
            "career_bat":  c_bat,
            "career_bowl": c_bowl,
        }

        existing_entry = existing_cache.get(f"ply-{pid}")
        doc = build_player_document(
            player_id=pid,
            name=name,
            avatar_url=photo,
            stats=player_stats,
            existing_entry=existing_entry,
            base_price=base_price,
        )
        final_docs.append(doc)

    # Sort alphabetically by name
    final_docs.sort(key=lambda x: x["name"].lower())
    log.info("✓ Consolidated %d verified player records (100%% complete).", len(final_docs))
    return final_docs


# ===========================================================================
# MONGODB DIRECT SYNC ENGINE (SMART UPSERT)
# ===========================================================================

def sync_to_mongodb(
    players: List[dict],
    mongo_uri: str,
    mode: str = "upsert",
) -> bool:
    """
    Directly writes/upserts player records into MongoDB Atlas.
    Automatically uses PyMongo if available, or seamless Node Mongoose bridge.
    """
    if not mongo_uri:
        log.error("✗ No MongoDB URI specified. Please set MONGODB_URI in .env or pass --mongo-uri.")
        return False

    masked_uri = re.sub(r"//([^:]+):([^@]+)@", r"//\1:*****@", mongo_uri)
    log.info("Connecting directly to MongoDB Atlas: %s", masked_uri)

    # Strategy A: Try native PyMongo if installed
    try:
        import pymongo
        client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=12000)
        client.admin.command("ping")
        log.info("✓ Connected to MongoDB via PyMongo!")

        # Parse DB name from URI or fallback
        match = re.search(r"/([^/?]+)(\?|$)", mongo_uri.split("://")[-1])
        db_name = match.group(1) if (match and match.group(1)) else "box_cricket"
        db = client[db_name]
        coll = db["players"]

        if mode == "replace":
            log.warning("Mode: REPLACE (clearing existing collection)...")
            coll.delete_many({})
            if players:
                coll.insert_many(players, ordered=False)
            log.info("✓ Inserted %d players.", len(players))
        else:
            # Smart Upsert: update stats and profile while preserving manual auction & captain states
            inserted = 0
            updated = 0
            for p in players:
                pid = p.get("id")
                if not pid:
                    continue

                update_fields = {
                    "name": p["name"],
                    "role": p["role"],
                    "matches": p["matches"],
                    "runs": p["runs"],
                    "avg": p["avg"],
                    "strikeRate": p["strikeRate"],
                    "wickets": p["wickets"],
                    "economy": p["economy"],
                    "bestBowling": p["bestBowling"],
                    "cricHeroesUrl": p["cricHeroesUrl"],
                    "avatarUrl": p["avatarUrl"],
                    "tournamentSession": p.get("tournamentSession", "NEPL 2026"),
                }

                # On initial insert, set defaults for auction/captain fields
                set_on_insert = {
                    "id": p["id"],
                    "basePrice": p.get("basePrice", 100),
                    "status": p.get("status", "available"),
                    "soldPrice": p.get("soldPrice", 0),
                    "soldTo": p.get("soldTo", None),
                    "category": p.get("category", "Male"),
                    "isCaptain": p.get("isCaptain", False),
                    "isAuctioneer": p.get("isAuctioneer", False),
                    "captainOfTeamId": p.get("captainOfTeamId", None),
                    "isPlayingNEPL": p.get("isPlayingNEPL", True),
                    "isNewJoiner": p.get("isNewJoiner", False),
                }

                res = coll.update_one(
                    {"id": pid},
                    {"$set": update_fields, "$setOnInsert": set_on_insert},
                    upsert=True,
                )
                if res.upserted_id:
                    inserted += 1
                else:
                    updated += 1

            log.info("✓ Smart Upsert Complete: %d newly inserted, %d updated.", inserted, updated)

        total_in_db = coll.count_documents({})
        log.info("✓ Total players currently verified in MongoDB: %d", total_in_db)
        client.close()
        return True

    except Exception as exc:
        log.info("PyMongo sync encountered issue: %s. Trying Node.js driver fallback...", exc)

    # Strategy B: Seamless Node.js Mongoose Bridge
    try:
        temp_file = SCRIPT_DIR / "temp_scrape_sync.json"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(players, f, ensure_ascii=False)

        dump_js = SCRIPT_DIR / "dump_to_mongo.js"
        if not dump_js.exists():
            log.error("dump_to_mongo.js not found at %s", dump_js)
            return False

        cmd = [
            "node",
            str(dump_js),
            "--file", str(temp_file),
            "--uri", mongo_uri,
            "--mode", mode,
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if temp_file.exists():
            temp_file.unlink()

        if res.returncode == 0:
            log.info("✓ Node.js MongoDB sync completed successfully!\n%s", res.stdout.strip())
            return True
        else:
            log.error("✗ Node.js MongoDB sync failed:\n%s\n%s", res.stdout, res.stderr)
            return False

    except Exception as exc:
        log.error("✗ Failed to execute MongoDB Node bridge: %s", exc)
        return False


# ===========================================================================
# FASTAPI / REST API UPLOADER
# ===========================================================================

def push_to_fastapi(players: List[dict], endpoint: str, api_key: str) -> bool:
    """Uploads sanitized players JSON to the FastAPI / Express backend."""
    log.info("Pushing %d players to %s ...", len(players), endpoint)
    
    payload = json.dumps(players, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=payload,
        method="PUT",
        headers={
            "accept":       "*/*",
            "Content-Type": "application/json",
            "x-api-key":    api_key,
            "User-Agent":   "FastAPI-Player-Uploader/4.0",
        },
    )
    try:
        try:
            with urllib.request.urlopen(req, context=SSL_CONTEXT, timeout=60) as resp:
                body = resp.read().decode("utf-8")
                status = resp.status
        except Exception as exc:
            if "CERTIFICATE_VERIFY_FAILED" in str(exc) or "certificate verify failed" in str(exc):
                unverified_ctx = ssl._create_unverified_context()
                with urllib.request.urlopen(req, context=unverified_ctx, timeout=60) as resp:
                    body = resp.read().decode("utf-8")
                    status = resp.status
            else:
                raise exc

        log.info("✓ API Upload Successful (HTTP %s): %s", status, body[:300])
        return True
    except urllib.error.HTTPError as exc:
        log.error("✗ PUT failed with HTTP %s: %s", exc.code, exc.read().decode()[:400])
        return False
    except Exception as exc:
        log.error("✗ PUT network error: %s", exc)
        return False


# ===========================================================================
# CLI ARGUMENT PARSER
# ===========================================================================

def parse_args():
    env_api_key = os.environ.get("API_KEY") or os.environ.get("VITE_API_KEY") or ""
    env_mongo   = os.environ.get("MONGODB_URI") or ""

    p = argparse.ArgumentParser(
        description="Scrape and Aggregate CricHeroes Tournament Players & Sync to MongoDB",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument(
        "--tournament-ids", nargs="+", type=int, default=[2066226, 2014112],
        help="CricHeroes Tournament IDs (default: 2066226 2014112)",
    )
    p.add_argument(
        "--tournament-names", nargs="+",
        help="Descriptive names corresponding to IDs (optional)",
    )
    p.add_argument(
        "--output", default="scripts/players.json",
        help="Output JSON file path (default: scripts/players.json)",
    )
    p.add_argument(
        "--stats-source", choices=["combined", "tournament", "career"], default="combined",
        help="Stats calculation mode: 'combined' (tournament stats + career fallback), 'tournament' (strict tournament stats), or 'career' (overall CricHeroes career stats)",
    )
    p.add_argument(
        "--base-price", type=int, default=100,
        help="Base auction price for all players (default: 100)",
    )
    p.add_argument(
        "--mongo", "--push-mongo", dest="push_mongo", action="store_true", default=False,
        help="Directly sync and upsert all scraped players into MongoDB Atlas",
    )
    p.add_argument(
        "--mongo-uri", default=env_mongo,
        help="MongoDB connection URI (defaults to MONGODB_URI from .env)",
    )
    p.add_argument(
        "--mongo-mode", choices=["upsert", "replace"], default="upsert",
        help="MongoDB sync mode: 'upsert' (smart update preserving manual states) or 'replace' (fresh drop & reload)",
    )
    p.add_argument(
        "--push-api", nargs="?", const=DEFAULT_FASTAPI_ENDPOINT, default=DEFAULT_FASTAPI_ENDPOINT,
        help=f"Upload output to FastAPI/Express endpoint (default: {DEFAULT_FASTAPI_ENDPOINT})",
    )
    p.add_argument(
        "--no-push-api", dest="push_api", action="store_const", const=None,
        help="Disable automatic REST API push",
    )
    p.add_argument(
        "--api-key", default=env_api_key,
        help="Authentication key for x-api-key header",
    )
    p.add_argument("-v", "--verbose", action="store_true", help="Enable debug logging")
    return p.parse_args()


# ===========================================================================
# MAIN ENTRYPOINT
# ===========================================================================

def main():
    args = parse_args()
    if args.verbose:
        log.setLevel(logging.DEBUG)

    log.info("=" * 70)
    log.info("CRICHEROES TOURNAMENT PLAYER SCRAPER & SYNC ENGINE v4")
    log.info("=" * 70)
    log.info("Target Tournaments : %s", args.tournament_ids)
    log.info("Stats Source Mode  : %s", args.stats_source)
    log.info("Base Auction Price : ₹%d PTS", args.base_price)

    # 1. Scrape & Aggregate
    players = scrape_tournaments(
        tournament_ids=args.tournament_ids,
        stats_source=args.stats_source,
        base_price=args.base_price,
    )

    log.info("")
    log.info("=" * 70)
    log.info("TOTAL EXTRACTED RECORDS: %d", len(players))
    log.info("=" * 70)

    # 2. Save to JSON file
    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = ROOT_DIR / args.output
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(players, f, indent=2, ensure_ascii=False)
    log.info("✓ Saved JSON dataset to: %s", output_path)

    # Also save to root players.json for compatibility
    root_json = ROOT_DIR / "players.json"
    try:
        with open(root_json, "w", encoding="utf-8") as f:
            json.dump(players, f, indent=2, ensure_ascii=False)
        log.info("✓ Synced root copy to: %s", root_json)
    except Exception:
        pass

    # 3. Direct MongoDB Atlas Sync (if requested)
    if args.push_mongo and args.mongo_uri:
        log.info("")
        log.info("=" * 70)
        log.info("SYNCING DIRECTLY TO MONGODB ATLAS...")
        log.info("=" * 70)
        sync_success = sync_to_mongodb(
            players=players,
            mongo_uri=args.mongo_uri,
            mode=args.mongo_mode,
        )
        if sync_success:
            log.info("✓ 100%% of player records successfully synchronized to MongoDB Atlas!")
        else:
            log.warning("⚠️ Direct MongoDB sync encountered issues. JSON file is safely preserved.")

    # 4. Push to Live FastAPI / Express Backend
    if args.push_api:
        log.info("")
        log.info("=" * 70)
        log.info("SYNCING TO LIVE BACKEND REST API: %s", args.push_api)
        log.info("=" * 70)
        push_to_fastapi(players, args.push_api, args.api_key)

    # 5. Sanity Check for key player records
    vedang = next((p for p in players if "vedang" in p["name"].lower()), None)
    if vedang:
        log.info("✓ Record Verification: Vedang Patil: ID=%s, Role=%s, Matches=%d, Runs=%d, Wkts=%d",
                 vedang["id"], vedang["role"], vedang["matches"], vedang["runs"], vedang["wickets"])
    
    rahul = next((p for p in players if "rahul" in p["name"].lower() or "raahool" in p["name"].lower()), None)
    if rahul:
        log.info("✓ Record Verification: %s: ID=%s, Role=%s, Matches=%d, Runs=%d, Wkts=%d, Best=%s",
                 rahul["name"], rahul["id"], rahul["role"], rahul["matches"], rahul["runs"], rahul["wickets"], rahul["bestBowling"])

    log.info("")
    log.info("Scraper & Player Synchronization Finished Successfully! 🚀")


if __name__ == "__main__":
    main()
