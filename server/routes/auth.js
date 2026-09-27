import express from 'express';
import User from '../models/User.js';

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
  const supremePass = (process.env.SUPREMEMASTER_PASS || process.env.VITE_SUPREMEMASTER_PASS || '').trim();
  const adminPass = (process.env.SUPERUSER_PASS || process.env.VITE_SUPERUSER_PASS || '').trim();
  const auctioneerPass = (process.env.AUCTIONEER_PASS || process.env.VITE_AUCTIONEER_PASS || '').trim();
  const playerPass = (process.env.PLAYER_PASS || process.env.VITE_PLAYER_PASS || '').trim();

  return [
    {
      id: 'usr-supreme-master-default',
      email: (process.env.SUPREMEMASTER_EMAIL || process.env.VITE_SUPREMEMASTER_EMAIL || 'developer@nepl.in').trim().toLowerCase(),
      password: supremePass,
      ...ROLE_METADATA.suprememaster,
      isDefault: true,
      isDisabled: false,
    },
    {
      id: 'usr-admin-default',
      email: (process.env.SUPERUSER_EMAIL || process.env.VITE_SUPERUSER_EMAIL || 'admin@nepl.in').trim().toLowerCase(),
      password: adminPass,
      ...ROLE_METADATA.superuser,
      isDefault: true,
      isDisabled: false,
    },
    {
      id: 'usr-auction-default',
      email: (process.env.AUCTIONEER_EMAIL || process.env.VITE_AUCTIONEER_EMAIL || 'auction@nepl.in').trim().toLowerCase(),
      password: auctioneerPass,
      ...ROLE_METADATA.auctioneer,
      isDefault: true,
      isDisabled: false,
    },
    {
      id: 'usr-player-default',
      email: (process.env.PLAYER_EMAIL || process.env.VITE_PLAYER_EMAIL || 'player@nepl.in').trim().toLowerCase(),
      password: playerPass,
      ...ROLE_METADATA.player,
      isDefault: true,
      isDisabled: false,
    },
  ];
}

/**
 * Generate unique NEPL email: <first_name>.<surname>@nepl.in
 * If exists, appends -A, -B, -C, ...
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
 * POST /api/auth/login
 * Validates credentials against system env users and MongoDB database.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Check system environment users
    const systemUsers = getSystemEnvUsers();
    let matchedUser = systemUsers.find(
      u => u.email.toLowerCase() === cleanEmail && u.password && u.password === cleanPass
    );

    // 2. Check MongoDB database if not matched in system environment
    if (!matchedUser) {
      try {
        const dbUser = await User.findOne({ email: cleanEmail }).lean();
        if (dbUser && dbUser.password && dbUser.password.trim() === cleanPass) {
          matchedUser = dbUser;
        }
      } catch (dbErr) {
        console.warn('DB auth check warning:', dbErr.message);
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (matchedUser.isDisabled) {
      return res.status(403).json({ error: `⛔ Account (${matchedUser.email}) has been disabled. Access is revoked.` });
    }

    // Return sanitized user object without password
    const safeUser = {
      id: matchedUser.id || `usr-${Date.now()}`,
      email: matchedUser.email,
      name: matchedUser.name,
      role: matchedUser.role,
      avatar: matchedUser.avatar || ROLE_METADATA[matchedUser.role]?.avatar || '🔨',
      photoUrl: matchedUser.photoUrl || null,
      isDisabled: Boolean(matchedUser.isDisabled),
      isDefault: Boolean(matchedUser.isDefault),
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
 * Returns list of all user profiles (system users + MongoDB users)
 */
