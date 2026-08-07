import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Trash2, Shield, UserCheck, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getRoleConfig } from '../services/auth';

export default function AuctioneerManagerModal({ isOpen, onClose }) {
  const { usersList, addAuctioneer, deleteAuctioneer, can, user: currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'auctioneer',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || !can('canManageUsers')) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Please fill in all fields (Name, Email, Password)');
      return;
    }

    try {
      addAuctioneer(formData);
      setSuccess(`Auctioneer "${formData.name}" added successfully!`);
      setFormData({ name: '', email: '', password: '', role: 'auctioneer' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to add auctioneer');
    }
  };

  const handleDelete = (email, name) => {
    if (window.confirm(`Are you sure you want to delete auctioneer/user "${name}" (${email})?`)) {
      try {
        deleteAuctioneer(email);
        setSuccess(`User "${name}" deleted successfully.`);
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err.message || 'Failed to delete user');
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-warm-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="warm-card w-full max-w-2xl p-6 sm:p-8 rounded-3xl border border-warm-700/60 space-y-6 relative max-h-[90vh] overflow-y-auto shadow-2xl my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-warm-700/50 pb-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-terracotta-600/20 text-terracotta-300 font-bold text-[10px] uppercase border border-terracotta-500/30 mb-1">
              <Shield className="w-3 h-3" />
              SUPER ADMIN RESTRICTED
            </div>
            <h3 className="text-xl font-black text-sand-100 flex items-center gap-2 font-serif">
              <UserCheck className="w-5 h-5 text-terracotta-400" />
              Manage Auctioneers & Access Control
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700"
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

        {/* Add New Auctioneer Form */}
        <div className="bg-warm-900/70 p-5 rounded-2xl border border-warm-700/50 space-y-4">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#c9a227] flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Add New Auctioneer / Authorized User
          </h4>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-sand-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Vikram Sharma"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="warm-input"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-sand-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. vikram@nepl.in"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="warm-input font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-sand-400 block mb-1">Password</label>
                <input
                  type="text"
                  placeholder="e.g. AuctionPass2024"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="warm-input font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-sand-400 block mb-1">Access Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="warm-input cursor-pointer"
                >
                  <option value="auctioneer">🔨 Auction Member (Bidding & Selling)</option>
                  <option value="player">🏏 Player (Roster View Only)</option>
                  <option value="superuser">⚡ Super Admin (Full Control)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="btn-primary flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Auctioneer</span>
              </button>
            </div>
          </form>
        </div>

        {/* Existing Users Directory */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-sand-500 flex items-center justify-between">
            <span>Registered Auctioneers & Users ({usersList.length})</span>
            <span className="text-[10px] text-sand-600 font-mono">Super Admin Rights</span>
          </h4>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {usersList.map((u) => {
              const roleCfg = getRoleConfig(u.role);
              const isCurrentUser = currentUser?.email.toLowerCase() === u.email.toLowerCase();

              return (
                <div
                  key={u.id || u.email}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-warm-900/80 border border-warm-800/80 hover:border-warm-700 transition"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl p-2 bg-warm-950 rounded-xl border border-warm-800">{u.avatar}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h5 className="font-bold text-sand-100 text-sm">{u.name}</h5>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 rounded bg-terracotta-600/20 text-terracotta-300 text-[9px] font-bold uppercase border border-terracotta-500/30">
                            You
                          </span>
                        )}
                        {u.isDefault && (
                          <span className="px-2 py-0.5 rounded bg-warm-800 text-sand-500 text-[9px] font-mono border border-warm-700">
                            Built-in
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-sand-500 font-mono">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border ${roleCfg.bgColor} ${roleCfg.textColor} ${roleCfg.borderColor}`}>
                      {roleCfg.label}
                    </span>

                    {/* Delete button (cannot delete built-in superadmin) */}
                    {!u.isDefault ? (
                      <button
                        onClick={() => handleDelete(u.email, u.name)}
                        className="p-2 rounded-xl bg-warm-950 hover:bg-red-950/60 text-sand-500 hover:text-red-400 border border-warm-800 hover:border-red-500/30 transition"
                        title={`Delete auctioneer ${u.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="p-2 text-sand-700" title="Built-in account cannot be deleted">
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
