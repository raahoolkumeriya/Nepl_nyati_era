/**
 * Utility functions for calculating dynamic auction bid increments and slab tiers.
 * 
 * Bidding Tier Rules:
 * - Up to 1000 PTS: +100 PTS increment
 * - 1000 to <3000 PTS: +200 PTS increment
 * - 3000 to <5000 PTS: +300 PTS increment
 * - 5000 to <7000 PTS: +400 PTS increment
 * - Scaling +100 for every additional 2000 PTS threshold.
 */

export function getBidIncrement(currentBid) {
  const bid = Math.max(0, Number(currentBid) || 0);
  if (bid < 1000) return 100;
  return 200 + Math.floor((bid - 1000) / 2000) * 100;
}

export function getBidSlabInfo(currentBid) {
  const bid = Math.max(0, Number(currentBid) || 0);
  const increment = getBidIncrement(bid);

  let label = 'Tier 1 (Base)';
  let rangeText = 'Up to ₹1,000 PTS';

  if (bid >= 1000 && bid < 3000) {
    label = 'Tier 2 (Mid)';
    rangeText = '₹1,000 – ₹3,000 PTS';
  } else if (bid >= 3000 && bid < 5000) {
    label = 'Tier 3 (High)';
    rangeText = '₹3,000 – ₹5,000 PTS';
  } else if (bid >= 5000) {
    const tierNum = 3 + Math.floor((bid - 3000) / 2000);
    label = `Tier ${tierNum} (Premium)`;
    const lower = 1000 + Math.floor((bid - 1000) / 2000) * 2000;
    const upper = lower + 2000;
    rangeText = `₹${lower.toLocaleString()} – ₹${upper.toLocaleString()} PTS`;
  }

  return {
    increment,
    label,
    rangeText,
    minNextBid: bid + increment
  };
}
