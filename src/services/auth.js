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
    email: import.meta.env.VITE_SUPREMEMASTER_EMAIL || 'developer@nepl.in',
    password: import.meta.env.VITE_SUPREMEMASTER_PASS || 'Supreme@Dev2026',
    role: 'suprememaster',
    name: 'Supreme Master (App Developer)',
    avatar: '👑',
    isDefault: true,
  },
  {
    id: 'usr-admin-default',
    email: import.meta.env.VITE_SUPERUSER_EMAIL || 'admin@nepl.in',
    password: import.meta.env.VITE_SUPERUSER_PASS || 'Super@dmin2026',
    role: 'superuser',
    name: 'Super Admin',
    avatar: '⚡',
    isDefault: true,
  },
  {
    id: 'usr-auction-default',
    email: import.meta.env.VITE_AUCTIONEER_EMAIL || 'auction@nepl.in',
    password: import.meta.env.VITE_AUCTIONEER_PASS || 'Auction@NEPL2024',
    role: 'auctioneer',
    name: 'Auction Member',
    avatar: '🔨',
    isDefault: true,
  },
  {
    id: 'usr-player-default',
    email: import.meta.env.VITE_PLAYER_EMAIL || 'player@nepl.in',
    password: import.meta.env.VITE_PLAYER_PASS || 'Player@NEPL2024',
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
 * Add a new auctioneer or user (Super Admin operation)
 */
export function addAuctioneer({ name, email, password, role = 'auctioneer' }) {
  const cleanEmail = email.trim().toLowerCase();
  const allUsers = getAllUsers();
  
  if (allUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
    throw new Error(`A user with email ${cleanEmail} already exists!`);
  }

  const avatar = role === 'superuser' ? '⚡' : role === 'auctioneer' ? '🔨' : '🏏';

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

  const customUsers = getCustomUsers();
  const updatedCustomUsers = [newUser, ...customUsers];
  saveCustomUsers(updatedCustomUsers);
  return newUser;
}

/**
 * Delete an auctioneer or user by email
 */
export function deleteAuctioneer(emailToDelete) {
  const cleanEmail = emailToDelete.trim().toLowerCase();
  
  // Protect default superadmin
  if (cleanEmail === (import.meta.env.VITE_SUPERUSER_EMAIL || 'admin@nepl.in').toLowerCase()) {
    throw new Error("The primary Super Admin account cannot be deleted!");
  }

  const customUsers = getCustomUsers();
  const updatedCustomUsers = customUsers.filter(u => u.email.toLowerCase() !== cleanEmail);
  saveCustomUsers(updatedCustomUsers);
  return true;
}

/**
 * Validate credentials and return user object if valid
 */
export function validateCredentials(email, password) {
  const allUsers = getAllUsers();
  const cred = allUsers.find(
    c => c.email.toLowerCase() === email.trim().toLowerCase() && c.password === password
  );
  if (!cred) return null;
  return {
    id: cred.id,
    email: cred.email,
    name: cred.name,
    role: cred.role,
    avatar: cred.avatar,
    loginAt: Date.now(),
  };
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user, permission) {
  if (!user) return false;
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
