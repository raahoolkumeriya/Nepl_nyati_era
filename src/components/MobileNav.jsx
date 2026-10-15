import { 
  Gavel, 
  Users, 
  Trophy, 
  Calendar, 
  BookOpen, 
  Sparkles,
  Bot,
  Tv
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function MobileNav({ 
  activeTab, 
  setActiveTab, 
  onOpenAiChat,
  onToggleTv 
}) {
  const { can } = useAuth();

  const allTabs = [
    { id: 'auction', label: 'Auction', icon: Gavel, permission: 'canViewAuction' },
    { id: 'teams', label: 'Teams', icon: Users, permission: 'canViewTeams' },
    { id: 'players', label: 'Players', icon: Trophy, permission: 'canViewPlayers' },
    { id: 'schedule', label: 'Matches', icon: Calendar, permission: 'canViewSchedule' },
    { id: 'rules', label: 'Rules', icon: BookOpen, permission: 'canViewRules' },
  ];

  const visibleTabs = allTabs.filter(t => can(t.permission));

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#141413]/95 dark:bg-[#141413]/95 light:bg-[#faf9f5]/95 backdrop-blur-2xl border-t border-stone-800/90 light:border-stone-300 shadow-[0_-8px_30px_rgba(0,0,0,0.45)] px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] transition-all duration-200"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-150 active:scale-90 cursor-pointer ${
                isActive 
                  ? 'text-[#cc785c] dark:text-[#cc785c] font-black' 
                  : 'text-stone-400 dark:text-stone-400 light:text-stone-500 hover:text-stone-200'
              }`}
            >
              {/* Active Tab Ambient Pill Glow */}
              {isActive && (
                <div className="absolute inset-0 bg-[#cc785c]/12 rounded-2xl -z-10 animate-fade-in border border-[#cc785c]/25 shadow-[0_0_12px_rgba(204,120,92,0.2)]" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#cc785c] animate-pulse" />
                )}
              </div>

              <span className={`text-[10px] tracking-tight mt-0.5 font-sans ${isActive ? 'font-black text-stone-100 light:text-stone-900' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Live TV Projector Live Screen Trigger on Mobile */}
        {can('canAccessProjector') && (
          <button
            onClick={onToggleTv}
            className="relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-150 active:scale-90 cursor-pointer group"
            title="Open Live TV Projector Screen for Live Rendering"
          >
            <div className="relative p-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(245,158,11,0.25)]">
              <Tv className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 font-bold font-sans text-amber-300">
              Live TV
            </span>
          </button>
        )}

        {/* Floating Gemini AI Quick Assistant Tab */}
        <button
          onClick={onOpenAiChat}
          className="relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-150 active:scale-90 cursor-pointer group"
          title="Open Gemini AI Tournament Assistant"
        >
          <div className="relative p-1 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-purple-600 shadow-[0_0_12px_rgba(0,242,254,0.35)] group-hover:scale-105 transition-transform">
            <Sparkles className="w-3.5 h-3.5 text-white animate-spin-slow" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-bold font-sans text-cyan-300">
            AI Bot
          </span>
        </button>
      </div>
    </nav>
  );
}
