import React from 'react';
import { 
  BookOpen, 
  Trophy, 
  Gavel, 
  Clock, 
  Users, 
  ShieldAlert, 
  XCircle, 
  Zap, 
  UserCheck, 
  Gift, 
  CloudRain,
  UtensilsCrossed,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { TOURNAMENT_RULES } from '../data/initialData';

export default function RulesHub() {
  const iconMap = {
    Trophy,
    Gavel,
    Clock,
    Users,
    ShieldAlert,
    XCircle,
    Zap,
    UserCheck,
    Gift,
    CloudRain
  };

  return (
    <div className="space-y-8">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-extrabold uppercase border border-amber-500/30 mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              OFFICIAL LEAGUE DIRECTIVE
            </div>
            <h2 className="text-3xl font-black text-white tracking-wider">
              NEPL Tournament Guidelines & Rules
            </h2>
            <p className="text-slate-400 text-xs mt-1 max-w-2xl">
              Official rules for Nyati Era Box Cricket League. All team captains, owners, and players must strictly abide by these directives.
            </p>
          </div>

          {/* Prize Money Card */}
          <div className="bg-gradient-to-tr from-amber-500/20 via-yellow-500/10 to-amber-500/30 p-5 rounded-2xl border border-amber-500/40 shadow-xl flex items-center space-x-4 min-w-[260px]">
            <div className="p-3 bg-amber-500 text-slate-950 rounded-xl font-bold shadow-lg">
              <Gift className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-extrabold text-amber-400 tracking-wider block">Official Prize Pool</span>
              <div className="text-sm font-bold text-white mt-0.5">
                WINNER: <span className="text-emerald-400 font-mono font-extrabold">INR 2,500/-</span>
              </div>
              <div className="text-xs text-slate-300 font-medium">
                RUNNER UP: <span className="text-amber-300 font-mono font-extrabold">INR 1,500/-</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Highlights Bar for Arbitrators & Ground Rules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="glass-panel p-5 rounded-2xl border border-red-500/30 bg-red-950/20 flex items-start space-x-3">
          <UserCheck className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-white text-sm">Final Decision Authority</h4>
            <p className="text-xs text-slate-300 mt-1">
              Umpire decision is final. For major arguments, the <strong>FINAL decision will be held by Harish & Santosh</strong>.
            </p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 flex items-start space-x-3">
          <Users className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-white text-sm">Max 6 Players On Field</h4>
            <p className="text-xs text-slate-300 mt-1">
              8 players per team squad. <strong>Only 6 allowed on field</strong> at any time. Captains must rotate players so everyone plays!
            </p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 flex items-start space-x-3">
          <UtensilsCrossed className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-white text-sm">Sunday 8 PM & Dinner Party</h4>
            <p className="text-xs text-slate-300 mt-1">
              Finals wrap up by Sunday 8 PM followed by a mandatory community <strong>Dinner Party</strong> for all teams!
            </p>
          </div>
        </div>

      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TOURNAMENT_RULES.map((rule) => {
          const IconComp = iconMap[rule.icon] || BookOpen;

          return (
            <div
              key={rule.id}
              className="glass-card p-6 rounded-2xl border border-slate-800 glass-card-hover flex items-start space-x-4 relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-emerald-400 shadow-md">
                <IconComp className="w-6 h-6" />
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    RULE #{rule.number}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-white pt-1">
                  {rule.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed pt-0.5">
                  {rule.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
