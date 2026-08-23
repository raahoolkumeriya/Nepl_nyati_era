#!/usr/bin/env python3
"""
FastAPI / Backend Player Data Uploader
======================================
Uploads scraped player data from JSON to the backend API endpoint:
  PUT https://nepl-nyati-era.onrender.com/api/players

Authentication:
  Includes 'x-api-key' header automatically from .env (API_KEY / VITE_API_KEY)
  or via --api-key CLI argument.

Usage:
  python3 scripts/push_to_fastapi.py
  python3 scripts/push_to_fastapi.py --file players.json
  python3 scripts/push_to_fastapi.py --api-key TTBPq1o0KhaMicvxAvuyT3Q23qr51XgabEorbqA-kwo
"""

import argparse
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path

def get_ssl_context() -> ssl.SSLContext:
    """Returns an SSL context with automatic fallback for macOS Python."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        pass
    return ssl._create_unverified_context()

SSL_CONTEXT = get_ssl_context()

DEFAULT_ENDPOINT = os.environ.get("BACKEND_URL") or "https://nepl-nyati-era.onrender.com/api/players"
DEFAULT_API_KEY = ""

# Exact fields expected by FastAPI / MongoDB model
ALLOWED_FIELDS = {
    "id", "name", "role", "category", "basePrice", "status",
    "soldPrice", "soldTo", "matches", "runs", "avg", "strikeRate",
    "wickets", "economy", "bestBowling", "cricHeroesUrl", "avatarUrl",
    "isCaptain", "isAuctioneer", "captainOfTeamId", "isPlayingNEPL",
    "isNewJoiner", "tournamentSession"
}

def load_dotenv(dotenv_path: Path):
    """Simple .env file parser."""
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

def parse_args():
    script_dir = Path(__file__).resolve().parent
    root_dir = script_dir.parent
    load_dotenv(root_dir / ".env")

    env_api_key = os.environ.get("API_KEY") or os.environ.get("VITE_API_KEY") or ""

    p = argparse.ArgumentParser(description="Push player JSON data to backend endpoint")
    p.add_argument(
        "-f", "--file",
        default="players.json",
        help="Path to players JSON file (default: players.json or players_output.json)",
    )
    p.add_argument(
        "-e", "--endpoint",
        default=DEFAULT_ENDPOINT,
        help=f"Target backend endpoint URL (default: {DEFAULT_ENDPOINT})",
    )
    p.add_argument(
        "-k", "--api-key",
        default=env_api_key,
        help="API Key for x-api-key header (default: loaded from API_KEY/VITE_API_KEY in .env)",
    )
    p.add_argument(
        "--keep-extra",
        action="store_true",
        help="Keep extra metadata fields (like _source) instead of filtering to schema fields",
    )
    return p.parse_args()

def resolve_file(filepath: str) -> Path:
    p = Path(filepath)
    if p.is_absolute() and p.exists():
        return p
    
    script_dir = Path(__file__).resolve().parent
    root_dir = script_dir.parent
    
    candidates = [
        Path.cwd() / filepath,
        Path.cwd() / "players_output.json",
        root_dir / filepath,
        root_dir / "players_output.json",
        script_dir / filepath,
        script_dir / "players_output.json",
        Path("/tmp/test_players_output.json"),
    ]
    for c in candidates:
        if c.exists() and c.is_file():
            return c
    return p

def sanitize_player(p: dict, keep_extra: bool = False) -> dict:
    """Ensure all required fields exist and types are correct."""
    if keep_extra:
        return p
    
    cleaned = {k: v for k, v in p.items() if k in ALLOWED_FIELDS}
    
    cleaned.setdefault("category", "Male")
    cleaned.setdefault("basePrice", 100)
    cleaned.setdefault("status", "available")
    cleaned.setdefault("soldPrice", 0)
    cleaned.setdefault("soldTo", None)
    cleaned.setdefault("matches", 0)
    cleaned.setdefault("runs", 0)
    cleaned.setdefault("avg", 0.0)
    cleaned.setdefault("strikeRate", 0.0)
    cleaned.setdefault("wickets", 0)
    cleaned.setdefault("economy", 0.0)
    cleaned.setdefault("bestBowling", "0/0")
    cleaned.setdefault("avatarUrl", "/avatars/male.png")
    
    return cleaned

def main():
    args = parse_args()
    file_path = resolve_file(args.file)

    if not file_path.exists():
        print(f"\033[31m[ERROR]\033[0m File not found: {args.file}")
        print("Please run `python3 scripts/scrape_cricheroes.py` first to generate player data.")
        sys.exit(1)

    print(f"\033[36m[INFO]\033[0m Reading players from: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    players = raw_data if isinstance(raw_data, list) else raw_data.get("players", [raw_data])
    print(f"\033[36m[INFO]\033[0m Loaded {len(players)} player record(s).")

    if not players:
        print("\033[33m[WARN]\033[0m No players to upload. Exiting.")
        sys.exit(0)

    # Sanitize players
    payload_data = [sanitize_player(p, args.keep_extra) for p in players]
    payload_bytes = json.dumps(payload_data, ensure_ascii=False).encode("utf-8")

    masked_key = (args.api_key[:6] + "..." + args.api_key[-4:]) if len(args.api_key) > 10 else "***"
    print(f"\033[36m[INFO]\033[0m Target Endpoint: {args.endpoint}")
    print(f"\033[36m[INFO]\033[0m Using x-api-key: {masked_key}")
    print(f"\033[36m[INFO]\033[0m Payload size: {len(payload_bytes)} bytes ({len(payload_data)} players)")

    headers = {
        "accept": "*/*",
        "Content-Type": "application/json",
        "User-Agent": "FastAPI-Player-Uploader/1.0",
    }
    if args.api_key:
        headers["x-api-key"] = args.api_key

    req = urllib.request.Request(
        args.endpoint,
        data=payload_bytes,
        method="PUT",
        headers=headers,
    )

    try:
        try:
            with urllib.request.urlopen(req, context=SSL_CONTEXT, timeout=60) as resp:
                status_code = resp.status
                body = resp.read().decode("utf-8")
        except Exception as exc:
            if "CERTIFICATE_VERIFY_FAILED" in str(exc) or "certificate verify failed" in str(exc):
                unverified_ctx = ssl._create_unverified_context()
                with urllib.request.urlopen(req, context=unverified_ctx, timeout=60) as resp:
                    status_code = resp.status
                    body = resp.read().decode("utf-8")
            else:
                raise exc

        print(f"\033[32m[SUCCESS]\033[0m Upload successful! (HTTP {status_code})")
        if body:
            try:
                parsed_body = json.loads(body)
                print("Response:", json.dumps(parsed_body, indent=2)[:500])
            except Exception:
                print("Response:", body[:300])
    except urllib.error.HTTPError as exc:
        print(f"\033[31m[ERROR]\033[0m Request failed with HTTP {exc.code}: {exc.reason}")
        try:
            err_body = exc.read().decode("utf-8")
            print("Server error response:", err_body[:500])
        except Exception:
            pass
        sys.exit(1)
    except Exception as exc:
        print(f"\033[31m[ERROR]\033[0m Network error: {exc}")
        sys.exit(1)

if __name__ == "__main__":
    main()
