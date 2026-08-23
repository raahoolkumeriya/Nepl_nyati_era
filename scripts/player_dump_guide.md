# CricHeroes Tournament Player Scraper & Data Upload Guide

Complete guide for scraping tournament player statistics from **CricHeroes** and writing the dataset to the **FastAPI backend** (`PUT https://nepl-nyati-era.onrender.com/api/players`) and/or **MongoDB**.

---

## 📋 Verified Tournament IDs

| Tournament Name | CricHeroes Tournament ID | Teams | Squad Size |
| :--- | :--- | :--- | :--- |
| **Era Weekend Tournament June 2026** | `2066226` | 6 teams | 48 players |
| **NEPL 2026 Summer Season** | `2014112` | 10 teams | 126 players |
| **Combined Unique Players** | — | 16 teams | **133 unique players** |

---

## 🚀 How to Run the Scraper

### Method 1: Scrape & Directly Push to Live Backend in 1 Step (Recommended)
```bash
python3 scripts/scrap_cricheroes.py \
  --tournament-ids 2066226 2014112 \
  --push-api https://nepl-nyati-era.onrender.com/api/players
```

### Method 2: Scrape to `players.json` File
```bash
python3 scripts/scrap_cricheroes.py \
  --tournament-ids 2066226 2014112 \
  --tournament-names "Era Weekend Tournament June 2026" "NEPL 2026 Summer Season" \
  --output players.json
```

### Method 3: Upload Existing `players.json` File to FastAPI
```bash
python3 scripts/push_to_fastapi.py --file players.json
```

---

## ⚙️ Calculation & Aggregation Features in v2

1. **Complete Squad Extraction**: Discovers all registered players in all teams from `/api/v1/tournament/get-tournament-teams-and-players/{id}`.
2. **Multi-Tournament Aggregation**: Players participating in both tournaments (e.g. Rahul Kumeriya) have their runs, innings, balls faced, wickets, and overs properly aggregated across all tournaments.
3. **Accurate Cricket Metrics**:
   - `avg`: `total_runs / (innings - not_outs)`
   - `strikeRate`: `(total_runs / balls_faced) * 100`
   - `economy`: `runs_conceded / (balls_bowled / 6.0)`
   - `bestBowling`: Formatted as `W/R` (e.g. `1/3`, `4/20`, `2/2`).
4. **Role Classification**: Classifies players dynamically into `Batsman`, `Bowler`, `Batting All-Rounder`, `Bowling All-Rounder`, or `All-Rounder`.
5. **Direct API Authentication**: Sends the required `x-api-key` header automatically from environment variables (`API_KEY` or `VITE_API_KEY`).

---

## 📄 Sample Output Record

```json
{
  "id": "ply-48705741",
  "name": "Raahool Kumeriya",
  "role": "Batting All-Rounder",
  "category": "Male",
  "basePrice": 100,
  "status": "available",
  "soldPrice": 0,
  "soldTo": null,
  "matches": 6,
  "runs": 83,
  "avg": 13.83,
  "strikeRate": 127.69,
  "wickets": 4,
  "economy": 5.73,
  "bestBowling": "1/3",
  "cricHeroesUrl": "https://cricheroes.com/player-profile/48705741/raahool-kumeriya",
  "avatarUrl": "https://media.cricheroes.in/user_profile/1778516347989_OVeF1YAea5YG.jpeg"
}
```

---

## 🛠️ CLI Options Reference

| Option | Default | Description |
| :--- | :--- | :--- |
| `--tournament-ids` | `2066226 2014112` | Tournament IDs to scrape |
| `--stats-source` | `combined` | `combined` (aggregated tournament stats + career fallback), `tournament` (tournament stats only), or `career` (career box cricket stats) |
| `--base-price` | `100` | Base starting auction price |
| `--output` | `players.json` | Output JSON file destination |
| `--push-api` | `None` (or `https://nepl-nyati-era.onrender.com/api/players`) | Upload results directly to FastAPI backend |
| `--api-key` | `.env` key | Custom `x-api-key` authorization value |
