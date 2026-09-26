import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  UserPlus, 
  Trash2, 
  Shield, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Crown, 
  Zap, 
  Gavel, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  UserCheck2,
  Ban,
  Power,
  Camera,
  Upload,
  RefreshCw,
  Search,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getRoleConfig, generateUniqueNeplEmail } from '../services/auth';
import { updatePlayer as apiUpdatePlayer } from '../services/api';

/**
 * Client-side lightweight image compressor and base64 converter
 */
function compressImageFile(file, callback) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file (JPEG, PNG, WEBP).');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 400; // 400x400 max bounding box
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      callback(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

export default function AuctioneerManagerModal({ isOpen, onClose, players = [], setPlayers }) {
  const { 
    usersList, 
    addAuctioneer, 
    updateUserRole, 
    toggleUserDisabled, 
    revokeAuctioneerAccess, 
    deleteAuctioneer, 
    can, 
    user: currentUser 
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState('promote_player'); // 'promote_player' | 'custom_user'
  
  const defaultAuctioneerPass = (import.meta.env.VITE_AUCTIONEER_PASS || '').trim() || 'Auction@2026';
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [playerPassword, setPlayerPassword] = useState(defaultAuctioneerPass);
  const [playerRole, setPlayerRole] = useState('auctioneer');
  const [playerPhotoUrl, setPlayerPhotoUrl] = useState(null);

  // Custom User State
  const [customForm, setCustomForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'auctioneer',
  });
  const [customPhotoUrl, setCustomPhotoUrl] = useState(null);
  const [isCustomEmailAuto, setIsCustomEmailAuto] = useState(true);

  // Directory UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});
  const [showCreatedPass, setShowCreatedPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // File input refs
  const playerFileInputRef = useRef(null);
  const customFileInputRef = useRef(null);
  const directoryFileInputRef = useRef(null);
  const [targetUploadEmail, setTargetUploadEmail] = useState(null);

  if (!isOpen || !can('canManageUsers')) return null;

  // Handle Player Selection with Automatic Unique Email Generation & Photo defaulting
  const handleSelectPlayer = (pId) => {
    setSelectedPlayerId(pId);
    if (!pId) {
      setPlayerEmail('');
      setPlayerPhotoUrl(null);
      return;
    }
    const player = players.find(p => p.id === pId);
    if (player) {
      const existingEmails = usersList.map(u => u.email);
      const uniqueEmail = generateUniqueNeplEmail(player.name, existingEmails);
      setPlayerEmail(uniqueEmail);
      setPlayerRole(player.isAuctioneer ? 'player' : 'auctioneer');
      setPlayerPhotoUrl(player.avatarUrl || null);
    }
  };

  // Convert / Modify Player Role Submit
  const handlePromotePlayerSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreatedCredentials(null);

    const player = players.find(p => p.id === selectedPlayerId);
    if (!player) {
      setError('Please select a player from the tournament pool to modify.');
      return;
    }

    if (!playerEmail.trim() || !playerPassword.trim()) {
      setError('Please provide a valid email and password for the user account.');
      return;
    }

    const isGranting = playerRole === 'auctioneer' || playerRole === 'superuser';

    try {
      // 1. Add / Update User in auth system (syncs to MongoDB Atlas & localStorage)
      const savedUser = addAuctioneer({
        name: player.name,
        email: playerEmail.trim(),
        password: playerPassword.trim(),
        role: playerRole,
        photoUrl: playerPhotoUrl,
      });

      // 2. Sync player profile in roster
      if (setPlayers) {
        const updatedPlayer = {
          ...player,
          isAuctioneer: isGranting,
          avatarUrl: playerPhotoUrl || player.avatarUrl,
        };
        setPlayers(prev => prev.map(p => p.id === player.id ? updatedPlayer : p));
        apiUpdatePlayer(player.id, updatedPlayer).catch(console.warn);
      }

      if (isGranting) {
        setSuccess(`✅ Successfully enabled "${player.name}" as ${playerRole === 'auctioneer' ? '🔨 Auctioneer' : '⚡ Super Admin'}!`);
        setCreatedCredentials({
          name: player.name,
          email: playerEmail.trim(),
          password: playerPassword.trim(),
          role: playerRole,
          photoUrl: playerPhotoUrl,
        });
      } else {
        setSuccess(`🚫 Disabled Auctioneer privileges for "${player.name}". Account set to Player (view-only).`);
      }

      setSelectedPlayerId('');
      setPlayerEmail('');
      setPlayerPassword(defaultAuctioneerPass);
      setPlayerPhotoUrl(null);
    } catch (err) {
      setError(err.message || 'Failed to update player account');
    }
  };

  // Custom User Name change: auto-generate unique email
  const handleCustomNameChange = (nameVal) => {
    const updatedForm = { ...customForm, name: nameVal };
    if (isCustomEmailAuto && nameVal.trim()) {
      const existingEmails = usersList.map(u => u.email);
      updatedForm.email = generateUniqueNeplEmail(nameVal, existingEmails);
    }
    setCustomForm(updatedForm);
  };

  // Custom User Submit
  const handleCustomSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreatedCredentials(null);

    if (!customForm.name.trim() || !customForm.email.trim() || !customForm.password.trim()) {
      setError('Please fill in all fields (Name, Email, Password)');
      return;
    }

    try {
      const newUser = addAuctioneer({
        name: customForm.name.trim(),
        email: customForm.email.trim(),
        password: customForm.password.trim(),
        role: customForm.role,
        photoUrl: customPhotoUrl,
      });

      setSuccess(`✅ User "${customForm.name}" created successfully and synced to database!`);
      setCreatedCredentials({
        name: customForm.name,
        email: customForm.email.trim(),
        password: customForm.password.trim(),
        role: customForm.role,
        photoUrl: customPhotoUrl,
      });

      setCustomForm({ name: '', email: '', password: '', role: 'auctioneer' });
      setCustomPhotoUrl(null);
      setIsCustomEmailAuto(true);
    } catch (err) {
      setError(err.message || 'Failed to add auctioneer');
    }
  };

  // Live Role Switcher for Existing Users
  const handleRoleChange = (email, newRole, userName) => {
    setError('');
    setSuccess('');
    try {
      const existingUser = usersList.find(u => u.email.toLowerCase() === email.toLowerCase());
      updateUserRole(email, newRole, existingUser?.password, existingUser?.photoUrl);

      // Sync player profile if demoted to player
      if (newRole === 'player' && setPlayers) {
        setPlayers(prev => prev.map(p => {
          if (p.name.toLowerCase() === userName.toLowerCase() || email.includes(p.name.toLowerCase().replace(/\s+/g, '.'))) {
            const updated = { ...p, isAuctioneer: false };
            apiUpdatePlayer(p.id, updated).catch(console.warn);
            return updated;
          }
          return p;
        }));
      }

      setSuccess(`Updated role for ${userName} (${email}) to ${newRole.toUpperCase()}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update user role');
    }
  };

  // Upload or update photo for existing user in directory
  const handleDirectoryPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !targetUploadEmail) return;

    compressImageFile(file, (dataUrl) => {
      try {
        const targetUser = usersList.find(u => u.email.toLowerCase() === targetUploadEmail.toLowerCase());
        if (targetUser) {
          updateUserRole(targetUser.email, targetUser.role, targetUser.password, dataUrl);
          setSuccess(`📸 Profile photo updated for ${targetUser.name}!`);
          setTimeout(() => setSuccess(''), 3500);
        }
      } catch (err) {
        setError(err.message || 'Failed to update user photo');
      } finally {
        setTargetUploadEmail(null);
        if (directoryFileInputRef.current) directoryFileInputRef.current.value = '';
      }
    });
  };

  // Toggle Disabled / Active Status
  const handleToggleDisabled = (email, userName) => {
    setError('');
    setSuccess('');
    try {
      const res = toggleUserDisabled(email);
      const stateText = res.isDisabled ? 'DISABLED 🚫' : 'ENABLED 🟢';
      setSuccess(`Account for ${userName} (${email}) is now ${stateText}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to toggle user status');
    }
  };

  // Revoke Auctioneer Access
  const handleRevoke = (email, userName) => {
    if (window.confirm(`Revoke Auctioneer access for "${userName}" (${email})? Their role will be downgraded to Player.`)) {
      handleRoleChange(email, 'player', userName);
    }
  };

  // Delete User
  const handleDelete = (email, name) => {
    if (window.confirm(`Are you sure you want to delete user "${name}" (${email})?`)) {
      try {
        deleteAuctioneer(email);
        setSuccess(`User "${name}" deleted successfully.`);
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.message || 'Failed to delete user');
      }
    }
  };

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Filtered users for directory
  const filteredUsers = usersList.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-warm-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="warm-card w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl p-5 sm:p-8 rounded-3xl border border-warm-700/60 space-y-6 relative max-h-[92vh] overflow-y-auto shadow-2xl my-auto">
        
        {/* Hidden File Input for Directory Photo Uploads */}
        <input 
          type="file" 
          ref={directoryFileInputRef} 
          onChange={handleDirectoryPhotoUpload} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-warm-700/50 pb-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-terracotta-600/20 text-terracotta-300 font-bold text-[10px] uppercase border border-terracotta-500/30 mb-1">
              <Shield className="w-3 h-3" />
              SUPER ADMIN CONSOLE
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-sand-100 flex items-center gap-2 font-sans tracking-tight">
              <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-terracotta-400" />
              Manage Auctioneers & User Credentials
            </h3>
            <p className="text-xs text-sand-400 mt-0.5">
              Unique <code className="text-cyan-300 font-mono">@nepl.in</code> addresses with auto-collision handling (-A, -B, -C) and profile photo uploads.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700 cursor-pointer transition hover:scale-105"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* New Credentials Card with 1-Click Copy & Photo Preview */}
        {createdCredentials && (
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/50 space-y-3 animate-fade-in shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {createdCredentials.photoUrl ? (
                  <img 
                    src={createdCredentials.photoUrl} 
                    alt={createdCredentials.name} 
                    className="w-8 h-8 rounded-full object-cover border-2 border-amber-400 shadow-md"
                  />
                ) : (
                  <Crown className="w-5 h-5 text-amber-400" />
                )}
                <span className="text-xs sm:text-sm font-bold text-amber-300">
                  New Credentials Generated for {createdCredentials.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nRole: ${createdCredentials.role}\nURL: ${window.location.origin}`, 'card')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer shadow"
              >
                {copiedKey === 'card' ? <Check className="w-3.5 h-3.5 text-emerald-950" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'card' ? 'Copied!' : 'Copy Credentials'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono bg-warm-950/80 p-3 rounded-xl border border-warm-800">
              <div>
                <span className="text-[10px] text-sand-500 block uppercase">Login Email (Unique)</span>
                <span className="text-cyan-300 font-bold break-all">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-sand-500 block uppercase">Password</span>
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <span className="tracking-widest">{showCreatedPass ? createdCredentials.password : '••••••••'}</span>
                  <button
                    type="button"
                    onClick={() => setShowCreatedPass(v => !v)}
                    className="p-0.5 text-sand-500 hover:text-amber-300 transition"
                    title={showCreatedPass ? "Hide password" : "Show password"}
                  >
                    {showCreatedPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-sand-500 block uppercase">Role Assigned</span>
                <span className="text-emerald-400 font-bold uppercase">{createdCredentials.role}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Wide Two-Column Grid on Desktop ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Promote Player / Invite User Form */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Tab Switcher */}
            <div className="flex rounded-2xl bg-warm-900/90 p-1 border border-warm-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('promote_player')}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'promote_player'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-sand-400 hover:text-sand-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Convert Player</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('custom_user')}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'custom_user'
                    ? 'bg-terracotta-600/20 text-terracotta-300 border border-terracotta-500/40 shadow-sm'
                    : 'text-sand-400 hover:text-sand-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite User</span>
              </button>
            </div>

            {/* TAB 1: Convert Player from Pool */}
            {activeTab === 'promote_player' && (
              <div className="bg-warm-900/70 p-5 rounded-2xl border border-amber-500/30 space-y-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-amber-300 flex items-center gap-2 font-sans">
                    <Gavel className="w-4 h-4 text-amber-400" />
                    Select Tournament Player
                  </h4>
                  <p className="text-[11px] text-sand-400 mt-1">
                    Converts any registered tournament player into an active <strong>Auction Member</strong> with auto-generated unique login credentials.
                  </p>
                </div>

                <form onSubmit={handlePromotePlayerSubmit} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-sand-300 block mb-1">
                      Choose Player from Roster ({players.length} Available)
                    </label>
                    <select
                      value={selectedPlayerId}
                      onChange={(e) => handleSelectPlayer(e.target.value)}
                      className="warm-input cursor-pointer text-xs"
                      required
                    >
                      <option value="">-- Choose a player --</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.role} {p.isAuctioneer ? '(Already Auctioneer)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Profile Photo Upload for Auctioneer */}
                  <div className="p-3 rounded-xl bg-warm-950/60 border border-warm-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sand-300 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-amber-400" />
                        Auctioneer Profile Photo
                      </span>
                      {playerPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setPlayerPhotoUrl(null)}
                          className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-2xl bg-warm-900 border border-warm-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {playerPhotoUrl ? (
                          <img 
                            src={playerPhotoUrl} 
                            alt="Profile Preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">🔨</span>
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <input
                          type="file"
                          ref={playerFileInputRef}
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) compressImageFile(f, setPlayerPhotoUrl);
                          }}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => playerFileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warm-800 hover:bg-warm-700 border border-warm-600 text-sand-200 text-xs font-medium cursor-pointer transition"
                        >
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          <span>{playerPhotoUrl ? 'Change Photo' : 'Upload Profile Photo'}</span>
                        </button>
                        <p className="text-[10px] text-sand-500">
                          JPG/PNG/WEBP • Automatically resized & stored with credentials
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-warm-800">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-sand-300">
                          Unique Login Email Address
                        </label>
                        <span className="text-[10px] text-cyan-400 flex items-center gap-1 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                          <Sparkles className="w-2.5 h-2.5" />
                          Auto-generated
                        </span>
                      </div>
                      <input
                        type="email"
                        value={playerEmail}
                        onChange={(e) => setPlayerEmail(e.target.value)}
                        className="warm-input font-mono text-xs text-cyan-300"
                        placeholder="first.surname@nepl.in"
                        required
                      />
                      <p className="text-[10px] text-sand-500 mt-1">
                        Format: <code className="text-sand-400">&lt;first_name&gt;.&lt;surname&gt;@nepl.in</code> (colliding names receive <code className="text-amber-400">-A</code>, <code className="text-amber-400">-B</code>, etc.)
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-sand-300 block mb-1">Assign Access Role</label>
                        <select
                          value={playerRole}
                          onChange={(e) => setPlayerRole(e.target.value)}
                          className="warm-input cursor-pointer text-xs"
                        >
                          <option value="auctioneer">🔨 Auction Member</option>
                          <option value="superuser">⚡ Super Admin</option>
                          <option value="player">🏏 Player (View Only)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-sand-300 block mb-1">Login Password</label>
                        <input
                          type="text"
                          value={playerPassword}
                          onChange={(e) => setPlayerPassword(e.target.value)}
                          className="warm-input font-mono text-xs text-amber-300 font-bold"
                          placeholder="Password..."
                          required
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={!selectedPlayerId}
                        className="btn-primary flex items-center gap-2 cursor-pointer text-xs px-5 py-2.5 disabled:opacity-50"
                      >
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>Grant Auctioneer Access</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: Custom User Invitation */}
            {activeTab === 'custom_user' && (
              <div className="bg-warm-900/70 p-5 rounded-2xl border border-terracotta-500/30 space-y-4">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-terracotta-300 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-terracotta-400" />
                    Create Custom User Account
                  </h4>
                  <p className="text-[11px] text-sand-400 mt-1">
                    Add a dedicated official, auctioneer, or guest account with automatic email formatting and photo upload.
                  </p>
                </div>

                <form onSubmit={handleCustomSubmit} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-sand-300 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={customForm.name}
                      onChange={(e) => handleCustomNameChange(e.target.value)}
                      className="warm-input text-xs"
                      placeholder="e.g. Amit Patil"
                      required
                    />
                  </div>

                  {/* Profile Photo Upload */}
                  <div className="p-3 rounded-xl bg-warm-950/60 border border-warm-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sand-300 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-terracotta-400" />
                        Profile Photo Upload
                      </span>
                      {customPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setCustomPhotoUrl(null)}
                          className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-2xl bg-warm-900 border border-warm-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {customPhotoUrl ? (
                          <img 
                            src={customPhotoUrl} 
                            alt="Custom Preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">
                            {customForm.role === 'suprememaster' ? '👑' : customForm.role === 'superuser' ? '⚡' : customForm.role === 'auctioneer' ? '🔨' : '🏏'}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <input
                          type="file"
                          ref={customFileInputRef}
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) compressImageFile(f, setCustomPhotoUrl);
                          }}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => customFileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warm-800 hover:bg-warm-700 border border-warm-600 text-sand-200 text-xs font-medium cursor-pointer transition"
                        >
                          <Upload className="w-3.5 h-3.5 text-terracotta-400" />
                          <span>{customPhotoUrl ? 'Change Photo' : 'Upload Profile Photo'}</span>
                        </button>
                        <p className="text-[10px] text-sand-500">
                          Auto-scaled to high-quality lightweight avatar
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-sand-300">
                        Generated Email Address (@nepl.in)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (customForm.name.trim()) {
                            const existingEmails = usersList.map(u => u.email);
                            const autoGen = generateUniqueNeplEmail(customForm.name, existingEmails);
                            setCustomForm(prev => ({ ...prev, email: autoGen }));
                            setIsCustomEmailAuto(true);
                          }
                        }}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                        title="Regenerate unique NEPL email"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        Auto-generate
                      </button>
                    </div>
                    <input
                      type="email"
                      value={customForm.email}
                      onChange={(e) => {
                        setIsCustomEmailAuto(false);
                        setCustomForm(prev => ({ ...prev, email: e.target.value }));
                      }}
                      className="warm-input text-xs font-mono text-cyan-300"
                      placeholder="e.g. amit.patil@nepl.in"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-sand-300 block mb-1">Access Role</label>
                      <select
                        value={customForm.role}
                        onChange={(e) => setCustomForm(prev => ({ ...prev, role: e.target.value }))}
                        className="warm-input cursor-pointer text-xs"
                      >
                        <option value="auctioneer">🔨 Auction Member</option>
                        <option value="superuser">⚡ Super Admin</option>
                        <option value="player">🏏 Player (View Only)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-sand-300 block mb-1">Password</label>
                      <input
                        type="text"
                        value={customForm.password}
                        onChange={(e) => setCustomForm(prev => ({ ...prev, password: e.target.value }))}
                        className="warm-input font-mono text-xs text-amber-300 font-bold"
                        placeholder="Secret password"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="btn-primary flex items-center gap-2 cursor-pointer text-xs px-5 py-2.5"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Create User Account</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>

          {/* Right Column: Existing Users Directory & Real-Time Role Switcher */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-warm-800 pb-2 gap-2">
              <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-sand-200 flex items-center gap-2 font-sans">
                <UserCheck2 className="w-4 h-4 text-terracotta-400" />
                <span>Registered Accounts & Live Permissions ({usersList.length})</span>
              </h4>
              
              {/* Search Bar */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-sand-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter users..."
                  className="w-full bg-warm-950 border border-warm-800 rounded-xl pl-8 pr-3 py-1 text-xs text-sand-200 placeholder-sand-600 focus:outline-none focus:border-terracotta-500"
                />
              </div>
            </div>

            <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            {filteredUsers.map((u) => {
              const roleCfg = getRoleConfig(u.role);
              const isCurrentUser = currentUser?.email.toLowerCase() === u.email.toLowerCase();
              const isPassVisible = showPasswords[u.email];

              return (
                <div
                  key={u.id || u.email}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition gap-3 ${
                    u.isDisabled 
                      ? 'bg-red-950/20 border-red-500/30 opacity-75' 
                      : 'bg-warm-900/80 border-warm-800 hover:border-warm-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* User Profile Photo or Emoji Avatar with Camera update button */}
                    <div className="relative group/photo shrink-0">
                      {u.photoUrl ? (
                        <img 
                          src={u.photoUrl} 
                          alt={u.name} 
                          className="w-11 h-11 rounded-2xl object-cover border border-warm-700 shadow-md group-hover/photo:border-amber-400 transition"
                        />
                      ) : (
                        <span className="text-2xl p-2 bg-warm-950 rounded-xl border border-warm-800 flex items-center justify-center w-11 h-11 shrink-0">
                          {u.avatar}
                        </span>
                      )}

                      {/* Quick Photo Upload Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          setTargetUploadEmail(u.email);
                          directoryFileInputRef.current?.click();
                        }}
                        className="absolute inset-0 rounded-2xl bg-slate-950/80 opacity-0 group-hover/photo:opacity-100 flex flex-col items-center justify-center text-amber-300 text-[9px] font-bold transition cursor-pointer"
                        title={`Upload / Change Photo for ${u.name}`}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Photo</span>
                      </button>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h5 className="font-bold text-sand-100 text-sm truncate">{u.name}</h5>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 rounded bg-terracotta-600/20 text-terracotta-300 text-[9px] font-bold uppercase border border-terracotta-500/30 shrink-0">
                            You
                          </span>
                        )}
                        {u.isDisabled ? (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[9px] font-bold uppercase border border-red-500/40 shrink-0 flex items-center gap-1">
                            <Ban className="w-2.5 h-2.5" />
                            Disabled
                          </span>
                        ) : u.isDefault ? (
                          <span className="px-2 py-0.5 rounded bg-warm-800 text-sand-500 text-[9px] font-mono border border-warm-700 shrink-0">
                            Default
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-mono border border-emerald-500/20 shrink-0">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-sand-400 font-mono truncate">{u.email}</span>
                        {u.isDefault ? (
                          <span className="text-[10px] text-cyan-400/80 font-mono bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">
                            🔒 ENV
                          </span>
                        ) : u.password ? (
                          <>
                            <span className="text-[11px] text-amber-400/80 font-mono">
                              • {isPassVisible ? u.password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, [u.email]: !prev[u.email] }))}
                              className="text-sand-600 hover:text-sand-300 transition cursor-pointer"
                              title={isPassVisible ? 'Hide Password' : 'Show Password'}
                            >
                              {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Role Selector Dropdown & Actions */}
                  <div className="flex items-center justify-end space-x-2 shrink-0">
                    {/* Live Role Switcher Dropdown */}
                    <select
                      value={u.role}
                      disabled={u.role === 'suprememaster'}
                      onChange={(e) => handleRoleChange(u.email, e.target.value, u.name)}
                      className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border cursor-pointer transition ${roleCfg.bgColor} ${roleCfg.textColor} ${roleCfg.borderColor} disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      <option value="auctioneer">🔨 Auction Member</option>
                      <option value="superuser">⚡ Super Admin</option>
                      <option value="player">🏏 Player (View Only)</option>
                      {u.role === 'suprememaster' && (
                        <option value="suprememaster">👑 Supreme Master</option>
                      )}
                    </select>

                    {/* Disable / Enable Toggle Button */}
                    {!isCurrentUser && (
                      <button
                        type="button"
                        onClick={() => handleToggleDisabled(u.email, u.name)}
                        className={`p-2 rounded-xl border transition cursor-pointer ${
                          u.isDisabled
                            ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border-emerald-500/40'
                            : 'bg-warm-950 hover:bg-red-950/60 text-sand-400 hover:text-red-400 border-warm-800'
                        }`}
                        title={u.isDisabled ? `Enable access for ${u.name}` : `Disable/Block access for ${u.name}`}
                      >
                        {u.isDisabled ? <Power className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {/* Quick Revoke Button for Auctioneer role */}
                    {u.role === 'auctioneer' && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(u.email, u.name)}
                        className="px-2.5 py-1.5 rounded-xl bg-warm-950 hover:bg-amber-950/60 text-amber-400/80 hover:text-amber-300 border border-warm-800 hover:border-amber-500/40 text-[10px] font-bold uppercase transition cursor-pointer"
                        title={`Revoke Auctioneer role for ${u.name} (set to Player)`}
                      >
                        Revoke
                      </button>
                    )}

                    {/* Copy Creds */}
                    <button
                      type="button"
                      onClick={() => handleCopy(u.isDefault ? `Email: ${u.email}\nRole: ${u.role}\n(Password set via environment variable)` : `Email: ${u.email}\nPassword: ${u.password}\nRole: ${u.role}`, u.email)}
                      className="p-2 rounded-xl bg-warm-950 hover:bg-warm-800 text-sand-400 hover:text-sand-100 border border-warm-800 transition cursor-pointer"
                      title="Copy Login Details"
                    >
                      {copiedKey === u.email ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {/* Delete button (cannot delete built-in primary superadmin) */}
                    {!u.isDefault ? (
                      <button
                        onClick={() => handleDelete(u.email, u.name)}
                        className="p-2 rounded-xl bg-warm-950 hover:bg-red-950/60 text-sand-500 hover:text-red-400 border border-warm-800 hover:border-red-500/30 transition cursor-pointer"
                        title={`Delete user ${u.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="p-2 text-sand-700" title="Primary account cannot be deleted">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className="p-6 text-center text-sand-500 text-xs">
                No registered accounts match "{searchQuery}".
              </div>
            )}
            </div>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}
