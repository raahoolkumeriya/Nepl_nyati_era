import express from 'express';

const router = express.Router();

// Role details definition
const ROLE_METADATA = {
  suprememaster: {
    role: 'suprememaster',
    name: 'Supreme Master (App Developer)',
    avatar: '👑',
  },
  superuser: {
    role: 'superuser',
    name: 'Super Admin',
    avatar: '⚡',
  },
  auctioneer: {
    role: 'auctioneer',
    name: 'Auction Member',
    avatar: '🔨',
  },
  player: {
    role: 'player',
    name: 'Player',
    avatar: '🏏',
  },
};

/**
 * Helper to fetch system users configured via environment variables
 */
function getSystemEnvUsers() {
  return [
    {
      id: 'usr-supreme-master-default',
      email: (process.env.SUPREMEMASTER_EMAIL || process.env.VITE_SUPREMEMASTER_EMAIL || 'developer@nepl.in').trim().toLowerCase(),
      password: (process.env.SUPREMEMASTER_PASS || process.env.VITE_SUPREMEMASTER_PASS || '').trim(),
      ...ROLE_METADATA.suprememaster,
      isDefault: true,
    },
    {
      id: 'usr-admin-default',
      email: (process.env.SUPERUSER_EMAIL || process.env.VITE_SUPERUSER_EMAIL || 'admin@nepl.in').trim().toLowerCase(),
      password: (process.env.SUPERUSER_PASS || process.env.VITE_SUPERUSER_PASS || '').trim(),
      ...ROLE_METADATA.superuser,
      isDefault: true,
    },
    {
      id: 'usr-auction-default',
      email: (process.env.AUCTIONEER_EMAIL || process.env.VITE_AUCTIONEER_EMAIL || 'auction@nepl.in').trim().toLowerCase(),
      password: (process.env.AUCTIONEER_PASS || process.env.VITE_AUCTIONEER_PASS || '').trim(),
      ...ROLE_METADATA.auctioneer,
      isDefault: true,
    },
    {
      id: 'usr-player-default',
      email: (process.env.PLAYER_EMAIL || process.env.VITE_PLAYER_EMAIL || 'player@nepl.in').trim().toLowerCase(),
      password: (process.env.PLAYER_PASS || process.env.VITE_PLAYER_PASS || '').trim(),
      ...ROLE_METADATA.player,
      isDefault: true,
    },
  ];
}

/**
 * POST /api/auth/login
 * Validates credentials on the backend server against environment variables.
 * Sensitive passwords NEVER leak to the browser bundle.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    const systemUsers = getSystemEnvUsers();
    const matchedUser = systemUsers.find(
      u => u.email.toLowerCase() === cleanEmail && u.password && u.password === cleanPass
    );

    if (!matchedUser) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (matchedUser.isDisabled) {
      return res.status(403).json({ error: `⛔ Account (${matchedUser.email}) has been disabled. Access is revoked.` });
    }

    // Return sanitized user object without password
    const safeUser = {
      id: matchedUser.id,
      email: matchedUser.email,
      name: matchedUser.name,
      role: matchedUser.role,
      avatar: matchedUser.avatar,
      isDisabled: Boolean(matchedUser.isDisabled),
      loginAt: Date.now(),
    };

    return res.json({
      success: true,
      user: safeUser,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
});

/**
 * GET /api/auth/users
 * Returns list of user profiles (passwords omitted for security)
 */
router.get('/users', (req, res) => {
  const systemUsers = getSystemEnvUsers().map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    avatar: u.avatar,
    isDefault: u.isDefault,
    isDisabled: Boolean(u.isDisabled),
  }));

  res.json(systemUsers);
});

export default router;
