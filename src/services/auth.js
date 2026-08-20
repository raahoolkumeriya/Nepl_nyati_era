/**
 * Authentication service for NEPL Box Cricket
 * Handles role-based access for: superuser, auctioneer, player
 */

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
      canBid: false,
      canSellPlayer: false,
      canUnsellPlayer: false,
      canOverrideBid: false,
      canEditPlayers: false,
      canAddPlayers: false,
      canDeletePlayers: false,
      canResetData: true, // EXCLUSIVELY Supreme Master can clear live auction data from MongoDB Atlas!
      canManageTeams: false,
      canManageUsers: true,
      canViewAuction: true,
      canViewTeams: true,
      canViewPlayers: true,
      canViewRules: true,
      canViewSchedule: true,
      canAccessProjector: true,
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
      canViewSchedule: true,
      canAccessProjector: true,
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
      canSellPlayer: false, // Super Admin Only
      canUnsellPlayer: false,
      canOverrideBid: false,
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
      canViewSchedule: true,
      canAccessProjector: true,
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
      canViewSchedule: true,
      canAccessProjector: false,
    }
  }
};

// Default Credential store (env-based, compared at runtime)
const DEFAULT_CREDENTIALS = [
  {
    id: 'usr-supreme-master-default',
    email: (import.meta.env.VITE_SUPREMEMASTER_EMAIL || '').trim().toLowerCase() || 'developer@nepl.in',
    password: (import.meta.env.VITE_SUPREMEMASTER_PASS || '').trim(),
    role: 'suprememaster',
    name: 'Supreme Master (App Developer)',
    avatar: '👑',
    isDefault: true,
  },
  {
    id: 'usr-admin-default',
    email: (import.meta.env.VITE_SUPERUSER_EMAIL || '').trim().toLowerCase() || 'admin@nepl.in',
    password: (import.meta.env.VITE_SUPERUSER_PASS || '').trim(),
    role: 'superuser',
    name: 'Super Admin',
    avatar: '⚡',
    isDefault: true,
  },
  {
    id: 'usr-auction-default',
    email: (import.meta.env.VITE_AUCTIONEER_EMAIL || '').trim().toLowerCase() || 'auction@nepl.in',
    password: (import.meta.env.VITE_AUCTIONEER_PASS || '').trim(),
    role: 'auctioneer',
    name: 'Auction Member',
    avatar: '🔨',
    isDefault: true,
  },
  {
    id: 'usr-player-default',
    email: (import.meta.env.VITE_PLAYER_EMAIL || '').trim().toLowerCase() || 'player@nepl.in',
    password: (import.meta.env.VITE_PLAYER_PASS || '').trim(),
    role: 'player',
    name: 'Player',
    avatar: '🏏',
    isDefault: true,
  },
];

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
function saveCustomUsers(users) {
  try {
    localStorage.setItem('nepl_custom_users', JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save custom users:', err);
  }
}

/**
 * Get combined list of default + custom users
 */
export function getAllUsers() {
  return [...DEFAULT_CREDENTIALS, ...getCustomUsers()];
}

/**
 * Add or update an auctioneer or user (Super Admin operation)
 */
export function addAuctioneer({ name, email, password, role = 'auctioneer' }) {
  const cleanEmail = email.trim().toLowerCase();
  const avatar = role === 'suprememaster' ? '👑' : role === 'superuser' ? '⚡' : role === 'auctioneer' ? '🔨' : '🏏';
  const customUsers = getCustomUsers();
  const existingCustomIdx = customUsers.findIndex(u => u.email.toLowerCase() === cleanEmail);

  if (existingCustomIdx >= 0) {
    // Update existing custom user
    const updated = {
      ...customUsers[existingCustomIdx],
      name: name.trim(),
      password: password ? password.trim() : customUsers[existingCustomIdx].password,
      role,
      avatar,
      updatedAt: new Date().toISOString(),
    };
    customUsers[existingCustomIdx] = updated;
    saveCustomUsers(customUsers);
    return updated;
  }

  // Check if it's overriding a default user
  const defaultIdx = DEFAULT_CREDENTIALS.findIndex(u => u.email.toLowerCase() === cleanEmail);
  if (defaultIdx >= 0) {
    const overrideUser = {
      ...DEFAULT_CREDENTIALS[defaultIdx],
      name: name ? name.trim() : DEFAULT_CREDENTIALS[defaultIdx].name,
      password: password ? password.trim() : DEFAULT_CREDENTIALS[defaultIdx].password,
      role,
      avatar,
      isDefault: false,
      updatedAt: new Date().toISOString(),
    };
    const updatedCustomUsers = [overrideUser, ...customUsers];
    saveCustomUsers(updatedCustomUsers);
    return overrideUser;
  }

  const newUser = {
    id: `usr-${Date.now()}`,
    email: cleanEmail,
    password: password.trim(),
    role,
    name: name.trim(),
    avatar,
    isDefault: false,
    createdAt: new Date().toISOString(),
  };

  const updatedCustomUsers = [newUser, ...customUsers];
  saveCustomUsers(updatedCustomUsers);
  return newUser;
}

/**
 * Update user role directly (e.g. promote Player to Auctioneer)
 */
export function updateUserRole(email, newRole, newPassword = null) {
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

  if (existingCustomIdx >= 0) {
    customUsers[existingCustomIdx].isDisabled = newDisabledState;
    customUsers[existingCustomIdx].updatedAt = new Date().toISOString();
    saveCustomUsers(customUsers);
    return customUsers[existingCustomIdx];
  }

  // Override default user
  const defaultIdx = DEFAULT_CREDENTIALS.findIndex(u => u.email.toLowerCase() === cleanEmail);
  if (defaultIdx >= 0) {
    const override = {
      ...DEFAULT_CREDENTIALS[defaultIdx],
      isDisabled: newDisabledState,
      isDefault: false,
      updatedAt: new Date().toISOString(),
    };
    const updated = [override, ...customUsers];
    saveCustomUsers(updated);
    return override;
  }

  return existing;
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
  
  // Protect default superadmin
  if (cleanEmail === superAdminEmail) {
    throw new Error("The primary Super Admin account cannot be deleted!");
  }

  const customUsers = getCustomUsers();
  const updatedCustomUsers = customUsers.filter(u => u.email.toLowerCase() !== cleanEmail);
  saveCustomUsers(updatedCustomUsers);
  return true;
}

/**
 * Validate credentials and return user object if valid
 * Secure: checks backend auth API where credentials are validated against server environment variables
 */
export async function validateCredentials(email, password) {
  if (!email || !password) return null;
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();
  if (!cleanPass) return null;

  // 1. Try server-side authentication (passwords evaluated against server environment)
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
    } else if (res.status === 401 || res.status === 403) {
      const err = await res.json().catch(() => ({}));
      if (err.error) throw new Error(err.error);
      return null;
    }
  } catch (err) {
    if (err.message && (err.message.includes('⛔') || err.message.includes('Invalid') || err.message.includes('disabled'))) {
      throw err;
    }
    // If backend is unreachable, proceed to client fallback
  }

  // 2. Client-side validation fallback for custom users / dev environment
  const allUsers = getAllUsers();
  const cred = allUsers.find(
    c => c.email.toLowerCase() === cleanEmail && c.password && c.password === cleanPass
  );
  if (!cred) return null;
  if (cred.isDisabled) {
    throw new Error(`⛔ Account (${cred.email}) has been disabled by Super Admin. Access is revoked.`);
  }
  return {
    id: cred.id,
    email: cred.email,
    name: cred.name,
    role: cred.role,
    avatar: cred.avatar,
    isDisabled: Boolean(cred.isDisabled),
    loginAt: Date.now(),
  };
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user, permission) {
  if (!user || user.isDisabled) return false;
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
 * Create a session token (simple timestamp-based)
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
