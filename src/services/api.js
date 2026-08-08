/**
 * NEPL API Service
 * 
 * Talks to the Express + Mongoose backend (server/index.js).
 * Express then talks to MongoDB Atlas using the Mongoose driver.
 * 
 * Architecture:
 *   React (browser) → Express (Node.js) → MongoDB Atlas
 * 
 * Why: MongoDB driver only works in server-side environments.
 * Browsers cannot connect to MongoDB directly.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY || 'TTBPq1o0KhaMicvxAvuyT3Q23qr51XgabEorbqA-kwo';

/** Generic HTTP helper */
async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Server / MongoDB Status ───────────────────────────────────────────────────

/**
 * isMongoDB — true when the Express backend is reachable and connected to Atlas.
 * Used by App.jsx to decide whether to sync with the server.
 * Starts as false; set to true after first successful health check.
 */
export let isMongoDB = false;

export async function checkServerHealth() {
  try {
    const data = await apiFetch('/health');
    isMongoDB = data.db === 'connected';
    return isMongoDB;
  } catch {
    isMongoDB = false;
    return false;
  }
}

export async function initializeWithDefaults() {
  // Hardcoded defaults removed. Data is managed exclusively in MongoDB Atlas.
}

// ── Players ───────────────────────────────────────────────────────────────────

export async function fetchPlayers() {
  return apiFetch('/players');
}

export async function savePlayers(players) {
  return apiFetch('/players', {
    method: 'PUT',
    body: JSON.stringify(players),
  });
}

export async function addPlayer(player) {
  return apiFetch('/players', {
    method: 'POST',
    body: JSON.stringify(player),
  });
}

export async function updatePlayer(id, data) {
  return apiFetch(`/players/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export async function fetchTeams() {
  return apiFetch('/teams');
}

export async function saveTeams(teams) {
  return apiFetch('/teams', {
    method: 'PUT',
    body: JSON.stringify(teams),
  });
}

export async function updateTeam(id, data) {
  return apiFetch(`/teams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTeam(id) {
  return apiFetch(`/teams/${id}`, {
    method: 'DELETE',
  });
}

// ── Bid History ───────────────────────────────────────────────────────────────

export async function fetchHistory() {
  return apiFetch('/history');
}

export async function saveHistory(history) {
  return apiFetch('/history', {
    method: 'PUT',
    body: JSON.stringify(history),
  });
}

export async function addHistoryEntry(entry) {
  return apiFetch('/history', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

// ── Tournament Rules ──────────────────────────────────────────────────────────

export async function fetchRules() {
  return apiFetch('/rules');
}

export async function saveRules(rules) {
  return apiFetch('/rules', {
    method: 'PUT',
    body: JSON.stringify(rules),
  });
}

export async function addRule(rule) {
  return apiFetch('/rules', {
    method: 'POST',
    body: JSON.stringify(rule),
  });
}

export async function updateRule(id, data) {
  return apiFetch(`/rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRule(id) {
  return apiFetch(`/rules/${id}`, {
    method: 'DELETE',
  });
}
