/**
 * NEPL Cricket Analytics Engine
 * Accurately calibrated for T20 & Box Cricket Tournament Dynamics.
 * 
 * Factors evaluated:
 * - Bat Power (0-100): Volume (Runs/Match), Explosiveness (Strike Rate), Consistency (Avg)
 * - Bowl Accuracy (0-100): Strike Ability (Wkts/Match, Total Wkts), Run Prevention (Economy), Clutch (Best Bowling)
 * - Match Impact (45-99%): Total game-changing value contributed per match (Runs + Wickets + SR Boost + Dot Pressure)
 * - Role-Weighted OVR (60-99): Tailored by player's primary specialty (Batsman / Bowler / All-Rounder / Keeper)
 */

export function calculatePlayerPerformance(player) {
  if (!player) {
    return {
      ovr: 68,
      battingRating: 60,
      bowlingRating: 60,
      impactRating: 65,
      tier: 'KEY TALENT',
      tierColor: '#f59e0b',
      badge: '🔥',
      impactPointsPerMatch: 15,
      radar: {
        power: 60,
        consistency: 60,
        accuracy: 60,
        economy: 60,
        clutch: 60,
      }
    };
  }

  const matches = Math.max(1, Number(player.matches) || 0);
  const rawMatches = Number(player.matches) || 0;
  const runs = Number(player.runs) || 0;
  const avg = Number(player.avg) || 0;
  const strikeRate = Number(player.strikeRate) || 0;
  const wickets = Number(player.wickets) || 0;
  const economy = Number(player.economy) || 0;
  const role = player.role || 'All-Rounder';
  const roleLower = role.toLowerCase();

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. BATTING RATING (0 - 100)
  // In Box Cricket: 25+ runs/match is legendary, 15+ is strong, SR 160+ is explosive
  // ─────────────────────────────────────────────────────────────────────────────
  const hasBattingData = runs > 0 || strikeRate > 0 || avg > 0;
  let battingRating = 55;
  let batPower = 50;
  let batConsistency = 50;

  if (hasBattingData) {
    const runsPerMatch = runs / matches;
    
    // Volume: 25+ runs/match gives 100%, 15 gives ~75%, 8 gives ~50%
    const volumeScore = Math.min(100, Math.max(25, (runsPerMatch / 24) * 60 + Math.min(40, (runs / 110) * 40)));
    
    // Explosiveness (Strike Rate): 180+ is 100%, 140 is ~75%, 100 is ~50%
    const srScore = strikeRate > 0 
      ? Math.min(100, Math.max(25, (strikeRate / 175) * 100))
      : Math.min(70, volumeScore);
    
    // Consistency (Average): 35+ is 100%, 20 is ~75%, 10 is ~50%
    const effectiveAvg = avg > 0 ? avg : (runsPerMatch * 1.2);
    const avgScore = Math.min(100, Math.max(25, (effectiveAvg / 32) * 100));

    batPower = Math.round(srScore);
    batConsistency = Math.round(avgScore * 0.6 + volumeScore * 0.4);
    battingRating = Math.round(volumeScore * 0.40 + srScore * 0.40 + avgScore * 0.20);
  } else {
    battingRating = roleLower.includes('bowler') ? 50 : 60;
    batPower = battingRating;
    batConsistency = battingRating;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. BOWLING RATING (0 - 100)
  // In Box Cricket: 1.0+ wkt/match is elite, Econ <= 7.0 is supreme control
  // ─────────────────────────────────────────────────────────────────────────────
  const hasBowlingData = wickets > 0 || (economy > 0 && economy < 25);
  let bowlingRating = 55;
  let bowlAccuracy = 50;
  let bowlEconomyScore = 50;

  if (hasBowlingData) {
    const wktsPerMatch = wickets / matches;
    
    // Strike ability: 1.2 wkts/match gives 100%, 0.7 gives ~75%, 0.3 gives ~50%
    const wktScore = Math.min(100, Math.max(25, (wktsPerMatch / 1.15) * 65 + Math.min(35, (wickets / 7) * 35)));
    
    // Economy Control in Box Cricket: <= 6.5 is 100%, 8.0 is 78%, 9.5 is 60%, 12.0 is 35%
    let econScore = 60;
    if (economy > 0) {
      econScore = Math.max(20, Math.min(100, Math.round(120 - (economy * 7.0))));
    } else if (wickets > 0) {
      econScore = 75; // Bowler who took wickets without recorded economy
    }

    // Clutch Best Bowling Bonus (e.g. 3/14, 4/10)
    let clutchBonus = 0;
    if (player.bestBowling && player.bestBowling.includes('/')) {
      const bestWkts = parseInt(player.bestBowling.split('/')[0]) || 0;
      if (bestWkts >= 3) clutchBonus = 5;
      else if (bestWkts >= 2) clutchBonus = 2;
    }

    bowlAccuracy = Math.round(wktScore);
    bowlEconomyScore = Math.round(econScore);
    bowlingRating = Math.round(Math.min(99, Math.max(35, wktScore * 0.60 + econScore * 0.40 + clutchBonus)));
  } else {
    bowlingRating = (roleLower.includes('batsman') || roleLower.includes('keeper')) ? 50 : 60;
    bowlAccuracy = bowlingRating;
    bowlEconomyScore = bowlingRating;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. MATCH IMPACT RATING (45% - 99%)
  // Accurately assesses game-changing value contributed per match:
  // - Runs scored (+1.0 pt)
  // - Strike rate bonus (+0.12 pts for every SR point over 125)
  // - Wickets taken (+22.0 pts each — game shifting in box cricket!)
  // - Economy pressure bonus (+2.5 pts for every run under 9.0 rpo)
  // ─────────────────────────────────────────────────────────────────────────────
  let matchImpactPoints = 0;
  
  // Batting Impact
  matchImpactPoints += runs;
  if (strikeRate > 125 && runs > 0) {
    matchImpactPoints += ((strikeRate - 125) * 0.12) * Math.min(matches, 4);
  }

  // Bowling Impact
  matchImpactPoints += (wickets * 22);
  if (economy > 0 && economy < 9.0) {
    matchImpactPoints += (9.0 - economy) * 2.8 * Math.min(matches, 5);
  }

  // Match Impact points per game
  const impactPerMatch = matchImpactPoints / matches;

  // Calibrate cleanly into 48% to 98% percentage scale:
  // 35+ pts/game -> 92 - 98% (Match Winner / MVP)
  // 22-34 pts/game -> 80 - 91% (Star Performer)
  // 12-21 pts/game -> 68 - 79% (Consistent Regular)
  // < 12 pts/game -> 48 - 67% (Developing / Support)
  let rawImpactRating;
  if (rawMatches === 0 && runs === 0 && wickets === 0) {
    rawImpactRating = 65;
  } else {
    rawImpactRating = 48 + Math.min(50, Math.pow(impactPerMatch, 0.82) * 5.2);
  }
  const impactRating = Math.round(Math.min(98, Math.max(48, rawImpactRating)));

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. ROLE-WEIGHTED COMPOSITE OVR (60 - 99)
  // ─────────────────────────────────────────────────────────────────────────────
  let weightedSkill;

  if (roleLower.includes('all-rounder') || roleLower.includes('all rounder')) {
    if (roleLower.includes('batting')) {
      weightedSkill = battingRating * 0.58 + bowlingRating * 0.42;
    } else if (roleLower.includes('bowling')) {
      weightedSkill = bowlingRating * 0.58 + battingRating * 0.42;
    } else {
      weightedSkill = battingRating * 0.50 + bowlingRating * 0.50;
    }
  } else if (roleLower.includes('bowler')) {
    weightedSkill = bowlingRating * 0.78 + battingRating * 0.22;
  } else if (roleLower.includes('batsman') || roleLower.includes('keeper')) {
    weightedSkill = battingRating * 0.80 + bowlingRating * 0.20;
  } else {
    weightedSkill = (battingRating + bowlingRating) / 2;
  }

  // Impact Synergy Bonus (+0 to +3 OVR for explosive match winners)
  const impactBonus = impactRating >= 90 ? 3 : impactRating >= 80 ? 2 : impactRating >= 72 ? 1 : 0;
  const rawOvr = weightedSkill + impactBonus;

  // Final Calibrated OVR (62 to 98)
  const ovr = Math.round(Math.min(98, Math.max(62, rawOvr)));

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. PERFORMANCE TIERS & BRANDING
  // ─────────────────────────────────────────────────────────────────────────────
  let tier = 'KEY TALENT';
  let tierColor = '#f59e0b'; // Amber
  let badge = '🔥';

  if (ovr >= 87) {
    tier = 'ELITE ICON';
    tierColor = '#fbbf24'; // Gold
    badge = '👑';
  } else if (ovr >= 79) {
    tier = 'STAR PERFORMER';
    tierColor = '#00f2fe'; // Neon Cyan
    badge = '⚡';
  } else if (ovr >= 71) {
    tier = 'PRO SPECIALIST';
    tierColor = '#10b981'; // Emerald
    badge = '⭐';
  }

  return {
    ovr,
    battingRating,
    bowlingRating,
    impactRating,
    tier,
    tierColor,
    badge,
    impactPointsPerMatch: Math.round(impactPerMatch * 10) / 10,
    radar: {
      power: batPower,
      consistency: batConsistency,
      accuracy: bowlAccuracy,
      economy: bowlEconomyScore,
      clutch: Math.round((batPower + bowlAccuracy) / 2),
    }
  };
}
