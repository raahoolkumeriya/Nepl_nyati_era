import React, { useState } from 'react';
import { 
  Gavel, 
  Users, 
  Trophy, 
  BookOpen, 
  Calendar, 
  Tv, 
  Volume2, 
  VolumeX, 
  RotateCcw,
  Sparkles,
  ExternalLink,
  LogOut,
  ChevronDown,
  Shield,
  UserCheck,
  FileCode2,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import AuctioneerManagerModal from './AuctioneerManagerModal';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  isProjectorMode, 
  setIsProjectorMode, 
  soundEnabled, 
  setSoundEnabled, 
  onResetData,
  players = [],
  setPlayers,
}) {
  const { user, logout, can, roleConfig } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  // Filter tabs based on role permissions
  const allTabs = [
    { id: 'auction', label: 'Live Auction', icon: Gavel, permission: 'canViewAuction' },
    { id: 'teams', label: 'Teams & Purse', icon: Users, permission: 'canViewTeams' },
    { id: 'players', label: 'Players Pool', icon: Trophy, permission: 'canViewPlayers' },
    { id: 'rules', label: 'Rules', icon: BookOpen, permission: 'canViewRules' },
    { id: 'schedule', label: 'Schedule', icon: Calendar, permission: 'canViewSchedule' },
  ];

  const tabs = allTabs.filter(t => can(t.permission));

  return (
    <header className="sticky top-0 z-40 bg-[#070b14]/85 backdrop-blur-xl border-b border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          
          {/* ── Logo & Branding ── */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => setActiveTab(tabs[0]?.id || 'auction')}
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-neon-violet p-[2px] shadow-[0_0_20px_rgba(0,242,254,0.4)] group-hover:shadow-[0_0_30px_rgba(0,242,254,0.7)] transition-all duration-300 flex-shrink-0">
              <div className="w-full h-full bg-[#070b14] rounded-[14px] flex items-center justify-center">
                <Gavel className="w-5 h-5 text-cyan-400 transform -rotate-45 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black tracking-wider gradient-text-brand font-display uppercase">
                  NYATI ERA
                </h1>
                <span className="hidden sm:inline-flex px-2.5 py-0.5 text-[9px] font-black tracking-widest uppercase rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,242,254,0.2)]">
                  2026+
                </span>
                <span className="hidden md:inline-flex px-2.5 py-0.5 text-[10px] font-semibold rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-[0_0_10px_rgba(121,40,202,0.2)] font-serif tracking-wide">
                  कर्मण्येवाधिकारस्ते
                </span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1.5 font-medium tracking-wide">
                Box Cricket League · 2026 Onwards
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#00ff87]" />
              </p>
            </div>
          </div>

          {/* ── Center Cyber Navigation ── */}
          <nav className="hidden lg:flex items-center space-x-1 bg-[#0b1120]/90 p-1.5 rounded-2xl border border-cyan-500/20 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-display font-semibold text-xs tracking-wide transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_20px_rgba(0,242,254,0.45)] scale-[1.03]'
                      : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* ── Right Cyber Controls ── */}
          <div className="flex items-center space-x-2.5">
            {/* API Docs */}
            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center space-x-1.5 text-[11px] px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,242,254,0.15)] transition"
              title="Interactive OpenAPI 3.0 / Swagger UI Docs"
            >
              <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold font-display uppercase tracking-wider text-[10px]">API Docs</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>

            {/* CricHeroes */}
            <a
              href="https://cricheroes.com"
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex items-center space-x-1.5 text-[11px] px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(255,183,3,0.15)] transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold">CricHeroes</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
            </a>

            {/* Manage Auctioneers — Super Admin Only */}
            {can('canManageUsers') && (
              <button
                onClick={() => setIsManagerOpen(true)}
                className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-display font-bold text-[10px] uppercase tracking-wider shadow-[0_0_15px_rgba(121,40,202,0.25)] transition"
                title="Manage Auctioneers & Access"
              >
                <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Auctioneers</span>
              </button>
            )}

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border transition ${
                soundEnabled
                  ? 'bg-slate-900 text-cyan-400 border-cyan-500/30 hover:bg-slate-800 shadow-[0_0_12px_rgba(0,242,254,0.2)]'
                  : 'bg-slate-950 text-slate-600 border-slate-800 hover:bg-slate-900'
              }`}
              title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Projector / TV Screen */}
            {can('canAccessProjector') && (
              <button
                onClick={() => setIsProjectorMode(!isProjectorMode)}
                className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-display font-black text-[10px] uppercase tracking-wider shadow-[0_0_18px_rgba(255,183,3,0.4)] hover:brightness-110 transition cursor-pointer"
                title="Toggle Projector / TV Display Mode"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>TV Screen</span>
              </button>
            )}

            {/* User Menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/25 hover:border-cyan-400/50 transition shadow-md"
                >
                  <span className="text-base leading-none">{user.avatar}</span>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-bold text-slate-100 leading-tight font-display">{user.name}</div>
                    <div className="text-[9px] font-semibold text-cyan-400 uppercase tracking-wider">
                      {roleConfig?.label}
                    </div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 warm-card rounded-2xl border border-cyan-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-2.5 z-50">
                    {/* Role badge */}
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1.5 bg-slate-900/90 border border-cyan-500/30">
                      <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-cyan-300 font-display">{roleConfig?.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{user.email}</div>
                      </div>
                    </div>

                    {can('canManageUsers') && (
                      <button
                        onClick={() => { setIsManagerOpen(true); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800/80 hover:text-cyan-300 transition mb-1 cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4 text-purple-400" />
                        Manage Auctioneers
                      </button>
                    )}

                    {can('canResetData') && (
                      <button
                        onClick={() => {
                          onResetData?.();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 font-bold hover:bg-rose-950/60 hover:text-rose-200 transition border border-rose-500/30 mb-1 cursor-pointer"
                        title="Clear all live auction data, bids, and teams from MongoDB Atlas (Supreme Master Only)"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-400" />
                        <span>Clear Database (Supreme Master)</span>
                      </button>
                    )}

                    <button
                      onClick={() => { logout(); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile Cyber Tab Bar ── */}
        <div className="flex lg:hidden overflow-x-auto py-2.5 space-x-2 border-t border-cyan-500/15 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap font-display font-semibold transition ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Auctioneer Manager Modal */}
      <AuctioneerManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        players={players}
        setPlayers={setPlayers}
      />

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      )}
    </header>
  );
}
