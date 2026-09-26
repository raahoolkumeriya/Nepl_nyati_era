import React, { useState } from 'react';
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
  UserCheck 
} from 'lucide-react';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { login, usersList } = useAuth();
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

  const handleSelectAccount = (accEmail, roleKey) => {
    setEmail(accEmail);
    setPassword('');
    setSelectedRoleKey(roleKey);
    setError('');
    setTimeout(() => {
      const passInput = document.getElementById('login-password');
      if (passInput) passInput.focus();
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[#060913] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-cyan-500 selection:text-black">

      {/* Modern Ambient Cyber Glow Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-[650px] h-[650px] bg-cyan-500/12 rounded-full blur-[150px]" />
        <div className="absolute -bottom-32 -right-32 w-[550px] h-[550px] bg-purple-600/12 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-[#cc785c]/10 rounded-full blur-[110px]" />
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,242,254,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,242,254,0.4) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="w-full max-w-lg relative z-10 my-auto">

        {/* Brand Header */}
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/95 backdrop-blur-md p-1.5 shadow-[0_0_35px_rgba(204,120,92,0.35)] mb-3.5 border-2 border-[#cc785c]/40 hover:scale-105 transition-transform duration-300">
            <img
              src="/nyati_era_logo.png"
              alt="Nyati Era Official Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl font-sans font-black text-slate-100 tracking-tight">
            Nyati <span className="gradient-text-brand">Era</span>
          </h1>
          <p className="text-[#cc785c] text-xs sm:text-sm mt-1 font-sans font-extrabold uppercase tracking-widest">
            Box Cricket League
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,242,254,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#00ff87]" />
            <span className="text-xs text-cyan-300 font-sans font-bold">Live Auction Platform</span>
          </div>
        </header>

        {/* Modern Glassmorphic Login Card */}
        <main className={`bg-slate-900/75 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.85)] border border-cyan-500/25 transition-all duration-300 ${shake ? 'animate-shake' : ''}`}>
          
          {/* Card Header & Security Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-4 border-b border-slate-800/80">
            <div>
              <h2 className="text-lg sm:text-xl font-sans font-black text-slate-100 flex items-center gap-2">
                <span>Secure Authentication</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Sign in to access real-time bidding & squad operations</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold self-start sm:self-auto shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>TLS 1.3 SECURED</span>
            </div>
          </div>

          {/* Matched Profile Preview (Dynamic) */}
          {matchedUser && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 mb-5 animate-fade-in shadow-inner">
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
              className="flex items-start gap-2.5 bg-rose-950/70 border border-rose-500/40 rounded-xl px-4 py-3 mb-5 text-xs text-rose-300 font-sans font-medium animate-fade-in"
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
                  className="cyber-input font-sans text-sm pl-10 pr-4 py-2.5 w-full bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
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
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="cyber-input font-sans text-sm pl-10 pr-12 py-2.5 w-full bg-slate-950/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  aria-pressed={showPass}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-cyan-300 transition-colors rounded-lg hover:bg-slate-800"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-slate-950 font-sans font-black text-sm sm:text-base tracking-tight transition-all duration-200 shadow-[0_0_25px_rgba(0,242,254,0.35)] hover:shadow-[0_0_35px_rgba(0,242,254,0.65)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-3 cursor-pointer flex items-center justify-center gap-2"
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
          <section className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 font-sans flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Authorized Role Profiles</span>
              </span>
              <span className="text-[10px] text-cyan-400/90 font-mono">Select role to fill email</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              
              {/* Super Admin */}
              <button
                type="button"
                onClick={() => handleSelectAccount('admin@nepl.in', 'admin')}
                className={`text-left p-3 rounded-2xl border transition-all duration-200 group cursor-pointer ${
                  selectedRoleKey === 'admin' 
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.2)]' 
                    : 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-200 group-hover:text-cyan-300 font-sans flex items-center gap-1">
                    <span>⚡ Super Admin</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">Full</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate mt-1">admin@nepl.in</div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-cyan-400/70" />
                  <span>Type password</span>
                </div>
              </button>

              {/* Auctioneer */}
              <button
                type="button"
                onClick={() => handleSelectAccount('auction@nepl.in', 'auctioneer')}
                className={`text-left p-3 rounded-2xl border transition-all duration-200 group cursor-pointer ${
                  selectedRoleKey === 'auctioneer' 
                    ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                    : 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800 hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-200 group-hover:text-amber-300 font-sans flex items-center gap-1">
                    <span>🔨 Auctioneer</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono">Bidding</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate mt-1">auction@nepl.in</div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-amber-400/70" />
                  <span>Type password</span>
                </div>
              </button>

              {/* Player */}
              <button
                type="button"
                onClick={() => handleSelectAccount('player@nepl.in', 'player')}
                className={`text-left p-3 rounded-2xl border transition-all duration-200 group cursor-pointer ${
                  selectedRoleKey === 'player' 
                    ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_15px_rgba(160,185,129,0.2)]' 
                    : 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-200 group-hover:text-emerald-300 font-sans flex items-center gap-1">
                    <span>🏏 Player</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">Viewer</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate mt-1">player@nepl.in</div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-emerald-400/70" />
                  <span>Type password</span>
                </div>
              </button>

              {/* Dev Master */}
              <button
                type="button"
                onClick={() => handleSelectAccount('developer@nepl.in', 'developer')}
                className={`text-left p-3 rounded-2xl border transition-all duration-200 group cursor-pointer ${
                  selectedRoleKey === 'developer' 
                    ? 'bg-purple-950/40 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                    : 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800 hover:border-purple-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-slate-200 group-hover:text-purple-300 font-sans flex items-center gap-1">
                    <span>👑 Dev Master</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono">Engine</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate mt-1">developer@nepl.in</div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-purple-400/70" />
                  <span>Type password</span>
                </div>
              </button>
            </div>

            {/* Custom/Registered Members from MongoDB Atlas (Zero Plaintext Passwords) */}
            {(usersList || []).filter(u => !u.isDefault).length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800/60">
                <p className="text-[11px] font-extrabold text-slate-400 mb-2 font-sans flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3 h-3 text-cyan-400" />
                    <span>Registered Member Access</span>
                  </span>
                  <span className="text-[9px] text-emerald-400/90 font-mono">Atlas Verified</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(usersList || []).filter(u => !u.isDefault).map(u => (
                    <button
                      key={u.id || u.email}
                      type="button"
                      onClick={() => handleSelectAccount(u.email, u.email)}
                      className={`text-left p-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                        selectedRoleKey === u.email
                          ? 'bg-cyan-950/50 border-cyan-400 shadow-[0_0_12px_rgba(0,242,254,0.2)]'
                          : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 hover:border-cyan-500/40'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-200 truncate">{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">{u.email}</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-cyan-400/70" />
                        <span>Type password</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Security Standards Banner */}
          <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-mono text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400/80" />
            <span>Encrypted Session • Zero Plaintext Storage • Audit Logged</span>
          </div>
        </main>

        {/* Footer Branding */}
        <footer className="text-center mt-6 space-y-1.5 font-sans">
          <p className="text-xs text-slate-400 font-medium">
            © {new Date().getFullYear()} Box Cricket Premier League NEPL
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
