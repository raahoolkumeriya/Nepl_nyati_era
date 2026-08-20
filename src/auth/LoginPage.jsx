import React, { useState } from 'react';
import { Gavel, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background ambient cyber glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] translate-x-1/4 translate-y-1/4" />
        <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] bg-blue-500/8 rounded-full blur-[90px] -translate-x-1/2 -translate-y-1/2" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,242,254,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,242,254,0.4) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* Brand Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-neon-violet p-[2px] shadow-[0_0_30px_rgba(0,242,254,0.4)] mb-5">
            <div className="w-full h-full bg-[#070b14] rounded-[14px] flex items-center justify-center">
              <Gavel className="w-8 h-8 text-cyan-400 transform -rotate-45" />
            </div>
          </div>
          <h1 className="text-4xl font-display font-black text-slate-100 tracking-wider uppercase">
            NYATI <span className="gradient-text-brand">ERA</span>
          </h1>
          <p className="text-cyan-400/80 text-xs mt-1 font-mono tracking-widest uppercase font-semibold">
            Box Cricket Premier League
          </p>
          <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,242,254,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#00ff87]" />
            <span className="text-xs text-cyan-300 font-display font-bold">Live Auction Platform</span>
          </div>
        </div>

        {/* Login Card */}
        <div className={`warm-card rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-cyan-500/25 transition-all duration-200 ${shake ? 'animate-shake' : ''}`}>
          <div className="mb-6">
            <h2 className="text-xl font-display font-bold text-slate-100">Portal Authentication</h2>
            <p className="text-slate-400 text-xs mt-1">Sign in with your credentials to access live bidding</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl px-4 py-3 mb-5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-display">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                className="cyber-input"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-display">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="cyber-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-slate-950 font-display font-bold text-sm tracking-wide transition-all duration-200 shadow-[0_0_20px_rgba(0,242,254,0.4)] hover:shadow-[0_0_30px_rgba(0,242,254,0.7)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-3 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating...
                </span>
              ) : 'Access Auction Platform →'}
            </button>
          </form>

          {/* Quick Account Selection */}
          <div className="mt-6 pt-5 border-t border-cyan-500/15">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 font-display flex items-center justify-between">
              <span>Select Account</span>
              <span className="text-[10px] text-cyan-400/80 font-normal">Click to fill email</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setEmail('admin@nepl.in'); setError(''); }}
                className="text-left p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 hover:border-cyan-500/40 transition group cursor-pointer"
              >
                <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">⚡ Super Admin</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">admin@nepl.in</div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('auction@nepl.in'); setError(''); }}
                className="text-left p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 hover:border-amber-500/40 transition group cursor-pointer"
              >
                <div className="text-xs font-bold text-slate-200 group-hover:text-amber-300">🔨 Auctioneer</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">auction@nepl.in</div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('player@nepl.in'); setError(''); }}
                className="text-left p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/40 transition group cursor-pointer"
              >
                <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">🏏 Player</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">player@nepl.in</div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('developer@nepl.in'); setError(''); }}
                className="text-left p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 hover:border-purple-500/40 transition group cursor-pointer"
              >
                <div className="text-xs font-bold text-slate-200 group-hover:text-purple-300">👑 Dev Master</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">developer@nepl.in</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer note & Copyright */}
        <div className="text-center mt-8 space-y-1.5">
          <p className="text-xs text-slate-400 font-medium">
            © 2026 onwards Box Cricket Premier League NEPL
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-serif shadow-[0_0_10px_rgba(121,40,202,0.15)]">
            <span className="text-[10px] uppercase font-sans text-slate-400">Version:</span>
            <span className="font-bold">कर्मण्येवाधिकारस्ते</span>
          </div>
        </div>
      </div>
    </div>
  );
}
