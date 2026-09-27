/**
 * Utility functions for calculating dynamic auction bid increments and slab tiers.
 *
 * Priority:
 * 1. Explicit customStep set by Supreme Master (bidIncrementStep) — used for all increments
 * 2. If no customStep, fall back to dynamic tier based on currentBid value
 *
 * NOTE: basePrice is the STARTING BID AMOUNT — it is NOT the increment step.
 *       e.g. Base=10000, Step=10000 → bids go 10000 → 20000 → 30000 (each step +10000)
 *       e.g. Base=10000, Step=5000  → bids go 10000 → 15000 → 20000 (each step +5000)
 */

export function getBidIncrement(currentBid, customStep = null, basePrice = null) {
  // Explicit custom step set by Supreme Master always wins for increments
  const step = Number(customStep);
  if (step && step > 0) {
    return step;
  }

  // Default fallback: dynamic tier based on current bid value
  const bid = Math.max(0, Number(currentBid) || 0);
  if (bid >= 10000) return 10000;
  if (bid < 1000) return 100;
  return 200 + Math.floor((bid - 1000) / 2000) * 100;
}

export function getBidSlabInfo(currentBid, customStep = null, basePrice = null) {
  const bid = Math.max(0, Number(currentBid) || 0);
  const increment = getBidIncrement(bid, customStep, basePrice);

  return {
    increment,
    label: customStep
      ? `Fixed Step (+₹${increment.toLocaleString()} PTS)`
      : `Standard Step (+₹${increment.toLocaleString()} PTS)`,
    rangeText: `Grows with +₹${increment.toLocaleString()} PTS / bid`,
    minNextBid: bid + increment
  };
}

export function getPlayerStartingBid(player, defaultBasePrice = 100) {
  if (player && player.basePrice !== undefined && player.basePrice !== null) {
    const num = Number(player.basePrice);
    if (!isNaN(num) && num > 0) return num;
  }
  const fallback = Number(defaultBasePrice);
  return (!isNaN(fallback) && fallback > 0) ? fallback : 100;
}

export function calculateNextBid(currentBid, customStep = null, basePrice = null) {
  const bid = Math.max(0, Number(currentBid) || 0);
  const inc = getBidIncrement(bid, customStep, basePrice);
  return bid + inc;
}

export function formatPTS(amount) {
  return `₹${Number(amount || 0).toLocaleString()} PTS`;
}


