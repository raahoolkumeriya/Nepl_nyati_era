import React, { useState } from 'react';
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
  UserX,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getRoleConfig } from '../services/auth';
import { updatePlayer as apiUpdatePlayer } from '../services/api';

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
  
  const defaultAuctioneerPass = (import.meta.env.VITE_AUCTIONEER_PASS || '').trim();
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [playerPassword, setPlayerPassword] = useState(defaultAuctioneerPass);
  const [playerRole, setPlayerRole] = useState('auctioneer');
  const [tagProfileAsAuctioneer, setTagProfileAsAuctioneer] = useState(true);

  // Custom User State
  const [customForm, setCustomForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'auctioneer',
  });

  const [copiedKey, setCopiedKey] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState(null);

  if (!isOpen || !can('canManageUsers')) return null;

  // Handle Player Selection
  const handleSelectPlayer = (pId) => {
    setSelectedPlayerId(pId);
    if (!pId) {
      setPlayerEmail('');
      return;
    }
    const player = players.find(p => p.id === pId);
    if (player) {
      const cleanName = player.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '.');
      setPlayerEmail(`${cleanName}@nepl.in`);
      setPlayerRole(player.isAuctioneer ? 'player' : 'auctioneer');
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
      // 1. Add / Update User in auth system
      addAuctioneer({
        name: player.name,
        email: playerEmail.trim(),
        password: playerPassword.trim(),
        role: playerRole,
      });

      // 2. Sync player profile
      if (setPlayers) {
        const updatedPlayer = {
          ...player,
          isAuctioneer: isGranting,
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
        });
      } else {
        setSuccess(`🚫 Disabled Auctioneer privileges for "${player.name}". Account set to Player (view-only).`);
      }

      setSelectedPlayerId('');
      setPlayerEmail('');
      setPlayerPassword(defaultAuctioneerPass);
    } catch (err) {
      setError(err.message || 'Failed to update player account');
    }
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
      addAuctioneer(customForm);
      setSuccess(`User "${customForm.name}" added successfully!`);
      setCreatedCredentials({
        name: customForm.name,
        email: customForm.email.trim(),
        password: customForm.password.trim(),
        role: customForm.role,
      });
      setCustomForm({ name: '', email: '', password: '', role: 'auctioneer' });
    } catch (err) {
      setError(err.message || 'Failed to add auctioneer');
    }
  };

  // Live Role Switcher for Existing Users
  const handleRoleChange = (email, newRole, userName) => {
    setError('');
    setSuccess('');
    try {
      updateUserRole(email, newRole);

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

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-warm-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="warm-card w-full max-w-2xl p-6 sm:p-8 rounded-3xl border border-warm-700/60 space-y-6 relative max-h-[90vh] overflow-y-auto shadow-2xl my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-warm-700/50 pb-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-terracotta-600/20 text-terracotta-300 font-bold text-[10px] uppercase border border-terracotta-500/30 mb-1">
              <Shield className="w-3 h-3" />
              SUPER ADMIN CONSOLE
            </div>
            <h3 className="text-xl font-black text-sand-100 flex items-center gap-2 font-serif">
              <UserCheck className="w-5 h-5 text-terracotta-400" />
              Manage Auctioneers & Player Access
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-cricket-emerald/15 border border-cricket-emerald/40 text-cricket-emerald text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cricket-emerald" />
            <span>{success}</span>
          </div>
        )}

        {/* New Credentials Card with 1-Click Copy */}
        {createdCredentials && (
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/50 space-y-3 animate-fade-in shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                New Login Credentials for {createdCredentials.name}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nRole: ${createdCredentials.role}\nURL: ${window.location.origin}`, 'card')}
                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                {copiedKey === 'card' ? <Check className="w-3.5 h-3.5 text-emerald-950" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'card' ? 'Copied!' : 'Copy Credentials'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono bg-warm-950/70 p-3 rounded-xl border border-warm-800">
              <div>
                <span className="text-[10px] text-sand-500 block">EMAIL / USERNAME</span>
                <span className="text-sand-100 font-bold">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-sand-500 block">PASSWORD</span>
                <span className="text-amber-400 font-bold">{createdCredentials.password}</span>
              </div>
              <div>
                <span className="text-[10px] text-sand-500 block">ROLE ASSIGNED</span>
                <span className="text-cricket-emerald font-bold uppercase">{createdCredentials.role}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex rounded-2xl bg-warm-900/90 p-1 border border-warm-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('promote_player')}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'promote_player'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-sand-400 hover:text-sand-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ Convert Player to Auctioneer</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom_user')}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'custom_user'
                ? 'bg-terracotta-600/20 text-terracotta-300 border border-terracotta-500/40 shadow-sm'
                : 'text-sand-400 hover:text-sand-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>➕ Invite Custom User</span>
          </button>
        </div>

        {/* TAB 1: Convert Player from Pool */}
        {activeTab === 'promote_player' && (
          <div className="bg-warm-900/70 p-5 rounded-2xl border border-amber-500/30 space-y-4">
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <Gavel className="w-4 h-4 text-amber-400" />
                Select Tournament Player to Grant Auctioneer Access
              </h4>
              <p className="text-[11px] text-sand-400 mt-1">
                Converts any registered tournament player into an active <strong>Auction Member</strong> or <strong>Super Admin</strong> with full console access.
              </p>
            </div>

            <form onSubmit={handlePromotePlayerSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-sand-300 block mb-1">
                  Choose Player from Tournament Pool ({players.length} Players)
                </label>
                <select
                  value={selectedPlayerId}
                  onChange={e => handleSelectPlayer(e.target.value)}
                  className="warm-input cursor-pointer font-sans"
                  required
                >
                  <option value="">-- Select Player to Promote --</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.role} ({p.category}) {p.isAuctioneer ? '⚡ [Already Auctioneer]' : ''} {p.isCaptain ? '👑 [Captain]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1">Generated Login Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul.kumeriya@nepl.in"
                    value={playerEmail}
                    onChange={e => setPlayerEmail(e.target.value)}
                    className="warm-input font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1">Login Password</label>
                  <input
                    type="text"
                    required
                    value={playerPassword}
                    onChange={e => setPlayerPassword(e.target.value)}
                    className="warm-input font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1">Grant Access Role</label>
                  <select
                    value={playerRole}
                    onChange={e => setPlayerRole(e.target.value)}
                    className="warm-input cursor-pointer"
                  >
                    <option value="auctioneer">🔨 Auction Member (Bidding Console)</option>
                    <option value="superuser">⚡ Super Admin (Bidding, Hammer Sold & Management)</option>
                    <option value="player">🏏 Player (Roster View Only)</option>
                  </select>
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={tagProfileAsAuctioneer}
                      onChange={e => setTagProfileAsAuctioneer(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-xs text-sand-300">
                      Tag player profile as <strong>Auctioneer</strong> in database
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!selectedPlayerId}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Zap className="w-4 h-4" />
                  <span>Convert Player & Grant Login</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: Custom User Registration */}
        {activeTab === 'custom_user' && (
          <div className="bg-warm-900/70 p-5 rounded-2xl border border-warm-700/50 space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#c9a227] flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add Custom User Credentials
            </h4>

            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Sharma"
                    value={customForm.name}
                    onChange={e => setCustomForm({ ...customForm, name: e.target.value })}
                    className="warm-input"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. vikram@nepl.in"
                    value={customForm.email}
                    onChange={e => setCustomForm({ ...customForm, email: e.target.value })}
                    className="warm-input font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1">Password</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AuctionPass2026"
                    value={customForm.password}
                    onChange={e => setCustomForm({ ...customForm, password: e.target.value })}
                    className="warm-input font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1">Access Role</label>
                  <select
                    value={customForm.role}
                    onChange={e => setCustomForm({ ...customForm, role: e.target.value })}
                    className="warm-input cursor-pointer"
                  >
                    <option value="auctioneer">🔨 Auction Member (Bidding Console)</option>
                    <option value="player">🏏 Player (Roster View Only)</option>
                    <option value="superuser">⚡ Super Admin (Bidding, Hammer Sold & Management)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create User Account</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Existing Users Directory with LIVE ROLE SWITCHER */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-warm-800 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sand-300 flex items-center gap-2">
              <UserCheck2 className="w-4 h-4 text-terracotta-400" />
              <span>Registered Accounts & Live Role Switcher ({usersList.length})</span>
            </h4>
            <span className="text-[10px] text-sand-500 font-mono">Real-time Permissions</span>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {usersList.map((u) => {
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
                    <span className="text-2xl p-2 bg-warm-950 rounded-xl border border-warm-800 shrink-0">{u.avatar}</span>
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
                        <span className="text-xs text-sand-500 font-mono truncate">{u.email}</span>
                        {u.isDefault ? (
                          <span className="text-[10px] text-cyan-400/80 font-mono bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">
                            🔒 Configured in ENV
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
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
