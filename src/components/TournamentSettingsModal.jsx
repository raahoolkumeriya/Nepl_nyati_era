import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Trophy, 
  X, 
  Save, 
  Sparkles, 
  Check, 
  Globe, 
  Image as ImageIcon, 
  Tag, 
  RotateCcw,
  ShieldCheck,
  Radio,
  Coins,
  ArrowUpRight,
  Users,
  Wallet
} from 'lucide-react';
import { useTournament } from '../context/TournamentContext';
import { savePlayers, saveTeams } from '../services/api';

export default function TournamentSettingsModal({ isOpen, onClose, players = [], setPlayers, teams = [], setTeams }) {
  const { tournamentSettings, updateTournamentSettings } = useTournament();

  const [formData, setFormData] = useState({
    tournamentName: tournamentSettings?.tournamentName || 'Criclocked',
    subtitle: tournamentSettings?.subtitle || 'Box Cricket League',
    shortCode: tournamentSettings?.shortCode || 'CRIC',
    edition: tournamentSettings?.edition || '2026',
    logoUrl: tournamentSettings?.logoUrl || '/cricklocked_logo.png',
    defaultBasePrice: tournamentSettings?.defaultBasePrice || 100,
    bidIncrementStep: tournamentSettings?.bidIncrementStep || 100,
    startupPurse: tournamentSettings?.startupPurse || 10000,
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [applyingPurseBulk, setApplyingPurseBulk] = useState(false);

  useEffect(() => {
    if (tournamentSettings) {
      setFormData({
        tournamentName: tournamentSettings.tournamentName || 'Nyati Era',
        subtitle: tournamentSettings.subtitle || 'Box Cricket League',
        shortCode: tournamentSettings.shortCode || 'NEPL',
        edition: tournamentSettings.edition || '2026',
        logoUrl: tournamentSettings.logoUrl || '/nyati_era_logo.png',
        defaultBasePrice: tournamentSettings.defaultBasePrice || 100,
        bidIncrementStep: tournamentSettings.bidIncrementStep || 100,
        startupPurse: tournamentSettings.startupPurse || 10000,
      });
    }
  }, [tournamentSettings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tournamentName.trim()) {
      alert('Tournament Name cannot be empty!');
      return;
    }

    setSaving(true);
    setSuccess('');
    try {
      await updateTournamentSettings({
        tournamentName: formData.tournamentName.trim(),
        subtitle: formData.subtitle.trim() || 'Box Cricket League',
        shortCode: formData.shortCode.trim().toUpperCase() || 'NEPL',
        edition: formData.edition.trim() || '2026',
        logoUrl: formData.logoUrl.trim() || '/nyati_era_logo.png',
        defaultBasePrice: Math.max(1, Number(formData.defaultBasePrice) || 100),
        bidIncrementStep: Math.max(1, Number(formData.bidIncrementStep) || 100),
        startupPurse: Math.max(1, Number(formData.startupPurse) || 10000),
      });

      setSuccess('✅ Tournament branding, bidding rules & startup purse updated and broadcasted to all users!');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1400);
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyBasePriceToPlayers = async () => {
    const targetPrice = Math.max(1, Number(formData.defaultBasePrice) || 100);
    const eligiblePlayers = (players || []).filter(p => p.status !== 'sold');
    if (eligiblePlayers.length === 0) {
      alert('No available or unsold players found to update.');
      return;
    }

    if (!window.confirm(`Bulk Update Base Price:\n\nSet Base Price to ₹${targetPrice.toLocaleString()} PTS for all ${eligiblePlayers.length} available/unsold players?\n\n(Sold players will not be altered)`)) {
      return;
    }

    setApplyingBulk(true);
    try {
      const updatedPlayers = (players || []).map(p => {
        if (p.status !== 'sold') {
          return {
            ...p,
            basePrice: targetPrice,
            currentBid: (p.currentBid && p.currentBid > targetPrice) ? p.currentBid : targetPrice
          };
        }
        return p;
      });

      if (setPlayers) setPlayers(updatedPlayers);
      await savePlayers(updatedPlayers);
      alert(`✅ Successfully updated ${eligiblePlayers.length} players to Base Price ₹${targetPrice.toLocaleString()} PTS!`);
    } catch (err) {
      alert('Failed to bulk update players: ' + err.message);
    } finally {
      setApplyingBulk(false);
    }
  };

  const handleApplyStartupPurseToTeams = async () => {
    const targetPurse = Math.max(1, Number(formData.startupPurse) || 10000);
    if (!teams || teams.length === 0) {
      alert('No franchise teams found to update.');
      return;
    }

    if (!window.confirm(`Bulk Update Team Total Budget (Startup Purse):\n\nSet Total Budget to ₹${targetPurse.toLocaleString()} PTS for all ${teams.length} teams?\n\n(Spent budget and player squads will remain intact, remaining purse will adjust automatically)`)) {
      return;
    }

    setApplyingPurseBulk(true);
    try {
      const updatedTeams = teams.map(t => ({
        ...t,
        totalPurse: targetPurse
      }));

      if (setTeams) setTeams(updatedTeams);
      await saveTeams(updatedTeams);
      alert(`✅ Successfully updated Startup Purse / Total Budget to ₹${targetPurse.toLocaleString()} PTS for all ${teams.length} franchise teams!`);
    } catch (err) {
      alert('Failed to bulk update team budgets: ' + err.message);
    } finally {
      setApplyingPurseBulk(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset branding back to default "Criclocked - Box Cricket League"?')) {
      setFormData({
        tournamentName: 'Criclocked',
        subtitle: 'Box Cricket League',
        shortCode: 'CRIC',
        edition: '2026',
        logoUrl: '/cricklocked_logo.png',
        defaultBasePrice: 100,
        bidIncrementStep: 100,
        startupPurse: 10000,
      });
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative my-auto mx-auto w-full max-w-2xl bg-[#141413] border border-stone-800 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh] text-stone-100 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-800 flex items-center justify-between bg-[#1c1b1a]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#cc785c]/20 border border-[#cc785c]/40 flex items-center justify-center text-[#cc785c]">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-sand-100 font-sans tracking-tight flex items-center gap-2">
                <span>Tournament Brand & Global Identity</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-widest font-mono">
                  Supreme Master
                </span>
              </h3>
              <p className="text-xs text-stone-400 font-sans">
                Set tournament name rendered live across Admin, Player, Auctioneer, and TV views
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5 overflow-y-auto flex-1">
          {success && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Live Preview Card */}
          <div className="bg-[#1c1b1a] p-4 rounded-2xl border border-stone-800 space-y-2">
            <span className="text-[10px] text-stone-400 font-mono uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-[#cc785c] animate-pulse" />
              <span>Live Navbar & TV Preview</span>
            </span>

            <div className="flex items-center space-x-3 bg-[#141413] p-3 rounded-xl border border-stone-800/90 shadow-sm">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/95 p-1 border-2 border-[#cc785c]/40 flex items-center justify-center shrink-0">
                <img
                  src={formData.logoUrl || '/nyati_era_logo.png'}
                  alt="Preview Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.src = '/nyati_era_logo.png'; }}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-base sm:text-lg font-black tracking-tight text-white font-sans truncate">
                    {formData.tournamentName || 'Tournament Name'}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-[#cc785c]/20 text-[#cc785c] border border-[#cc785c]/30 text-[10px] font-mono font-bold shrink-0">
                    {formData.shortCode || 'NEPL'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-400 font-semibold mt-0.5">
                  <span className="uppercase text-[11px] tracking-wider text-amber-300 font-extrabold">
                    {formData.subtitle || 'Box Cricket League'}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-stone-300">{formData.edition || '2026'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tournament Main Name */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5 font-sans">
                <Trophy className="w-3.5 h-3.5 text-[#cc785c]" />
                <span>Tournament Name *</span>
              </label>
              <input
                type="text"
                required
                value={formData.tournamentName}
                onChange={(e) => setFormData({ ...formData, tournamentName: e.target.value })}
                placeholder="e.g. Nyati Era, Champions League, Premier Cup"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-sand-100 text-sm focus:outline-none focus:border-[#cc785c] transition font-sans font-bold"
              />
              <span className="text-[11px] text-stone-500 block">
                Primary name rendered on the Navbar, TV projector header, and login screen.
              </span>
            </div>

            {/* Subtitle / League Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5 font-sans">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>League Subtitle / Format</span>
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="e.g. Box Cricket League, T10 Championship"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-sand-100 text-sm focus:outline-none focus:border-[#cc785c] transition font-sans"
              />
            </div>

            {/* Short Code / Acronym */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5 font-sans">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span>Acronym / Short Code</span>
              </label>
              <input
                type="text"
                maxLength={8}
                value={formData.shortCode}
                onChange={(e) => setFormData({ ...formData, shortCode: e.target.value.toUpperCase() })}
                placeholder="e.g. NEPL, BCL, IPL"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-sand-100 text-sm focus:outline-none focus:border-[#cc785c] transition font-mono uppercase font-bold"
              />
            </div>

            {/* Edition / Season Year */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5 font-sans">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Edition / Season</span>
              </label>
              <input
                type="text"
                value={formData.edition}
                onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                placeholder="e.g. 2026, Season 1, Summer 2026"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-sand-100 text-sm focus:outline-none focus:border-[#cc785c] transition font-sans"
              />
            </div>

            {/* Logo Image URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5 font-sans">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Logo Image Path or URL</span>
              </label>
              <input
                type="text"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="/nyati_era_logo.png or https://..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-sand-100 text-sm focus:outline-none focus:border-[#cc785c] transition font-mono text-xs"
              />
            </div>
          </div>

          {/* ── Bidding Slabs & Base Price Control ── */}
          <div className="bg-[#1c1b1a] p-4 sm:p-5 rounded-2xl border border-cyan-500/40 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <Coins className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white font-sans flex items-center gap-2">
                    <span>Player Base Price & Bid Escalation</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                      Super Admin Controlled
                    </span>
                  </h4>
                  <p className="text-[11px] text-stone-400 font-sans">
                    Configure tournament player base price and bid increment growth steps.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Default Base Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-cyan-300 flex items-center justify-between font-sans">
                  <span>Default Base Price (PTS)</span>
                  <span className="text-[10px] text-stone-400 font-mono">Starting Bid</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400 font-bold font-mono">₹</span>
                  <input
                    type="number"
                    min={1}
                    step="any"
                    value={formData.defaultBasePrice}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value) || 0);
                      setFormData({
                        ...formData,
                        defaultBasePrice: val,
                      });
                    }}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-emerald-400 text-sm font-mono font-bold focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[100, 500, 1000, 5000, 10000, 20000, 50000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          defaultBasePrice: amt,
                          bidIncrementStep: amt
                        });
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border ${
                        formData.defaultBasePrice === amt 
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black scale-105'
                          : 'bg-stone-900 text-stone-400 border-stone-800 hover:border-cyan-400 hover:text-cyan-300'
                      }`}
                    >
                      ₹{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bid Increment Step */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-300 flex items-center justify-between font-sans">
                  <span>Bid Increment Step (PTS)</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, bidIncrementStep: formData.defaultBasePrice })}
                    className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono cursor-pointer"
                    title="Set increment step to match base price"
                  >
                    Match Base Price
                  </button>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 font-bold font-mono">+₹</span>
                  <input
                    type="number"
                    min={1}
                    step="any"
                    value={formData.bidIncrementStep}
                    onChange={(e) => setFormData({ ...formData, bidIncrementStep: Math.max(1, Number(e.target.value) || 0) })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-amber-300 text-sm font-mono font-bold focus:outline-none focus:border-amber-400 transition"
                  />
                </div>

                {/* Progression Preview */}
                <div className="p-2 rounded-xl bg-stone-900/90 border border-stone-800 text-[11px] font-mono text-stone-400">
                  <span className="block text-[10px] uppercase tracking-wider text-stone-500 mb-0.5">Bid Progression:</span>
                  <span className="text-emerald-400 font-bold">
                    ₹{(Number(formData.defaultBasePrice) || 10000).toLocaleString()}
                  </span>
                  {' → '}
                  <span className="text-amber-300 font-bold">
                    ₹{((Number(formData.defaultBasePrice) || 10000) + (Number(formData.bidIncrementStep) || 10000)).toLocaleString()}
                  </span>
                  {' → '}
                  <span className="text-amber-300 font-bold">
                    ₹{((Number(formData.defaultBasePrice) || 10000) + 2 * (Number(formData.bidIncrementStep) || 10000)).toLocaleString()}
                  </span>
                  {' → '}
                  <span className="text-amber-300 font-bold">
                    ₹{((Number(formData.defaultBasePrice) || 10000) + 3 * (Number(formData.bidIncrementStep) || 10000)).toLocaleString()}
                  </span>
                  …
                </div>
              </div>
            </div>

            {/* Bulk Apply to Existing Players */}
            {players && players.length > 0 && (
              <div className="pt-3 border-t border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-stone-900/40 p-3 rounded-xl">
                <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>
                    Apply <strong className="text-emerald-400">₹{(Number(formData.defaultBasePrice) || 10000).toLocaleString()} PTS</strong> to all <strong>{players.filter(p => p.status !== 'sold').length}</strong> available/unsold players
                  </span>
                </div>
                <button
                  type="button"
                  disabled={applyingBulk}
                  onClick={handleApplyBasePriceToPlayers}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 shrink-0 font-sans"
                >
                  {applyingBulk ? 'Updating Players…' : `Update ${players.filter(p => p.status !== 'sold').length} Players`}
                </button>
              </div>
            )}
          </div>

          {/* ── Franchise Startup Purse (Total Budget) Control ── */}
          <div className="bg-[#1c1b1a] p-4 sm:p-5 rounded-2xl border border-purple-500/40 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Wallet className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white font-sans flex items-center gap-2">
                    <span>Franchise Startup Purse (Total Team Budget)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono font-bold">
                      Supreme Master Only
                    </span>
                  </h4>
                  <p className="text-[11px] text-stone-400 font-sans">
                    Set the official starting purse budget allocated to each franchise for auction bidding.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-purple-300 flex items-center justify-between font-sans">
                <span>Default Startup Purse / Total Budget (PTS)</span>
                <span className="text-[10px] text-stone-400 font-mono">Team Budget Cap</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 font-bold font-mono">₹</span>
                <input
                  type="number"
                  min={1}
                  step="any"
                  value={formData.startupPurse}
                  onChange={(e) => {
                    const val = Math.max(1, Number(e.target.value) || 0);
                    setFormData({
                      ...formData,
                      startupPurse: val,
                    });
                  }}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-purple-300 text-sm font-mono font-bold focus:outline-none focus:border-purple-400 transition"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[5000, 10000, 15000, 20000, 25000, 50000, 100000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        startupPurse: amt,
                      });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer border ${
                      formData.startupPurse === amt 
                        ? 'bg-purple-600 text-white border-purple-400 font-black scale-105 shadow-sm'
                        : 'bg-stone-900 text-stone-400 border-stone-800 hover:border-purple-400 hover:text-purple-300'
                    }`}
                  >
                    ₹{amt.toLocaleString()} PTS
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Apply to Existing Teams */}
            {teams && teams.length > 0 && (
              <div className="pt-3 border-t border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-stone-900/40 p-3 rounded-xl">
                <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>
                    Apply Total Budget <strong className="text-purple-300">₹{(Number(formData.startupPurse) || 10000).toLocaleString()} PTS</strong> across all <strong>{teams.length}</strong> franchise teams
                  </span>
                </div>
                <button
                  type="button"
                  disabled={applyingPurseBulk}
                  onClick={handleApplyStartupPurseToTeams}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 shrink-0 font-sans"
                >
                  {applyingPurseBulk ? 'Applying Budgets…' : `⚡ Apply Budget to All ${teams.length} Teams`}
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-stone-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#cc785c] hover:bg-[#b8674d] text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Broadcasting…' : 'Save & Broadcast Live'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