router.get('/users', async (req, res) => {
  try {
    const systemUsers = getSystemEnvUsers();
    let dbUsers = [];
    try {
      dbUsers = await User.find().lean();
    } catch (dbErr) {
      console.warn('Failed to fetch DB users:', dbErr.message);
    }

    // Merge system users and db users (db users can override system users if updated)
    // Never expose plain passwords in user directory listings!
    const usersMap = new Map();
    for (const u of systemUsers) {
      usersMap.set(u.email.toLowerCase(), {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        avatar: u.avatar,
        photoUrl: u.photoUrl || null,
        isDefault: true,
        isDisabled: Boolean(u.isDisabled),
      });
    }

    for (const u of dbUsers) {
      usersMap.set(u.email.toLowerCase(), {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        avatar: u.avatar || ROLE_METADATA[u.role]?.avatar || '🔨',
        photoUrl: u.photoUrl || null,
        isDefault: Boolean(u.isDefault),
        isDisabled: Boolean(u.isDisabled),
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      });
    }

    res.json(Array.from(usersMap.values()));
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/users
 * Add or update an auctioneer or user in MongoDB
 */
router.post('/users', async (req, res) => {
  try {
    const { id, name, email, password, role, avatar, photoUrl, isDisabled } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Determine unique email
    let finalEmail = email ? email.trim() : '';
    if (!finalEmail) {
      // Auto-generate if not provided
      const allUsers = await User.find().lean().catch(() => []);
      const systemUsers = getSystemEnvUsers();
      const existingEmails = [...systemUsers.map(u => u.email), ...allUsers.map(u => u.email)];
      finalEmail = generateUniqueNeplEmail(name, existingEmails);
    }

    const cleanEmail = finalEmail.toLowerCase();
    const cleanPassword = password ? password.trim() : (process.env.AUCTIONEER_PASS || process.env.VITE_AUCTIONEER_PASS || '').trim();
    const finalRole = role || 'auctioneer';
    const finalAvatar = avatar || (finalRole === 'suprememaster' ? '👑' : finalRole === 'superuser' ? '⚡' : finalRole === 'auctioneer' ? '🔨' : '🏏');

    const userData = {
      id: id || `usr-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      password: cleanPassword,
      role: finalRole,
      avatar: finalAvatar,
      photoUrl: photoUrl || null,
      isDisabled: Boolean(isDisabled),
      isDefault: false,
    };

    const updatedUser = await User.findOneAndUpdate(
      { email: cleanEmail },
      { $set: userData },
      { upsert: true, returnDocument: 'after', lean: true }
    );

    const { _id, __v, password: _pw, ...safeSaved } = updatedUser;
    res.status(201).json(safeSaved);
  } catch (err) {
    console.error('Save user error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/auth/users/:email
 * Update user details (role, password, photo, status)
 */
router.put('/users/:email', async (req, res) => {
  try {
    const cleanEmail = decodeURIComponent(req.params.email).trim().toLowerCase();
    const updates = { ...req.body };
    delete updates._id;
    delete updates.__v;

    if (updates.email) {
      updates.email = updates.email.trim().toLowerCase();
    }

    const updated = await User.findOneAndUpdate(
      { email: cleanEmail },
      { $set: updates },
      { returnDocument: 'after', upsert: true, lean: true }
    );

    const { _id, __v, password: _pw, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/auth/users/:email
 * Delete an auctioneer or user
 */
router.delete('/users/:email', async (req, res) => {
  try {
    const cleanEmail = decodeURIComponent(req.params.email).trim().toLowerCase();
    const superAdminEmail = (process.env.SUPERUSER_EMAIL || process.env.VITE_SUPERUSER_EMAIL || 'admin@nepl.in').trim().toLowerCase();
    
    if (cleanEmail === superAdminEmail) {
      return res.status(403).json({ error: 'Primary Super Admin account cannot be deleted' });
    }

    await User.deleteOne({ email: cleanEmail });
    res.json({ success: true, message: `User ${cleanEmail} deleted` });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/generate-email
 * Query param: ?name=...[&exclude=...]
 * Returns generated unique email with -A, -B, etc.
 */
router.get('/generate-email', async (req, res) => {
  try {
    const name = req.query.name;
    const exclude = req.query.exclude;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const systemUsers = getSystemEnvUsers();
    let dbUsers = [];
    try {
      dbUsers = await User.find().lean();
    } catch {}

    const existingEmails = [...systemUsers.map(u => u.email), ...dbUsers.map(u => u.email)];
    const generatedEmail = generateUniqueNeplEmail(name, existingEmails, exclude);

    res.json({ email: generatedEmail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
