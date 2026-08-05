import React from 'react';
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
  ExternalLink
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  isProjectorMode, 
  setIsProjectorMode, 
  soundEnabled, 
  setSoundEnabled, 
  onResetData 
}) {
  const tabs = [
    { id: 'auction', label: 'Live Auction Arena', icon: Gavel },
    { id: 'teams', label: 'Teams & Purse', icon: Users },
    { id: 'players', label: 'Nyati Player Pool', icon: Trophy },
    { id: 'rules', label: 'Rules & Guidelines', icon: BookOpen },
    { id: 'schedule', label: 'Matches & NRR Table', icon: Calendar },
  ];

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & League Branding */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('auction')}>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-amber-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Gavel className="w-6 h-6 text-emerald-400 transform -rotate-45" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  NYATI ERA
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  NEPL Box Cricket
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                Dhanori Box Cricket Premier League 
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 font-semibold scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Utilities Controls */}
          <div className="flex items-center space-x-3">
            {/* CricHeroes badge link */}
            <a
              href="https://cricheroes.com"
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex items-center space-x-1 text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-amber-500/30 transition"
              title="Verified CricHeroes Data"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-semibold">CricHeroes</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {/* Sound FX Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border transition ${
                soundEnabled
                  ? 'bg-slate-800 text-emerald-400 border-emerald-500/40 hover:bg-slate-700'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-800'
              }`}
              title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Projector / TV Screen Mode */}
            <button
              onClick={() => setIsProjectorMode(!isProjectorMode)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition"
              title="Toggle Projector / TV Display Mode"
            >
              <Tv className="w-4 h-4 text-slate-950" />
              <span className="hidden sm:inline">TV Screen</span>
            </button>

            {/* Reset Auction Data */}
            <button
              onClick={onResetData}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 transition"
              title="Reset Auction Data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex lg:hidden overflow-x-auto py-2.5 space-x-2 border-t border-slate-800/60 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium transition ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
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
    </header>
  );
}
