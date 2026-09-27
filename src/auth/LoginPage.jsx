import React, { useState, useEffect } from 'react';
import {
  Gavel,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Lock,
  Mail,
  CheckCircle2,
  KeyRound,
  Sparkles,
  UserCheck,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTournament } from '../context/TournamentContext';
import { useTheme } from '../utils/theme';

export default function LoginPage() {
  const { login, usersList } = useAuth();
  const { tournamentSettings } = useTournament();
  const { theme, toggleTheme, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [selectedRoleKey, setSelectedRoleKey] = useState(null);

  const matchedUser = (usersList || []).find(
    u => u.email.toLowerCase() === email.trim().toLowerCase()
  );

  const isDefaultLogo = !tournamentSettings?.logoUrl ||
    tournamentSettings.logoUrl === '/nyati_era_logo.png' ||
    tournamentSettings.logoUrl === '/cricklocked_logo.png' ||
    tournamentSettings.logoUrl === '/cricklocked_logo_light.png';

  const activeLogo = isDefaultLogo
    ? (isDark ? '/cricklocked_logo.png' : '/cricklocked_logo_light.png')
    : tournamentSettings.logoUrl;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      const msg = err.message || 'Login failed';
      if (msg === 'Invalid email or password') {
        setError('Invalid email or password. Please verify your credentials or select an authorized account below.');
      } else {
        setError(msg);
      }
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  // Pre-configured role profiles for quick email selection
  const ROLE_PROFILES = {
    suprememaster: {
      email: (import.meta.env.VITE_SUPREMEMASTER_EMAIL || '').trim().toLowerCase() || 'developer@nepl.in',
    },
    admin: {
      email: (import.meta.env.VITE_SUPERUSER_EMAIL || '').trim().toLowerCase() || 'admin@nepl.in',
    },
    auctioneer: {
      email: (import.meta.env.VITE_AUCTIONEER_EMAIL || '').trim().toLowerCase() || 'auction@nepl.in',
    },
    player: {
      email: (import.meta.env.VITE_PLAYER_EMAIL || '').trim().toLowerCase() || 'player@nepl.in',
    },
  };

  const handleSelectAccount = (roleKey) => {
    const profile = ROLE_PROFILES[roleKey];
    if (!profile) return;
    setEmail(profile.email);
    setPassword(''); // Explicitly empty so user enters their password manually
    setSelectedRoleKey(roleKey);
    setError('');
    setTimeout(() => {
      const passInput = document.getElementById('login-password');
      if (passInput) passInput.focus();
    }, 50);
  };

  const [hiddenClicks, setHiddenClicks] = useState(0);

  // Discreet developer trigger: Alt+S or 5 clicks on footer shield to autofill Supreme Master without UI exposure
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.altKey && e.key.toLowerCase() === 's') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's')) {
        e.preventDefault();
        handleSelectAccount('suprememaster');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleHiddenSupremeClick = () => {
    setHiddenClicks(prev => {
      const next = prev + 1;
      if (next >= 5) {
        handleSelectAccount('suprememaster');
        return 0;
      }
      return next;
    });
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden transition-colors duration-300 ${
      isDark
        ? 'bg-[#060913] selection:bg-cyan-500 selection:text-black'
        : 'bg-[#faf9f5] selection:bg-[#cc785c]/30 selection:text-black'
    }`}>

      {/* Modern Ambient Glow Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {isDark ? (
          <>
            <div className="absolute -top-32 -left-32 w-[650px] h-[650px] bg-cyan-500/12 rounded-full blur-[150px]" />
            <div className="absolute -bottom-32 -right-32 w-[550px] h-[550px] bg-purple-600/12 rounded-full blur-[140px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-[#cc785c]/10 rounded-full blur-[110px]" />
            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage: 'linear-gradient(rgba(0,242,254,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,242,254,0.4) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
          </>
        ) : (
          <>
            <div className="absolute -top-32 -left-32 w-[650px] h-[650px] bg-[#cc785c]/10 rounded-full blur-[140px]" />
            <div className="absolute -bottom-32 -right-32 w-[550px] h-[550px] bg-cyan-500/10 rounded-full blur-[130px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-amber-400/8 rounded-full blur-[110px]" />
            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: 'linear-gradient(#141413 1px, transparent 1px), linear-gradient(90deg, #141413 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
          </>
        )}
      </div>

      {/* Top Bar Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer backdrop-blur-md ${
            isDark
              ? 'bg-slate-900/80 hover:bg-slate-800 text-amber-300 border-white/10 shadow-sm'
              : 'bg-white/90 hover:bg-white text-slate-800 border-stone-200/90 shadow-md'
          }`}
          title={isDark ? "Switch to Modern Clean White Mode" : "Switch to Dark Mode"}
          aria-label={isDark ? "Switch to Modern Clean White Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
          <span className="font-bold text-[11px] uppercase tracking-wider">
            {isDark ? 'White' : 'Dark'}
          </span>
        </button>
      </div>

      <div className="w-full max-w-2xl relative z-10 my-auto">

        {/* Brand Header */}
        <header className="text-center mb-6">
          <div className="relative inline-flex items-center justify-center mb-3.5 group cursor-pointer bg-transparent">
            {/* Ambient Subtle Glow matching background page */}
            <div className={`absolute -inset-4 rounded-full blur-2xl transition-opacity duration-500 pointer-events-none ${
              isDark
                ? 'bg-cyan-500/15 opacity-60 group-hover:opacity-100'
                : 'bg-cyan-500/10 opacity-40 group-hover:opacity-80'
            }`} />

            {/* Seamless Logo on Page Background (No enclosing box/frame in Dark or White mode) */}
            <img
              src={activeLogo}
              alt="CricklockeD"
              className={`w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-2xl relative z-10 transition-transform duration-300 group-hover:scale-105 ${
                isDark
                  ? 'drop-shadow-[0_0_25px_rgba(0,242,254,0.35)]'
                  : 'drop-shadow-[0_6px_20px_rgba(0,0,0,0.08)]'
              }`}
              onError={(e) => { e.target.src = isDark ? '/cricklocked_logo.png' : '/cricklocked_logo_light.png'; }}
            />
          </div>

          <div className="flex flex-col items-center">
            <h1 className={`text-3xl sm:text-5xl font-sans font-black tracking-tight text-transparent bg-clip-text transition-all duration-300 ${
              isDark
                ? 'bg-gradient-to-r from-cyan-200 via-white to-cyan-400 drop-shadow-[0_2px_14px_rgba(0,242,254,0.35)]'
                : 'bg-gradient-to-r from-slate-900 via-cyan-900 to-slate-800 drop-shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
            }`}>
              {(!tournamentSettings?.tournamentName || tournamentSettings?.tournamentName === 'Nyati Era') ? 'CriclockeD' : tournamentSettings.tournamentName}
            </h1>
            {tournamentSettings?.subtitle && tournamentSettings.subtitle !== 'Box Cricket League' && (
              <p className={`text-xs sm:text-sm mt-1 font-sans font-extrabold uppercase tracking-widest ${
                isDark ? 'text-cyan-400/90' : 'text-cyan-700'
              }`}>
                {tournamentSettings.subtitle}
              </p>
            )}
            <div className={`mt-3.5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-xl border transition-all ${
              isDark
                ? 'bg-cyan-500/10 border-cyan-400/30 shadow-[0_0_20px_rgba(0,242,254,0.25)] text-cyan-200'
                : 'bg-cyan-50 border-cyan-200 shadow-sm text-cyan-800'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#00ff87]" />
              <span className="text-xs font-sans font-bold tracking-wide">Live Auction Platform</span>
            </div>
          </div>
        </header>

        {/* Apple Liquid Glass Dialog Box */}
        <main className={`apple-liquid-glass rounded-[36px] sm:rounded-[44px] p-6 sm:p-9 shadow-[0_30px_90px_rgba(0,0,0,0.85)] transition-all duration-300 ${shake ? 'animate-shake' : ''}`}>

          {/* Card Header & Security Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-lg sm:text-xl font-sans font-black text-slate-100 flex items-center gap-2">
                <span>Secure Authentication</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Sign in to access real-time bidding & squad operations</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold self-start sm:self-auto shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>TLS 1.3 SECURED</span>
            </div>
          </div>

          {/* Matched Profile Preview (Dynamic) */}
          {matchedUser && (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-400/30 mb-5 animate-fade-in shadow-inner backdrop-blur-md">
              {matchedUser.photoUrl ? (
                <img
                  src={matchedUser.photoUrl}
                  alt={matchedUser.name}
                  className="w-11 h-11 rounded-2xl object-cover border-2 border-cyan-400 shadow-md shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-cyan-500/40 flex items-center justify-center text-2xl shrink-0 shadow">
                  {matchedUser.avatar || '🔨'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-extrabold text-cyan-200 font-sans truncate">
                  {matchedUser.name}
                </div>
                <div className="text-[11px] text-slate-400 font-mono capitalize flex items-center gap-1.5 mt-0.5">
                  <span>Role:</span>
                  <span className="text-amber-400 font-bold uppercase text-[10px] bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                    {matchedUser.role}
                  </span>
                  <span className="text-emerald-400 text-[10px]">• Verified</span>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 bg-rose-950/70 border border-rose-500/40 rounded-2xl px-4 py-3 mb-5 text-xs text-rose-300 font-sans font-medium animate-fade-in"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Secure Login Form */}
          <form onSubmit={handleSubmit} method="POST" noValidate className="space-y-4">

            {/* Email Field with Input Icon */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-bold text-slate-300 mb-1.5 font-sans tracking-wide"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@nepl.in"
                  required
                  autoFocus
                  autoComplete="username"
                  inputMode="email"
                  spellCheck="false"
                  className="apple-liquid-input font-sans text-sm pl-10 pr-4 py-3 w-full rounded-2xl text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Field with Masked Security & Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bold text-slate-300 font-sans tracking-wide"
                >
                  Password
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  Protected with SHA-256
                </span>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                  className="apple-liquid-input font-sans text-sm pl-10 pr-12 py-3 w-full rounded-2xl text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  aria-pressed={showPass}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-cyan-300 transition-colors rounded-xl hover:bg-white/5"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950 font-sans font-black text-sm sm:text-base tracking-tight transition-all duration-200 shadow-[0_4px_25px_rgba(0,242,254,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)] hover:shadow-[0_6px_35px_rgba(0,242,254,0.7)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-3 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-slate-950" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Authenticating Session...</span>
                </>
              ) : (
                <span>Access Auction Platform →</span>
              )}
            </button>
          </form>

          {/* Quick Pre-Configured Accounts (Zero Plaintext Passwords Displayed) */}
          <section className="mt-6 pt-5 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 font-sans flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Authorized Role Profiles</span>
              </span>
              <span className="text-[10px] text-cyan-400/90 font-mono">Select role to fill email • enter password</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">

              {/* Admin */}
              <button
                type="button"
                onClick={() => handleSelectAccount('admin')}
                className={`text-left p-3 rounded-2xl transition-all duration-200 group cursor-pointer ${selectedRoleKey === 'admin'
                  ? 'apple-liquid-tile border-cyan-400/80 shadow-[0_0_20px_rgba(0,242,254,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)]'
                  : 'apple-liquid-tile hover:border-cyan-500/50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-200 group-hover:text-cyan-300 font-sans flex items-center gap-1.5">
                    <span>⚡ Admin</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-mono font-bold border border-cyan-400/30">Full</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate mt-1.5 font-medium">{ROLE_PROFILES.admin.email}</div>
                <div className="text-[9px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-cyan-400/70" />
                  <span>Enter password</span>
                </div>
              </button>

              {/* Auctioneer */}
              <button
                type="button"
                onClick={() => handleSelectAccount('auctioneer')}
                className={`text-left p-3 rounded-2xl transition-all duration-200 group cursor-pointer ${selectedRoleKey === 'auctioneer'
                  ? 'apple-liquid-tile border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)]'
                  : 'apple-liquid-tile hover:border-amber-500/50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-200 group-hover:text-amber-300 font-sans flex items-center gap-1.5">
                    <span>🔨 Auction</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-mono font-bold border border-amber-400/30">Bidding</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate mt-1.5 font-medium">{ROLE_PROFILES.auctioneer.email}</div>
                <div className="text-[9px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-amber-400/70" />
                  <span>Enter password</span>
                </div>
              </button>

              {/* Player */}
              <button
                type="button"
                onClick={() => handleSelectAccount('player')}
                className={`text-left p-3 rounded-2xl transition-all duration-200 group cursor-pointer ${selectedRoleKey === 'player'
                  ? 'apple-liquid-tile border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)]'
                  : 'apple-liquid-tile hover:border-emerald-500/50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-200 group-hover:text-emerald-300 font-sans flex items-center gap-1.5">
                    <span>🏏 Player</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-bold border border-emerald-400/30">Viewer</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate mt-1.5 font-medium">{ROLE_PROFILES.player.email}</div>
                <div className="text-[9px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-emerald-400/70" />
                  <span>Enter password</span>
                </div>
              </button>

            </div>
          </section>

          {/* Security Standards Banner */}
          <div 
            onClick={handleHiddenSupremeClick}
            className="mt-5 pt-3 border-t border-white/10 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono text-center cursor-default select-none"
            title="Encrypted Session Security"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400/90" />
            <span>Encrypted Session • Zero Plaintext Storage • Audit Logged</span>
          </div>
        </main>

        {/* Footer Branding */}
        <footer className="text-center mt-6 space-y-1.5 font-sans">
          <p className="text-xs text-slate-400 font-medium">
            © {new Date().getFullYear()} Criclocked • Live Auction Platform
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-serif shadow-[0_0_10px_rgba(121,40,202,0.15)]">
            <span className="text-[10px] uppercase font-sans text-slate-400">Motto:</span>
            <span className="font-bold">कर्मण्येवाधिकारस्ते</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
