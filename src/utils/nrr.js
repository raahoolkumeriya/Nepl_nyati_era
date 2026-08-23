/**
 * Calculates Net Run Rate (NRR) and updates team standings table.
 * Standard Cricket NRR = (Total Runs Scored / Total Decimal Overs Faced) - (Total Runs Conceded / Total Decimal Overs Bowled)
 */

export function oversToBalls(ov) {
  if (!ov || isNaN(ov)) return 0;
  const wholeOvers = Math.floor(ov);
  const fractionalPart = Math.round((ov - wholeOvers) * 10);
  const balls = Math.min(5, Math.max(0, fractionalPart));
  return wholeOvers * 6 + balls;
}

export function ballsToOversDisplay(balls) {
  if (!balls || balls <= 0) return '0.0';
  const ov = Math.floor(balls / 6);
  const b = balls % 6;
  return `${ov}.${b}`;
}

export function ballsToDecimalOvers(balls) {
  if (!balls || balls <= 0) return 0;
  return balls / 6;
}

export function calculateNRR(runsScored, oversFacedBalls, runsConceded, oversBowledBalls) {
  const decFaced = typeof oversFacedBalls === 'number' && oversFacedBalls > 50
    ? oversFacedBalls / 6
    : ballsToDecimalOvers(oversFacedBalls);

  const decBowled = typeof oversBowledBalls === 'number' && oversBowledBalls > 50
    ? oversBowledBalls / 6
    : ballsToDecimalOvers(oversBowledBalls);

  if (decFaced === 0 || decBowled === 0) return 0;

  const battingRR = runsScored / decFaced;
  const bowlingRR = runsConceded / decBowled;

  return parseFloat((battingRR - bowlingRR).toFixed(3));
}

export function sortStandings(teams) {
  return [...teams].sort((a, b) => {
    // 1. Total Points
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    // 2. Net Run Rate (NRR)
    if (Math.abs(b.nrr - a.nrr) > 0.0001) {
      return b.nrr - a.nrr;
    }
    // 3. Most Wins
    if (b.won !== a.won) {
      return b.won - a.won;
    }
    // 4. Total Runs Scored
    return (b.runsScored || 0) - (a.runsScored || 0);
  });
}
