/**
 * System-driven dynamic season & year utilities for NEPL
 * Automatically rolls over with the system calendar year (e.g. 2026, 2027, 2028+)
 */

export const CURRENT_YEAR = new Date().getFullYear();

export const CURRENT_SEASON_TAG = `NEPL ${CURRENT_YEAR}`;

export const getSystemYear = () => new Date().getFullYear();

export const getSeasonTitle = (suffix = 'Summer Season') => {
  const year = new Date().getFullYear();
  return `NEPL ${year} ${suffix}`.trim();
};
