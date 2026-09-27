/**
 * Authentication service for NEPL Box Cricket
 * Handles role-based access for: suprememaster, superuser, auctioneer, player
 * Includes profile photo support, MongoDB synchronization, and automatic unique email generation.
 */
import { fetchUsersApi, saveUserApi, updateUserApi, deleteUserApi } from './api';

// Role permissions matrix
export const ROLES = {
  suprememaster: {
    label: 'Supreme Master (App Developer)',
    badge: '👑 Supreme Master',
    color: '#a855f7',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-300',
    borderColor: 'border-purple-500/40',
    permissions: {
      canBid: true,
      canSellPlayer: true,
      canUnsellPlayer: true,
      canOverrideBid: true,
      canEditPlayers: true,
      canAddPlayers: true,
      canDeletePlayers: true,
      canResetData: true, // EXCLUSIVELY Supreme Master can clear live auction data from MongoDB Atlas!
      canManageTeams: true,
      canManageUsers: true,
      canViewAuction: true,
      canViewTeams: true,
      canViewPlayers: true,
      canViewRules: true,
      canViewSchedule: true,
      canAccessProjector: true,
      canViewApiDocs: true,
      canViewCricHeroes: true,
    }
  },
  superuser: {
    label: 'Super Admin',
    badge: '⚡ Super Admin',
    color: '#d4622a',
    bgColor: 'bg-[#d4622a]/20',
    textColor: 'text-[#e8845a]',
    borderColor: 'border-[#d4622a]/40',
    permissions: {
      canBid: true,
      canSellPlayer: true,
      canUnsellPlayer: true,
      canOverrideBid: true,
      canEditPlayers: true,
      canAddPlayers: true,
      canDeletePlayers: true,
      canResetData: false, // Restricted exclusively to Supreme Master
      canManageTeams: true,
      canManageUsers: true,
      canViewAuction: true,
      canViewTeams: true,
      canViewPlayers: true,
      canViewRules: true,
      canViewSchedule: false,
      canAccessProjector: true,
      canViewApiDocs: false,
      canViewCricHeroes: false,
    }
  },
  auctioneer: {
    label: 'Auction Member',
    badge: '🔨 Auctioneer',
    color: '#f5c842',
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-500/40',
    permissions: {
      canBid: true,
      canSellPlayer: true,
      canUnsellPlayer: true,
      canOverrideBid: true,
      canEditPlayers: false,
      canAddPlayers: false,
      canDeletePlayers: false,
      canResetData: false,
      canManageTeams: false,
      canManageUsers: false,
      canViewAuction: true,
      canViewTeams: true,
      canViewPlayers: true,
      canViewRules: true,
      canViewSchedule: false,
      canAccessProjector: true,
      canViewApiDocs: false,
      canViewCricHeroes: false,
    }
  },
  player: {
    label: 'Player',
    badge: '🏏 Player',
    color: '#10b981',
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    permissions: {
      canBid: false,
      canSellPlayer: false,
      canUnsellPlayer: false,
      canOverrideBid: false,
      canEditPlayers: false,
      canAddPlayers: false,
      canDeletePlayers: false,
      canResetData: false,
      canManageTeams: false,
      canManageUsers: false,
      canViewAuction: false,
      canViewTeams: true,
      canViewPlayers: true,
      canViewRules: true,
      canViewSchedule: false,
      canAccessProjector: false,
      canViewApiDocs: false,
      canViewCricHeroes: false,
    }
  }
};

