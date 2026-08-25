import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Trophy, ShieldAlert, Users, Zap, Clock, Gavel, 
  RotateCw, Calculator, Sparkles, CheckCircle2, AlertTriangle, 
  HelpCircle, ChevronRight, ArrowRight, Activity, Award,
  Edit3, Save, RotateCcw, X, Shield, Lock
} from 'lucide-react';
import { NEFL_FORMAT_DETAILS } from '../data/neflRulesData';
import { useAuth } from '../auth/AuthContext';
import { addRule as apiAddRule, isMongoDB } from '../services/api';

const DEFAULT_FORMAT_SPECS = {
  inningsLength: {
    title: "Innings Length",
    value: "12 Overs",
    detail: "5 Privilege + 7 General"
  },
  squadSize: {
    title: "Squad Size",
    value: "12 Players",
    detail: "1 SM + 1 M + 3 F + 7 M"
  },
  fieldRestrictions: {
    title: "Field Restrictions",
    value: "2 - 2 Grid",
    detail: "2 Behind / 2 Before Crease"
  },
  boundaryBonuses: {
    title: "Boundary Bonuses",
    value: "+1 / +2 Runs",
    detail: "Net direct hits + running"
  }
};

export default function NEFLFormatView({ onOpenAiChat, rules, setRules }) {
  const { user, can } = useAuth();
  const isSuperAdmin = user?.role === 'superuser';
  const canManage = isSuperAdmin || can('canResetData') || can('canManageUsers');

  // ── Persistent Editable Format Specifications ──
  const [formatSpecs, setFormatSpecs] = useState(() => {
    try {
      const saved = localStorage.getItem('nepl_format_highlights');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load saved format highlights:', e);
    }
    if (rules && Array.isArray(rules)) {
      const ruleDoc = rules.find(r => r.id === 'rule-nefl-format-highlights');
      if (ruleDoc && ruleDoc.formatSpecs) {
        return ruleDoc.formatSpecs;
      }
    }
    return DEFAULT_FORMAT_SPECS;
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSpecs, setEditingSpecs] = useState(formatSpecs);
  const [saveStatus, setSaveStatus] = useState(null);

  // Check if current specs deviate from official defaults
  const isCustomized = JSON.stringify(formatSpecs) !== JSON.stringify(DEFAULT_FORMAT_SPECS);

  // ── Interactive Deficiency Calculator State ──
  const [calcTeamA, setCalcTeamA] = useState({ superMaster: 1, master: 1, female: 3 });
  const [calcTeamB, setCalcTeamB] = useState({ superMaster: 1, master: 1, female: 0 });

  // ── Interactive Strike Rotation Step ──
  const [strikeStep, setStrikeStep] = useState(1);

  // Compute Deficiency Runs
  const computeDeficiency = () => {
    let teamABonus = 0;
    let teamBBonus = 0;
    const explanations = [];

    // Female deficiency logic
    if (calcTeamA.female === 0 && calcTeamB.female === 0) {
      teamABonus += 18;
      teamBBonus += 18;
      explanations.push('Dual Female Deficiency (0 vs 0): 18 bonus runs awarded to both sides (3 overs × 6 runs).');
    } else if (calcTeamA.female === 0 && calcTeamB.female > 0) {
      teamBBonus += 18;
      explanations.push(`Team A has 0 females while Team B has ${calcTeamB.female}: Team B receives 18 bonus runs.`);
    } else if (calcTeamB.female === 0 && calcTeamA.female > 0) {
      teamABonus += 18;
      explanations.push(`Team B has 0 females while Team A has ${calcTeamA.female}: Team A receives 18 bonus runs.`);
    }

    // Super Master shortage (1 required, 6 runs per over)
    if (calcTeamA.superMaster === 0 && calcTeamB.superMaster > 0) {
      teamBBonus += 6;
      explanations.push('Team A missing Super Master: +6 bonus runs to Team B.');
    }
    if (calcTeamB.superMaster === 0 && calcTeamA.superMaster > 0) {
      teamABonus += 6;
      explanations.push('Team B missing Super Master: +6 bonus runs to Team A.');
    }
    if (calcTeamA.superMaster === 0 && calcTeamB.superMaster === 0) {
      teamABonus += 6;
      teamBBonus += 6;
      explanations.push('Dual Super Master Shortage: +6 bonus runs to both sides.');
    }

    // Master shortage (1 required, 7 runs per over)
    if (calcTeamA.master === 0 && calcTeamB.master > 0) {
      teamBBonus += 7;
      explanations.push('Team A missing Master: +7 bonus runs to Team B.');
    }
    if (calcTeamB.master === 0 && calcTeamA.master > 0) {
      teamABonus += 7;
      explanations.push('Team B missing Master: +7 bonus runs to Team A.');
    }
    if (calcTeamA.master === 0 && calcTeamB.master === 0) {
      teamABonus += 7;
      teamBBonus += 7;
      explanations.push('Dual Master Shortage: +7 bonus runs to both sides.');
    }

    return { teamABonus, teamBBonus, explanations };
  };

  const deficiencyResults = computeDeficiency();

  const handleOpenEdit = () => {
    setEditingSpecs(formatSpecs);
    setSaveStatus(null);
    setIsEditModalOpen(true);
  };

  const handleSaveSpecs = async (e) => {
    if (e) e.preventDefault();
    if (!isSuperAdmin) return;

    setFormatSpecs(editingSpecs);
    try {
      localStorage.setItem('nepl_format_highlights', JSON.stringify(editingSpecs));
    } catch (err) {
      console.warn('Failed to save format specs to localStorage:', err);
    }

    const formatRuleDoc = {
      id: 'rule-nefl-format-highlights',
      number: '00-SPEC',
      title: 'NEPL TOURNAMENT FORMAT SPECIFICATIONS',
      desc: `Innings: ${editingSpecs.inningsLength.value} (${editingSpecs.inningsLength.detail}) | Squad: ${editingSpecs.squadSize.value} (${editingSpecs.squadSize.detail}) | Fielding: ${editingSpecs.fieldRestrictions.value} (${editingSpecs.fieldRestrictions.detail}) | Boundary: ${editingSpecs.boundaryBonuses.value} (${editingSpecs.boundaryBonuses.detail})`,
      icon: 'Sparkles',
      formatSpecs: editingSpecs,
    };

    if (setRules) {
      setRules(prev => {
        const filtered = prev.filter(r => r.id !== 'rule-nefl-format-highlights');
        return [formatRuleDoc, ...filtered];
      });
    }

    if (isMongoDB) {
      try {
        await apiAddRule(formatRuleDoc);
      } catch (err) {
        console.warn('MongoDB format spec sync fallback:', err);
      }
    }

    setSaveStatus('Saved successfully!');
    setTimeout(() => {
      setIsEditModalOpen(false);
      setSaveStatus(null);
    }, 400);
  };

  const handleResetDefaults = async () => {
    if (!isSuperAdmin) return;
    if (!window.confirm("Reset all 4 tournament format specifications back to official NEPL defaults?")) return;

    setEditingSpecs(DEFAULT_FORMAT_SPECS);
    setFormatSpecs(DEFAULT_FORMAT_SPECS);
    try {
      localStorage.removeItem('nepl_format_highlights');
    } catch (e) {
      console.warn('Failed to clear format specs from localStorage:', e);
    }

    if (setRules) {
      setRules(prev => prev.filter(r => r.id !== 'rule-nefl-format-highlights'));
    }

    setIsEditModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* ── Top Hero Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d1627] via-[#101b33] to-[#0d1627] border border-cyan-500/30 p-6 sm:p-8 shadow-[0_0_40px_rgba(0,242,254,0.15)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                <span>Official {new Date().getFullYear()} Summer Season Blueprint</span>
              </div>

              {isCustomized && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-sans font-bold">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Super Admin Overrides Active</span>
                </div>
              )}
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold font-sans text-white tracking-tight">
              NEPL (Nyati Era Premiere League) Tournament Format
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mt-1.5 leading-relaxed">
              {formatSpecs.inningsLength.value} Per Inning ({formatSpecs.inningsLength.detail}) · {formatSpecs.squadSize.value} Squads ({formatSpecs.squadSize.detail}) · {formatSpecs.fieldRestrictions.value} Fielding Grid · {formatSpecs.boundaryBonuses.value} Net Bonuses
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isSuperAdmin && (
              <button
                onClick={handleOpenEdit}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-sans font-bold transition shadow-sm cursor-pointer"
                title="Super Admin: Override Innings Length, Squad Size, Field Restrictions, and Boundary Bonuses"
              >
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Edit Rule Specs</span>
              </button>
            )}

            {onOpenAiChat && (
              <button
                onClick={onOpenAiChat}
                className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 text-slate-950 font-display font-bold text-sm shadow-[0_0_25px_rgba(0,242,254,0.4)] hover:shadow-[0_0_35px_rgba(0,242,254,0.6)] hover:scale-105 transition-all cursor-pointer flex-shrink-0"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Ask Gemini AI Bot</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Highlights Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-cyan-500/20 font-sans">
          {/* Card 1: Innings Length */}
          <div 
            onClick={() => isSuperAdmin && handleOpenEdit()}
            className={`bg-[#070b14]/70 p-3.5 rounded-2xl border border-cyan-500/15 relative group transition ${
              isSuperAdmin ? 'cursor-pointer hover:border-cyan-500/50 hover:bg-[#070b14]/90' : ''
            }`}
          >
            {isSuperAdmin && (
              <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition text-cyan-400">
                <Edit3 className="w-3.5 h-3.5" />
              </div>
            )}
            <span className="text-[10px] uppercase font-sans text-cyan-400 font-bold block">{formatSpecs.inningsLength.title}</span>
            <span className="text-lg sm:text-xl font-black text-white font-sans">{formatSpecs.inningsLength.value}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">{formatSpecs.inningsLength.detail}</span>
          </div>

          {/* Card 2: Squad Size */}
          <div 
            onClick={() => isSuperAdmin && handleOpenEdit()}
            className={`bg-[#070b14]/70 p-3.5 rounded-2xl border border-purple-500/15 relative group transition ${
              isSuperAdmin ? 'cursor-pointer hover:border-purple-500/50 hover:bg-[#070b14]/90' : ''
            }`}
          >
            {isSuperAdmin && (
              <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition text-purple-400">
                <Edit3 className="w-3.5 h-3.5" />
              </div>
            )}
            <span className="text-[10px] uppercase font-sans text-purple-400 font-bold block">{formatSpecs.squadSize.title}</span>
            <span className="text-lg sm:text-xl font-black text-white font-sans">{formatSpecs.squadSize.value}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">{formatSpecs.squadSize.detail}</span>
          </div>

          {/* Card 3: Field Restrictions */}
          <div 
            onClick={() => isSuperAdmin && handleOpenEdit()}
            className={`bg-[#070b14]/70 p-3.5 rounded-2xl border border-amber-500/15 relative group transition ${
              isSuperAdmin ? 'cursor-pointer hover:border-amber-500/50 hover:bg-[#070b14]/90' : ''
            }`}
          >
            {isSuperAdmin && (
              <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition text-amber-400">
                <Edit3 className="w-3.5 h-3.5" />
              </div>
            )}
            <span className="text-[10px] uppercase font-sans text-amber-400 font-bold block">{formatSpecs.fieldRestrictions.title}</span>
            <span className="text-lg sm:text-xl font-black text-white font-sans">{formatSpecs.fieldRestrictions.value}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">{formatSpecs.fieldRestrictions.detail}</span>
          </div>

          {/* Card 4: Boundary Bonuses */}
          <div 
            onClick={() => isSuperAdmin && handleOpenEdit()}
            className={`bg-[#070b14]/70 p-3.5 rounded-2xl border border-emerald-500/15 relative group transition ${
              isSuperAdmin ? 'cursor-pointer hover:border-emerald-500/50 hover:bg-[#070b14]/90' : ''
            }`}
          >
            {isSuperAdmin && (
              <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition text-emerald-400">
                <Edit3 className="w-3.5 h-3.5" />
              </div>
            )}
            <span className="text-[10px] uppercase font-sans text-emerald-400 font-bold block">{formatSpecs.boundaryBonuses.title}</span>
            <span className="text-lg sm:text-xl font-black text-white font-sans">{formatSpecs.boundaryBonuses.value}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">{formatSpecs.boundaryBonuses.detail}</span>
          </div>
        </div>
      </div>

      {/* ── Grid of Inning Breakdown & Strike Rotation ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Inning Architecture */}
        <div className="bg-[#0b1120] border border-cyan-500/20 rounded-3xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white font-sans">{formatSpecs.inningsLength.value} Inning Architecture</h3>
                  <p className="text-xs text-slate-400">5 Privilege Category Overs + 7 General Category Overs</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {formatSpecs.inningsLength.value.toUpperCase()}
              </span>
            </div>

            <div className="space-y-4">
              {NEFL_FORMAT_DETAILS.matchStructure.map((struct, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#070b14] border border-cyan-500/15">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                      {struct.segment} ({struct.overs} Overs)
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{idx === 0 ? 'Overs 1-5' : 'Overs 6-12'}</span>
                  </div>

                  <div className="space-y-1.5 mb-2.5">
                    {struct.breakdown.map((b, i) => (
                      <div key={i} className="flex items-start justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
                        <span className="text-slate-300 font-medium">
                          {b.category} ({b.overs} over{b.overs > 1 ? 's' : ''})
                        </span>
                        <span className="text-[11px] text-slate-400 text-right max-w-[220px]">{b.desc}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] text-cyan-300/80 bg-cyan-950/30 p-2 rounded-xl border border-cyan-500/20 flex items-start gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>{struct.fieldingNote}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-cyan-500/20 flex items-center justify-between text-xs text-slate-400">
            <span>Counterpart Match-Up: Players face same category</span>
            <span className="font-mono text-cyan-400 font-bold">No Magic Overs</span>
          </div>
        </div>

        {/* Female Circular Strike Rotation */}
        <div className="bg-[#0b1120] border border-purple-500/20 rounded-3xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <RotateCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white font-sans tracking-tight">Female Strike Rotation Mechanism</h3>
                  <p className="text-xs text-slate-400">Continuous 3-player circular loop across 3 overs</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40">
                F1 → F2 → F3
              </span>
            </div>

            {/* Interactive Demo of Circular Loop */}
            <div className="p-4 rounded-2xl bg-[#070b14] border border-purple-500/20 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-purple-300 font-bold uppercase tracking-wider">Live Rotation Visualizer</span>
                <span className="text-xs font-mono text-slate-400">Step {strikeStep} of 4</span>
              </div>

              <div className="flex items-center justify-around py-3 bg-purple-950/20 rounded-xl border border-purple-500/20">
                <div className={`text-center p-2 rounded-xl transition-all ${strikeStep === 1 || strikeStep === 4 ? 'bg-purple-500/30 border border-purple-400 scale-105' : 'opacity-60'}`}>
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-xs text-purple-300 mx-auto mb-1 border border-purple-500/40">F1</div>
                  <span className="text-[10px] font-mono text-purple-200">Striker (Start)</span>
                </div>
                
                <ArrowRight className="w-4 h-4 text-purple-400 animate-pulse" />

                <div className={`text-center p-2 rounded-xl transition-all ${strikeStep === 2 ? 'bg-purple-500/30 border border-purple-400 scale-105' : 'opacity-60'}`}>
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-xs text-purple-300 mx-auto mb-1 border border-purple-500/40">F2</div>
                  <span className="text-[10px] font-mono text-purple-200">Non-Striker</span>
                </div>

                <ArrowRight className="w-4 h-4 text-purple-400 animate-pulse" />

                <div className={`text-center p-2 rounded-xl transition-all ${strikeStep === 3 ? 'bg-purple-500/30 border border-purple-400 scale-105' : 'opacity-60'}`}>
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-xs text-purple-300 mx-auto mb-1 border border-purple-500/40">F3</div>
                  <span className="text-[10px] font-mono text-purple-200">Next in Loop</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-300 text-[11px]">
                  {strikeStep === 1 && "F1 and F2 open batting. F1 on strike."}
                  {strikeStep === 2 && "Wicket 1! F1 exits; F2 takes strike; F3 enters at non-striker."}
                  {strikeStep === 3 && "Wicket 2! F2 exits; F3 takes strike; F1 re-enters at non-striker."}
                  {strikeStep === 4 && "Wicket 3! F3 exits; F1 takes strike; F2 re-enters at non-striker."}
                </span>
                <button
                  onClick={() => setStrikeStep(prev => prev >= 4 ? 1 : prev + 1)}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-mono text-[10px] font-bold cursor-pointer transition"
                >
                  Simulate Wicket
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span><strong>No All-Out:</strong> Overs continue even if wickets fall repeatedly.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span><strong>Re-Entry Rule:</strong> A dismissed female player exits and rejoins at the non-striker end on the next rotation.</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-500/20 text-[11px] text-slate-400">
            * 3 Female overs bowled consecutively in Privilege section.
          </div>
        </div>

      </div>

      {/* ── Interactive Deficiency Calculator & Scenarios ── */}
      <div className="bg-[#0b1120] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,242,254,0.1)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white font-sans">Interactive Deficiency Bonus Calculator</h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Simulate player shortage penalty runs: Super Master (+6/ov), Master (+7/ov), Female (+6/ov)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Team A Controls */}
          <div className="bg-[#070b14] p-5 rounded-2xl border border-cyan-500/20 font-sans">
            <h4 className="text-sm font-bold font-sans uppercase text-cyan-300 mb-3 flex items-center justify-between">
              <span>Team A Turnout</span>
              <span className="text-[10px] text-slate-400">Available</span>
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 flex justify-between">
                  <span>Super Master (Allotted: 1)</span>
                  <span className="font-bold text-cyan-400">{calcTeamA.superMaster}</span>
                </label>
                <input 
                  type="range" min="0" max="1" value={calcTeamA.superMaster}
                  onChange={e => setCalcTeamA({ ...calcTeamA, superMaster: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 flex justify-between">
                  <span>Master (Allotted: 1)</span>
                  <span className="font-bold text-cyan-400">{calcTeamA.master}</span>
                </label>
                <input 
                  type="range" min="0" max="1" value={calcTeamA.master}
                  onChange={e => setCalcTeamA({ ...calcTeamA, master: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 flex justify-between">
                  <span>Females (Allotted: 3)</span>
                  <span className="font-bold text-cyan-400">{calcTeamA.female}</span>
                </label>
                <input 
                  type="range" min="0" max="3" value={calcTeamA.female}
                  onChange={e => setCalcTeamA({ ...calcTeamA, female: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer mt-1"
                />
              </div>
            </div>
          </div>

          {/* Team B Controls */}
          <div className="bg-[#070b14] p-5 rounded-2xl border border-purple-500/20 font-sans">
            <h4 className="text-sm font-bold font-sans uppercase text-purple-300 mb-3 flex items-center justify-between">
              <span>Team B Turnout</span>
              <span className="text-[10px] text-slate-400">Available</span>
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 flex justify-between">
                  <span>Super Master (Allotted: 1)</span>
                  <span className="font-bold text-purple-400">{calcTeamB.superMaster}</span>
                </label>
                <input 
                  type="range" min="0" max="1" value={calcTeamB.superMaster}
                  onChange={e => setCalcTeamB({ ...calcTeamB, superMaster: Number(e.target.value) })}
                  className="w-full accent-purple-400 cursor-pointer mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 flex justify-between">
                  <span>Master (Allotted: 1)</span>
                  <span className="font-bold text-purple-400">{calcTeamB.master}</span>
                </label>
                <input 
                  type="range" min="0" max="1" value={calcTeamB.master}
                  onChange={e => setCalcTeamB({ ...calcTeamB, master: Number(e.target.value) })}
                  className="w-full accent-purple-400 cursor-pointer mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 flex justify-between">
                  <span>Females (Allotted: 3)</span>
                  <span className="font-bold text-purple-400">{calcTeamB.female}</span>
                </label>
                <input 
                  type="range" min="0" max="3" value={calcTeamB.female}
                  onChange={e => setCalcTeamB({ ...calcTeamB, female: Number(e.target.value) })}
                  className="w-full accent-purple-400 cursor-pointer mt-1"
                />
              </div>
            </div>
          </div>

          {/* Computed Bonus Runs Outcome */}
          <div className="bg-[#070b14] p-5 rounded-2xl border border-emerald-500/30 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold font-sans uppercase text-emerald-400 mb-3">
                Calculated Bonus Runs
              </h4>
              
              <div className="grid grid-cols-2 gap-3 text-center my-3">
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                  <span className="text-[10px] text-cyan-300 uppercase block font-mono font-bold">Team A Bonus</span>
                  <span className="text-2xl font-black text-cyan-300 font-display">+{deficiencyResults.teamABonus}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Runs to Team A</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                  <span className="text-[10px] text-purple-300 uppercase block font-mono font-bold">Team B Bonus</span>
                  <span className="text-2xl font-black text-purple-300 font-display">+{deficiencyResults.teamBBonus}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Runs to Team B</span>
                </div>
              </div>

              <div className="space-y-1.5 mt-3 text-xs text-slate-300">
                {deficiencyResults.explanations.length > 0 ? (
                  deficiencyResults.explanations.map((exp, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{exp}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">Full squad present on both sides. No deficiency runs awarded.</p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              * Minimum 2 Privilege & 3 General players required to avoid forfeiture.
            </div>
          </div>
        </div>
      </div>

      {/* ── Fence Bonus Scoring & Fielding Restrictions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Fence Boundary Scoring */}
        <div className="bg-[#0b1120] border border-cyan-500/20 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-sans">Fence Boundary Scoring System</h3>
              <p className="text-xs text-slate-400">Zone bonuses + physical running scoring</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {NEFL_FORMAT_DETAILS.fenceBonusScoring.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-[#070b14] border border-cyan-500/15">
                <div>
                  <span className="text-xs font-bold text-white block">{item.zone}</span>
                  <span className="text-[11px] text-slate-400">{item.notes}</span>
                </div>
                <span className="px-3 py-1 text-xs font-mono font-bold rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex-shrink-0 ml-2">
                  {item.bonus}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-cyan-300/90 mt-4 bg-cyan-500/10 p-3 rounded-2xl border border-cyan-500/20">
            🏏 <strong>Wooden Bats Only:</strong> Mini masters may use plastic bats if needed.
          </p>
        </div>

        {/* Fielding Constraints & Knockouts */}
        <div className="bg-[#0b1120] border border-amber-500/20 rounded-3xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-sans">Fielding Restrictions (2 - 2 Grid)</h3>
                <p className="text-xs text-slate-400">Max 2 behind & max 2 before bowling crease</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-amber-500/20 mb-4">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#070b14] text-amber-300 font-mono">
                  <tr>
                    <th className="p-2.5">Fielders On Ground</th>
                    <th className="p-2.5">Behind - Before Combinations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/10 bg-[#070b14]/50 text-slate-300">
                  {NEFL_FORMAT_DETAILS.fieldingRestrictions.combinations.map((c, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold">{c.playersAvailable} Players</td>
                      <td className="p-2.5 font-mono text-cyan-300">{c.behindBefore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-purple-950/30 rounded-2xl border border-purple-500/20 text-xs space-y-1">
              <div className="flex items-center justify-between text-purple-300 font-bold font-sans">
                <span>Knockout Tie-Breaker</span>
                <span>Super Over</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Male players Super Over (3 batsmen, 2 wickets). 2nd batting team bats first in Super Over.
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>Fielding violation = NO BALL. No Free Hits allowed in NEPL format.</span>
          </div>
        </div>

      </div>

      {/* ── Super Admin Specification Override Modal ── */}
      {isEditModalOpen && isSuperAdmin && createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(0,242,254,0.2)] animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white font-sans flex items-center gap-2">
                    Super Admin Format Override
                  </h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Modify core match specifications: Innings Length, Squad Size, Fielding Restrictions, & Boundary Bonuses
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSpecs} className="space-y-5 font-sans">
              {/* Field 1: Innings Length */}
              <div className="p-4 rounded-2xl bg-[#070b14] border border-cyan-500/25 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>1. Innings Length</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Card 1</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Display Value</span>
                    <input
                      type="text"
                      value={editingSpecs.inningsLength.value}
                      onChange={e => setEditingSpecs({
                        ...editingSpecs,
                        inningsLength: { ...editingSpecs.inningsLength, value: e.target.value }
                      })}
                      placeholder="e.g. 12 Overs"
                      className="w-full bg-[#0b1120] border border-cyan-500/30 rounded-xl px-3 py-2 text-sm text-white font-bold placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Breakdown Detail</span>
                    <input
                      type="text"
                      value={editingSpecs.inningsLength.detail}
                      onChange={e => setEditingSpecs({
                        ...editingSpecs,
                        inningsLength: { ...editingSpecs.inningsLength, detail: e.target.value }
                      })}
                      placeholder="e.g. 5 Privilege + 7 General"
                      className="w-full bg-[#0b1120] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Field 2: Squad Size */}
              <div className="p-4 rounded-2xl bg-[#070b14] border border-purple-500/25 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>2. Squad Size</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Card 2</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Display Value</span>
                    <input
                      type="text"
                      value={editingSpecs.squadSize.value}
                      onChange={e => setEditingSpecs({
                        ...editingSpecs,
                        squadSize: { ...editingSpecs.squadSize, value: e.target.value }
                      })}
                      placeholder="e.g. 12 Players"
                      className="w-full bg-[#0b1120] border border-purple-500/30 rounded-xl px-3 py-2 text-sm text-white font-bold placeholder-slate-600 focus:outline-none focus:border-purple-400"
                      required
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Breakdown Detail</span>
                    <input
                      type="text"
                      value={editingSpecs.squadSize.detail}
                      onChange={e => setEditingSpecs({
                        ...editingSpecs,
                        squadSize: { ...editingSpecs.squadSize, detail: e.target.value }
                      })}
                      placeholder="e.g. 1 SM + 1 M + 3 F + 7 M"
                      className="w-full bg-[#0b1120] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-400"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Field 3: Field Restrictions */}
              <div className="p-4 rounded-2xl bg-[#070b14] border border-amber-500/25 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>3. Field Restrictions</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Card 3</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Display Value</span>
                    <input
                      type="text"
                      value={editingSpecs.fieldRestrictions.value}
                      onChange={e => setEditingSpecs({
                        ...editingSpecs,
                        fieldRestrictions: { ...editingSpecs.fieldRestrictions, value: e.target.value }
                      })}
                      placeholder="e.g. 2 - 2 Grid"
                      className="w-full bg-[#0b1120] border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-white font-bold placeholder-slate-600 focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Breakdown Detail</span>
                    <input
                      type="text"
                      value={editingSpecs.fieldRestrictions.detail}
                      onChange={e => setEditingSpecs({
                        ...editingSpecs,
                        fieldRestrictions: { ...editingSpecs.fieldRestrictions, detail: e.target.value }
                      })}
                      placeholder="e.g. 2 Behind / 2 Before Crease"
                      className="w-full bg-[#0b1120] border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Field 4: Boundary Bonuses */}
              <div className="p-4 rounded-2xl bg-[#070b14] border border-emerald-500/25 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>4. Boundary Bonuses</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Card 4</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Display Value</span>
                    <input
                      type="text"
                      value={editingSpecs.boundaryBonuses.value}
                      onChange={e => setEditingSpecs({
                        ...editingSpecs,
                        boundaryBonuses: { ...editingSpecs.boundaryBonuses, value: e.target.value }
                      })}
                      placeholder="e.g. +1 / +2 Runs"
                      className="w-full bg-[#0b1120] border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-white font-bold placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                      required
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Breakdown Detail</span>
                    <input
                      type="text"
                      value={editingSpecs.boundaryBonuses.detail}
                      onChange={e => setEditingSpecs({
                        ...editingSpecs,
                        boundaryBonuses: { ...editingSpecs.boundaryBonuses, detail: e.target.value }
                      })}
                      placeholder="e.g. Net direct hits + running"
                      className="w-full bg-[#0b1120] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                      required
                    />
                  </div>
                </div>
              </div>

              {saveStatus && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saveStatus}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-cyan-500/20">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Official Defaults</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/25 transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Specifications</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
