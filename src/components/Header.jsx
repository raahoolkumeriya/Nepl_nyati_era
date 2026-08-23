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
  Bot,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../utils/theme';
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
  onOpenAiChat,
}) {
  const { user, logout, can, roleConfig } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
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
    <header className="sticky top-0 z-40 bg-[#141413]/90 backdrop-blur-xl border-b border-stone-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <div className="max-w-[1800px] 3xl:max-w-[2100px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-16">
          
          {/* ── Logo & Branding ── */}
          <div 
            className="flex items-center space-x-2.5 cursor-pointer group shrink-0" 
            onClick={() => setActiveTab(tabs[0]?.id || 'auction')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#cc785c] via-[#e07a5f] to-[#d97706] p-[1.5px] shadow-[0_2px_12px_rgba(204,120,92,0.3)] group-hover:shadow-[0_4px_18px_rgba(204,120,92,0.45)] transition-all duration-200 shrink-0">
              <div className="w-full h-full bg-[#141413] rounded-[10px] flex items-center justify-center">
                <Gavel className="w-4 h-4 text-[#cc785c] transform -rotate-45 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight gradient-text-brand font-sans leading-none">
                  Nyati Era
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.2 text-[9px] font-bold tracking-wider uppercase rounded-full bg-[#cc785c]/10 text-[#cc785c] border border-[#cc785c]/25 font-sans">
                  2026+
                </span>
                <span className="hidden xl:inline-flex px-2 py-0.2 text-[9px] font-semibold rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/25 font-serif italic">
                  कर्मण्येवाधिकारस्ते
                </span>
              </div>
              <p className="text-[10px] text-stone-400 flex items-center gap-1.5 font-medium mt-0.5">
                Box Cricket League
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </p>
            </div>
          </div>

          {/* ── Center Anthropic Navigation ── */}
          <nav className="hidden lg:flex items-center space-x-1 bg-[#1c1b1a]/90 p-1 rounded-xl border border-stone-800 shadow-sm mx-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#faf9f5] text-[#141413] shadow-sm font-bold scale-[1.01]'
                      : 'text-stone-400 hover:text-[#faf9f5] hover:bg-stone-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#141413]' : 'text-stone-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* ── Right Controls ── */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* API Docs */}
            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-stone-300 border border-stone-800 transition"
              title="Interactive OpenAPI 3.0 Docs"
            >
              <FileCode2 className="w-3.5 h-3.5 text-[#cc785c]" />
              <span className="font-semibold text-[11px]">API</span>
              <ExternalLink className="w-2.5 h-2.5 text-stone-500" />
            </a>

            {/* CricHeroes */}
            <a
              href="https://cricheroes.com"
              target="_blank"
              rel="noreferrer"
              className="hidden xl:flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-amber-300 border border-amber-500/25 transition"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="font-semibold text-[11px]">CricHeroes</span>
              <ExternalLink className="w-2.5 h-2.5 text-stone-500" />
            </a>

            {/* Manage Auctioneers — Super Admin Only */}
            {can('canManageUsers') && (
              <button
                onClick={() => setIsManagerOpen(true)}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25 font-bold text-[11px] transition"
                title="Manage Auctioneers & Access"
              >
                <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Auctioneers</span>
              </button>
            )}

            {/* Dark / Modern White Theme Transformation Toggle */}
            <button
              onClick={toggleTheme}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                isDark
                  ? 'bg-stone-900 hover:bg-stone-800 text-amber-300 border-stone-800'
                  : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200 shadow-sm'
              }`}
              title={isDark ? "Switch to Modern Clean White Mode" : "Switch to Anthropic Dark Mode"}
              aria-label="Toggle Dark/White Color Theme"
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#cc785c]" />
              )}
              <span className="hidden md:inline-block font-bold text-[10px] uppercase tracking-wider">
                {isDark ? 'Dark' : 'White'}
              </span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition ${
                soundEnabled
                  ? 'bg-stone-900 text-[#cc785c] border-stone-800 hover:bg-stone-800'
                  : 'bg-stone-950 text-stone-600 border-stone-900 hover:bg-stone-900'
              }`}
              title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Projector / TV Screen */}
            {can('canAccessProjector') && (
              <button
                onClick={() => setIsProjectorMode(!isProjectorMode)}
                className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-[11px] uppercase tracking-wider transition cursor-pointer"
                title="Toggle Projector / TV Display Mode"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>TV</span>
              </button>
            )}

            {/* User Menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 hover:border-stone-700 transition shadow-sm"
                >
                  <span className="text-sm leading-none">{user.avatar}</span>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-bold text-sand-100 leading-tight">{user.name}</div>
                    <div className="text-[8px] font-semibold text-[#cc785c] uppercase tracking-wider">
                      {roleConfig?.label}
                    </div>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
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

        {/* ── Mobile Cyber Tab Bar + Theme Switcher ── */}
        <div className="flex lg:hidden items-center justify-between py-2.5 border-t border-cyan-500/15 gap-2">
          <div className="flex overflow-x-auto space-x-2 no-scrollbar py-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap font-display font-semibold transition ${
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

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border shrink-0 transition ${
              isDark
                ? 'bg-slate-900 text-amber-300 border-amber-500/30'
                : 'bg-white text-slate-800 border-slate-300'
            }`}
            title="Toggle Dark / White Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
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
