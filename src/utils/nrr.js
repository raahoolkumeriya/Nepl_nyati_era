/**
 * Calculates Net Run Rate (NRR) and updates team standings table.
 * NRR = (Total Runs Scored / Total Overs Faced) - (Total Runs Conceded / Total Overs Bowled)
 */

export function calculateNRR(runsScored, oversFaced, runsConceded, oversBowled) {
  if (!oversFaced || oversFaced === 0) return 0;
  if (!oversBowled || oversBowled === 0) return 0;

  // Convert overs like 7.3 overs into decimal overs (7 + 3/6 = 7.5 overs)
  const parseOversToDecimal = (ov) => {
    const whole = Math.floor(ov);
    const balls = Math.round((ov - whole) * 10);
    return whole + (balls / 6);
  };

  const decFaced = parseOversToDecimal(oversFaced);
  const decBowled = parseOversToDecimal(oversBowled);

  const battingRR = runsScored / decFaced;
  const bowlingRR = runsConceded / decBowled;

  return parseFloat((battingRR - bowlingRR).toFixed(3));
}

export function sortStandings(teams) {
  return [...teams].sort((a, b) => {
    // 1. Points
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    // 2. NRR
    if (b.nrr !== a.nrr) {
      return b.nrr - a.nrr;
    }
    // 3. Wins
    return b.won - a.won;
  });
}