// Default Credential store (env-based, compared at runtime)
export const DEFAULT_CREDENTIALS = [
  {
    id: 'usr-supreme-master-default',
    email: (import.meta.env.VITE_SUPREMEMASTER_EMAIL || '').trim().toLowerCase() || 'developer@nepl.in',
    password: (import.meta.env.VITE_SUPREMEMASTER_PASS || '').trim(),
    role: 'suprememaster',
    name: 'Supreme Master (App Developer)',
    avatar: '👑',
    photoUrl: null,
    isDefault: true,
    isDisabled: false,
  },
  {
    id: 'usr-admin-default',
    email: (import.meta.env.VITE_SUPERUSER_EMAIL || '').trim().toLowerCase() || 'admin@nepl.in',
    password: (import.meta.env.VITE_SUPERUSER_PASS || '').trim(),
    role: 'superuser',
    name: 'Super Admin',
    avatar: '⚡',
    photoUrl: null,
    isDefault: true,
    isDisabled: false,
  },
  {
    id: 'usr-auction-default',
    email: (import.meta.env.VITE_AUCTIONEER_EMAIL || '').trim().toLowerCase() || 'auction@nepl.in',
    password: (import.meta.env.VITE_AUCTIONEER_PASS || '').trim(),
    role: 'auctioneer',
    name: 'Auction Member',
    avatar: '🔨',
    photoUrl: null,
    isDefault: true,
    isDisabled: false,
  },
  {
    id: 'usr-player-default',
    email: (import.meta.env.VITE_PLAYER_EMAIL || '').trim().toLowerCase() || 'player@nepl.in',
    password: (import.meta.env.VITE_PLAYER_PASS || '').trim(),
    role: 'player',
    name: 'Player',
    avatar: '🏏',
    photoUrl: null,
    isDefault: true,
    isDisabled: false,
  },
];

/**
 * Generate unique NEPL email: <first_name>.<surname>@nepl.in
 * If the email address already exists in the database/user pool and a new user has the same name,
 * appends -A, -B, -C, and so on: e.g. rahul.kumeriya-A@nepl.in
 */
