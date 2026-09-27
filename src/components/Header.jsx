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
  Edit3,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../utils/theme';
import { useTournament } from '../context/TournamentContext';
import AuctioneerManagerModal from './AuctioneerManagerModal';
import TournamentSettingsModal from './TournamentSettingsModal';

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
  teams = [],
  setTeams,
  onOpenAiChat,
  viewerCount = 1,
  liveSocketConnected = false,
}) {
  const { user, logout, can, roleConfig } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { tournamentSettings } = useTournament();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);

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
    <header className="sticky top-0 z-40 bg-[#141413]/90 backdrop-blur-xl border-b border-stone-800/80 shadow-[0_4px_25px_rgba(0,0,0,0.35)]">
      <div className="max-w-[1920px] 3xl:max-w-[2400px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between min-h-[72px] sm:min-h-[80px] py-2">
          
          {/* ── Logo & Branding ── */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group shrink-0" 
            onClick={() => setActiveTab(tabs[0]?.id || 'auction')}
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-slate-900/90 p-1 border-2 border-cyan-400/40 shadow-[0_4px_16px_rgba(0,242,254,0.3)] group-hover:scale-105 group-hover:shadow-[0_6px_22px_rgba(0,242,254,0.5)] transition-all duration-200 shrink-0 flex items-center justify-center">
              <img
                src={(tournamentSettings?.logoUrl && tournamentSettings.logoUrl !== '/nyati_era_logo.png') ? tournamentSettings.logoUrl : '/cricklocked_logo.png'}
                alt={tournamentSettings?.tournamentName || 'Criclocked'}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => { e.target.src = '/cricklocked_logo.png'; }}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight gradient-text-brand font-sans leading-tight">
                  {(!tournamentSettings?.tournamentName || tournamentSettings?.tournamentName === 'Nyati Era') ? 'Criclocked' : tournamentSettings.tournamentName}
                </h1>
                {user?.role === 'suprememaster' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTournamentModalOpen(true);
                    }}
                    className="p-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition shadow-sm"
                    title="Change Tournament Name & Branding (Supreme Master)"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <span className="text-xs sm:text-sm text-stone-300 dark:text-stone-300 light:text-stone-800 font-extrabold uppercase tracking-wider">
                  {tournamentSettings?.subtitle || 'Box Cricket League'}
                </span>
                {tournamentSettings?.shortCode && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#cc785c]/20 text-[#cc785c] font-mono font-bold">
                    {tournamentSettings.shortCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Center Anthropic Navigation ── */}
          <nav className="hidden lg:flex items-center space-x-1.5 bg-[#1c1b1a]/95 p-1.5 rounded-2xl border border-stone-800 shadow-md mx-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#faf9f5] text-[#141413] shadow-md font-black scale-[1.02]'
                      : 'text-stone-400 hover:text-[#faf9f5] hover:bg-stone-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#141413]' : 'text-stone-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* ── Right Controls ── */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* API Docs */}
            {can('canViewApiDocs') && (
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
            )}

            {/* CricHeroes */}
            {can('canViewCricHeroes') && (
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
            )}

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
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                isDark
                  ? 'bg-stone-900 hover:bg-stone-800 text-amber-300 border-stone-800'
                  : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200 shadow-sm'
              }`}
              title={isDark ? "Switch to Modern Clean White Mode" : "Switch to Anthropic Dark Mode"}
              aria-label={isDark ? "Switch to Modern Clean White Mode" : "Switch to Anthropic Dark Mode"}
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-700" />
              )}
              <span className="hidden md:inline-block font-bold text-[10px] uppercase tracking-wider">
                {isDark ? 'White' : 'Dark'}
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

            {/* Supreme Master Clean Setup & Wipe Bids */}
            {user?.role === 'suprememaster' && (
              <button
                onClick={onResetData}
                className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider transition cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                title="Wipe Bidding History & Clean Fresh Setup (Supreme Master Only)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Wipe Bids & Setup</span>
                <span className="md:hidden">Wipe</span>
              </button>
            )}

            {/* User Menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 hover:border-stone-700 transition shadow-sm"
                >
                  {user.photoUrl ? (
    <img src={user.photoUrl} alt={user.name} className="w-6 h-6 rounded-full object-cover border border-amber-500/60 shadow-sm" />
  ) : (
    <span className="text-sm leading-none">{user.avatar}</span>
  )}
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
                      {user.photoUrl ? (
    <img src={user.photoUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-cyan-400 shadow-sm shrink-0" />
  ) : (
    <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
  )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-cyan-300 font-display">{roleConfig?.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{user.email}</div>
                      </div>
                    </div>

                    {user?.role === 'suprememaster' && (
                      <button
                        onClick={() => { setIsTournamentModalOpen(true); setShowUserMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-amber-300 hover:bg-amber-950/40 hover:text-amber-200 transition mb-1 cursor-pointer font-bold border border-amber-500/20"
                        title="Configure global tournament name and identity"
                      >
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>Tournament Name & Brand</span>
                      </button>
                    )}

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
                        title="Wipe bidding history, reset players, and start clean fresh auction setup (Supreme Master Only)"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-400" />
                        <span>Wipe History & Clean Setup</span>
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
      </div>

      {/* Auctioneer Manager Modal */}
      <AuctioneerManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        players={players}
        setPlayers={setPlayers}
      />

      {/* Tournament Settings Modal (Supreme Master Only) */}
      <TournamentSettingsModal
        isOpen={isTournamentModalOpen}
        onClose={() => setIsTournamentModalOpen(false)}
        players={players}
        setPlayers={setPlayers}
        teams={teams}
        setTeams={setTeams}
      />

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      )}
    </header>
  );
}