export function generateUniqueNeplEmail(fullName, existingEmails = [], excludeEmail = null) {
  if (!fullName || typeof fullName !== 'string') return '';
  
  const tokens = fullName
    .trim()
    .toLowerCase()
    .split(/[\s._-]+/)
    .map(t => t.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);
    
  if (tokens.length === 0) return '';
  
  const firstName = tokens[0];
  const surname = tokens.length > 1 ? tokens[tokens.length - 1] : '';
  const baseLocal = surname ? `${firstName}.${surname}` : firstName;
  const baseEmail = `${baseLocal}@nepl.in`;

  const cleanExisting = (existingEmails || [])
    .filter(Boolean)
    .map(e => e.trim().toLowerCase())
    .filter(e => !excludeEmail || e !== excludeEmail.trim().toLowerCase());
    
  const existingSet = new Set(cleanExisting);
  
  if (!existingSet.has(baseEmail.toLowerCase())) {
    return baseEmail;
  }
  
  // Suffix with -A, -B, -C, ...
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < letters.length; i++) {
    const candidate = `${baseLocal}-${letters[i]}@nepl.in`;
    if (!existingSet.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  
  let counter = 1;
  while (true) {
    const candidate = `${baseLocal}-A${counter}@nepl.in`;
    if (!existingSet.has(candidate.toLowerCase())) {
      return candidate;
    }
    counter++;
  }
}

/**
 * Get custom users from localStorage
 */
export function getCustomUsers() {
  try {
    const raw = localStorage.getItem('nepl_custom_users');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save custom users to localStorage
 */
export function saveCustomUsers(users) {
  try {
    localStorage.setItem('nepl_custom_users', JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save custom users to localStorage:', err);
  }
}

/**
 * Get combined list of default + custom users
 */
export function getAllUsers() {
  const customUsers = getCustomUsers();
  const customEmails = new Set(customUsers.map(u => u.email.toLowerCase()));
  const filteredDefaults = DEFAULT_CREDENTIALS.filter(d => !customEmails.has(d.email.toLowerCase()));
  return [...filteredDefaults, ...customUsers];
}

/**
 * Synchronize user list with backend MongoDB
 */
export async function syncUsersWithBackend() {
  try {
    const serverUsers = await fetchUsersApi();
    if (Array.isArray(serverUsers) && serverUsers.length > 0) {
      const customOnes = serverUsers.filter(u => !u.isDefault);
      if (customOnes.length > 0) {
        saveCustomUsers(customOnes);
      }
      return serverUsers;
    }
  } catch (err) {
    console.warn('Sync with server users skipped:', err.message);
  }
  return getAllUsers();
}

/**
 * Add or update an auctioneer or user (Super Admin operation)
 * Automatically syncs with MongoDB Atlas backend and updates local storage.
 */
export function addAuctioneer({ name, email, password, role = 'auctioneer', photoUrl = null }) {
  const customUsers = getCustomUsers();
  const allCurrent = getAllUsers();
  
  // If email not provided, auto-generate unique email
  let cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    cleanEmail = generateUniqueNeplEmail(name, allCurrent.map(u => u.email)).toLowerCase();
  }

  const avatar = role === 'suprememaster' ? '👑' : role === 'superuser' ? '⚡' : role === 'auctioneer' ? '🔨' : '🏏';
  const existingCustomIdx = customUsers.findIndex(u => u.email.toLowerCase() === cleanEmail);

  let updatedUser;

  if (existingCustomIdx >= 0) {
    // Update existing custom user
    updatedUser = {
      ...customUsers[existingCustomIdx],
      name: name.trim(),
      password: password ? password.trim() : customUsers[existingCustomIdx].password,
      role,
      avatar,
      photoUrl: photoUrl !== undefined ? photoUrl : customUsers[existingCustomIdx].photoUrl,
      updatedAt: new Date().toISOString(),
    };
    customUsers[existingCustomIdx] = updatedUser;
    saveCustomUsers(customUsers);
  } else {
    // Check if it's overriding a default user
    const defaultIdx = DEFAULT_CREDENTIALS.findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (defaultIdx >= 0) {
      updatedUser = {
        ...DEFAULT_CREDENTIALS[defaultIdx],
        name: name ? name.trim() : DEFAULT_CREDENTIALS[defaultIdx].name,
        password: password ? password.trim() : DEFAULT_CREDENTIALS[defaultIdx].password,
        role,
        avatar,
        photoUrl: photoUrl !== undefined ? photoUrl : DEFAULT_CREDENTIALS[defaultIdx].photoUrl,
        isDefault: false,
        updatedAt: new Date().toISOString(),
      };
      customUsers.unshift(updatedUser);
      saveCustomUsers(customUsers);
    } else {
      updatedUser = {
        id: `usr-${Date.now()}`,
        email: cleanEmail,
        password: password ? password.trim() : (import.meta.env.VITE_AUCTIONEER_PASS || '').trim(),
        role,
        name: name.trim(),
        avatar,
        photoUrl: photoUrl || null,
        isDefault: false,
        isDisabled: false,
        createdAt: new Date().toISOString(),
      };
      customUsers.unshift(updatedUser);
      saveCustomUsers(customUsers);
    }
  }

  // Persist asynchronously to MongoDB Atlas backend
  saveUserApi(updatedUser).catch(err => {
    console.warn('Backend MongoDB user sync notice:', err.message);
  });

  return updatedUser;
}

/**
 * Update user role directly (e.g. promote Player to Auctioneer)
 */
export function updateUserRole(email, newRole, newPassword = null, newPhotoUrl = undefined) {
  const cleanEmail = email.trim().toLowerCase();
  const allUsers = getAllUsers();
  const existing = allUsers.find(u => u.email.toLowerCase() === cleanEmail);

  if (!existing) {
    throw new Error(`User with email ${cleanEmail} not found!`);
  }

  const defaultPass = (import.meta.env.VITE_AUCTIONEER_PASS || '').trim();

  return addAuctioneer({
    name: existing.name,
    email: cleanEmail,
    password: newPassword ? newPassword.trim() : (existing.password || defaultPass),
    role: newRole,
    photoUrl: newPhotoUrl !== undefined ? newPhotoUrl : existing.photoUrl,
  });
}

/**
 * Toggle active/disabled status for an auctioneer or user
 */
export function toggleUserDisabled(email) {
  const cleanEmail = email.trim().toLowerCase();
  const superAdminEmail = (import.meta.env.VITE_SUPERUSER_EMAIL || '').trim().toLowerCase() || 'admin@nepl.in';
  
  if (cleanEmail === superAdminEmail) {
    throw new Error("The primary Super Admin account cannot be disabled!");
  }

  const allUsers = getAllUsers();
  const existing = allUsers.find(u => u.email.toLowerCase() === cleanEmail);
  if (!existing) {
    throw new Error(`User with email ${cleanEmail} not found!`);
  }

  const newDisabledState = !existing.isDisabled;
  const customUsers = getCustomUsers();
  const existingCustomIdx = customUsers.findIndex(u => u.email.toLowerCase() === cleanEmail);
  let updatedUser;

  if (existingCustomIdx >= 0) {
    customUsers[existingCustomIdx].isDisabled = newDisabledState;
    customUsers[existingCustomIdx].updatedAt = new Date().toISOString();
    saveCustomUsers(customUsers);
    updatedUser = customUsers[existingCustomIdx];
  } else {
    // Override default user
    const defaultIdx = DEFAULT_CREDENTIALS.findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (defaultIdx >= 0) {
      updatedUser = {
        ...DEFAULT_CREDENTIALS[defaultIdx],
        isDisabled: newDisabledState,
        isDefault: false,
        updatedAt: new Date().toISOString(),
      };
      customUsers.unshift(updatedUser);
      saveCustomUsers(customUsers);
    } else {
      updatedUser = { ...existing, isDisabled: newDisabledState };
    }
  }

  // Sync with MongoDB backend
  updateUserApi(cleanEmail, { isDisabled: newDisabledState }).catch(console.warn);

  return updatedUser;
}

/**
 * Revoke auctioneer access (downgrades to player)
 */
export function revokeAuctioneerAccess(email) {
  const cleanEmail = email.trim().toLowerCase();
  return updateUserRole(cleanEmail, 'player');
}

/**
 * Delete an auctioneer or user by email
 */
export function deleteAuctioneer(emailToDelete) {
  const cleanEmail = emailToDelete.trim().toLowerCase();
  const superAdminEmail = (import.meta.env.VITE_SUPERUSER_EMAIL || '').trim().toLowerCase() || 'admin@nepl.in';
  
  if (cleanEmail === superAdminEmail) {
    throw new Error("The primary Super Admin account cannot be deleted!");
  }

  const customUsers = getCustomUsers();
  const updatedCustomUsers = customUsers.filter(u => u.email.toLowerCase() !== cleanEmail);
  saveCustomUsers(updatedCustomUsers);

  // Sync deletion with MongoDB backend
  deleteUserApi(cleanEmail).catch(console.warn);

  return true;
}

/**
 * Validate credentials and return user object if valid.
 * Validates against backend server / MongoDB Atlas first, with transparent local fallback.
 */
export async function validateCredentials(email, password) {
  if (!email || !password) return null;
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();
  if (!cleanPass) return null;

  // 1. Try server-side authentication (MongoDB Atlas & server environment)
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.user) {
        return data.user;
      }
    } else if (res.status === 403) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `⛔ Account (${cleanEmail}) has been disabled. Access is revoked.`);
    }
    // For status 401, do not throw; allow client fallback to check freshly created users
  } catch (err) {
    // If account explicitly disabled, propagate immediately
    if (err.message && (err.message.includes('⛔') || err.message.includes('disabled'))) {
      throw err;
    }
  }

  // 2. Client-side fallback for freshly added auctioneers / offline mode
  const allUsers = getAllUsers();
  const cred = allUsers.find(
    c => c.email.toLowerCase() === cleanEmail && c.password && c.password.trim() === cleanPass
  );

  if (!cred) return null;

  if (cred.isDisabled) {
    throw new Error(`⛔ Account (${cred.email}) has been disabled by Super Admin. Access is revoked.`);
  }

  // If found locally, ensure it is asynchronously synced to MongoDB backend
  saveUserApi(cred).catch(() => {});

  return {
    id: cred.id || `usr-${Date.now()}`,
    email: cred.email,
    name: cred.name,
    role: cred.role,
    avatar: cred.avatar,
    photoUrl: cred.photoUrl || null,
    isDisabled: Boolean(cred.isDisabled),
    isDefault: Boolean(cred.isDefault),
    loginAt: Date.now(),
  };
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user, permission) {
  if (!user || user.isDisabled) return false;
  if (user.role === 'suprememaster') return true;
  const roleConfig = ROLES[user.role];
  if (!roleConfig) return false;
  return roleConfig.permissions[permission] === true;
}

/**
 * Get role configuration for display
 */
export function getRoleConfig(role) {
  return ROLES[role] || ROLES.player;
}

/**
 * Create a session token (persisted in sessionStorage)
 */
export function createSession(user) {
  const session = {
    ...user,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
  };
  sessionStorage.setItem('nepl_session', JSON.stringify(session));
  return session;
}

/**
 * Restore session from storage
 */
export function restoreSession() {
  try {
    const raw = sessionStorage.getItem('nepl_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem('nepl_session');
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Clear session
 */
export function clearSession() {
  sessionStorage.removeItem('nepl_session');
}
