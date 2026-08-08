import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  BookOpen, Trophy, Gavel, Clock, Users, ShieldAlert, XCircle, 
  Zap, UserCheck, Gift, CloudRain, UtensilsCrossed, Plus, Trash2, X, Lock, Database, Edit3,
} from 'lucide-react';
import { TOURNAMENT_RULES } from '../data/initialData';
import { useAuth } from '../auth/AuthContext';
import { addRule as apiAddRule, deleteRule as apiDeleteRule, isMongoDB } from '../services/api';

export default function RulesHub({ rules = TOURNAMENT_RULES, setRules }) {
  const { user, can } = useAuth();
  const isSuperAdmin = user?.role === 'superuser';
  const canManage = isSuperAdmin || can('canResetData') || can('canManageUsers');

  // ── Persistent Official Prize Pool State ───────────────────────────────────
  const [prizePool, setPrizePool] = useState(() => {
    try {
      const saved = localStorage.getItem('nepl_prize_pool');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load saved prize pool:', e);
    }
    const prizeRule = rules.find(r => r.id === 'rule-prizepool' || r.title === 'OFFICIAL PRIZE POOL');
    if (prizeRule && prizeRule.prizeData) {
      return prizeRule.prizeData;
    }
    return {
      winner: '2,500',
      runnerUp: '1,500',
      playerOfTournament: '500',
      currency: 'INR',
    };
  });

  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [prizeFormData, setPrizeFormData] = useState(prizePool);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newRule, setNewRule] = useState({
    number: '',
    title: '',
    desc: '',
    icon: 'BookOpen',
  });

  const iconMap = { 
    BookOpen, Trophy, Gavel, Clock, Users, ShieldAlert, XCircle, 
    Zap, UserCheck, Gift, CloudRain, UtensilsCrossed 
  };

  const openPrizeModal = () => {
    setPrizeFormData(prizePool);
    setShowPrizeModal(true);
  };

  const handleSavePrizePool = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    const winnerVal = prizeFormData.winner.trim() || '2,500';
    const runnerVal = prizeFormData.runnerUp.trim() || '1,500';
    const potVal = prizeFormData.playerOfTournament.trim() || '500';
    const currVal = prizeFormData.currency.trim() || 'INR';

    const updatedPrizePool = {
      winner: winnerVal,
      runnerUp: runnerVal,
      playerOfTournament: potVal,
      currency: currVal,
    };

    // 1. Update React State
    setPrizePool(updatedPrizePool);

    // 2. Persist to localStorage
    try {
      localStorage.setItem('nepl_prize_pool', JSON.stringify(updatedPrizePool));
    } catch (err) {
      console.warn('LocalStorage prize pool save error:', err);
    }

    // 3. Persist to MongoDB Atlas rules collection as a special Rule document
    const prizeRuleDoc = {
      id: 'rule-prizepool',
      number: '00',
      title: 'OFFICIAL PRIZE POOL',
      desc: `WINNER: ${currVal} ${winnerVal}/- | RUNNER UP: ${currVal} ${runnerVal}/- | MAN OF TOURNAMENT: ${currVal} ${potVal}/-`,
      icon: 'Gift',
      prizeData: updatedPrizePool,
    };

    if (setRules) {
      setRules(prev => {
        const filtered = prev.filter(r => r.id !== 'rule-prizepool' && r.title !== 'OFFICIAL PRIZE POOL');
        return [prizeRuleDoc, ...filtered];
      });
    }

    if (isMongoDB) {
      try {
        await apiAddRule(prizeRuleDoc);
      } catch (err) {
        console.warn('Direct MongoDB prize pool save fallback:', err);
      }
    }

    setShowPrizeModal(false);
  };

  const handleAddRuleSubmit = async (e) => {
    e.preventDefault();
    if (!newRule.title.trim() || !newRule.desc.trim()) return;

    const ruleNumber = newRule.number.trim() || String(rules.length + 1).padStart(2, '0');

    const createdRule = {
      id: `rule-${Date.now()}`,
      number: ruleNumber,
      title: newRule.title.trim(),
      desc: newRule.desc.trim(),
      icon: newRule.icon,
    };

    // 1. Update React State
    if (setRules) {
      setRules(prev => [...prev, createdRule]);
    }

    // 2. Persist directly to MongoDB Atlas
    if (isMongoDB) {
      try {
        await apiAddRule(createdRule);
      } catch (err) {
        console.warn('Direct MongoDB rule save fallback:', err);
      }
    }

    setShowAddModal(false);
    setNewRule({ number: '', title: '', desc: '', icon: 'BookOpen' });
  };

  const handleDeleteRule = async (ruleToDelete) => {
    if (!canManage || !setRules) return;
    if (window.confirm(`Are you sure you want to delete Rule #${ruleToDelete.number}: "${ruleToDelete.title}"?`)) {
      // 1. Update React State
      setRules(prev => prev.filter(r => r.id !== ruleToDelete.id));

      // 2. Delete directly from MongoDB Atlas
      if (isMongoDB) {
        try {
          await apiDeleteRule(ruleToDelete.id);
        } catch (err) {
          console.warn('Direct MongoDB rule delete fallback:', err);
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-warm-700/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-terracotta-600/8 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-terracotta-600/15 text-terracotta-300 text-xs font-extrabold uppercase border border-terracotta-500/25">
                <BookOpen className="w-3.5 h-3.5" />
                OFFICIAL LEAGUE DIRECTIVE
              </span>
              <span className="inline-flex items-center gap-1 text-sand-400 text-xs font-mono bg-warm-900 px-2.5 py-1 rounded-lg border border-warm-700">
                <Database className="w-3 h-3 text-emerald-400" />
                {isMongoDB ? 'MongoDB Atlas Synced' : 'Local Storage'} ({rules.length} Rules)
              </span>
            </div>

            <h2 className="text-3xl font-black text-sand-100 tracking-tight font-serif">
              NEPL Tournament Guidelines & Rules
            </h2>
            <p className="text-sand-500 text-xs mt-2 max-w-2xl">
              Official rules for Nyati Era Box Cricket League. Stored live in MongoDB Atlas table. All team captains, owners, and players must strictly abide by these directives.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Super Admin Add Rule Button */}
            {canManage && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl bg-terracotta-600 hover:bg-terracotta-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-terracotta-600/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Rule</span>
              </button>
            )}

            {/* Official Prize Pool Card */}
            <div className="bg-gradient-to-tr from-[#c9a227]/25 via-[#c9a227]/15 to-[#c9a227]/30 p-5 rounded-2xl border border-[#c9a227]/40 shadow-xl flex items-center justify-between min-w-[260px] relative overflow-hidden">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-[#c9a227] text-warm-950 rounded-xl font-bold shadow-lg flex-shrink-0">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-extrabold text-[#c9a227] tracking-wider block">Official Prize Pool</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#00ff87]" />
                  </div>
                  <div className="text-sm font-bold text-sand-100 mt-0.5 font-mono">
                    WINNER: <span className="text-cricket-emerald font-extrabold">{prizePool.currency} {prizePool.winner}/-</span>
                  </div>
                  <div className="text-xs text-sand-300 font-medium font-mono">
                    RUNNER UP: <span className="text-[#c9a227] font-extrabold">{prizePool.currency} {prizePool.runnerUp}/-</span>
                  </div>
                  {prizePool.playerOfTournament && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      MAN OF TOURNAMENT: <span className="text-cyan-300 font-extrabold">{prizePool.currency} {prizePool.playerOfTournament}/-</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Super Admin Edit Prize Pool Button */}
              {isSuperAdmin && (
                <button
                  onClick={openPrizeModal}
                  className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition shrink-0 ml-3 cursor-pointer flex items-center space-x-1"
                  title="Edit Official Prize Pool"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Key Callouts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-red-500/25 bg-red-950/15 flex items-start space-x-3">
          <UserCheck className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-sand-100 text-sm">Final Decision Authority</h4>
            <p className="text-xs text-sand-400 mt-1">
              Umpire decision is final. For major disputes, <strong className="text-sand-200">FINAL decision by Harish & Santosh</strong>.
            </p>
          </div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-[#c9a227]/25 bg-[#c9a227]/8 flex items-start space-x-3">
          <Users className="w-6 h-6 text-[#c9a227] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-sand-100 text-sm">Max 6 Players On Field</h4>
            <p className="text-xs text-sand-400 mt-1">
              8 players per squad. <strong className="text-sand-200">Only 6 allowed on field</strong> at any time. Captains must rotate!
            </p>
          </div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-cricket-emerald/25 bg-cricket-emerald/8 flex items-start space-x-3">
          <UtensilsCrossed className="w-6 h-6 text-cricket-emerald shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-sand-100 text-sm">Sunday 8 PM & Dinner Party</h4>
            <p className="text-xs text-sand-400 mt-1">
              Finals wrap by Sunday 8 PM followed by a grand community <strong className="text-sand-200">Dinner Party</strong>!
            </p>
          </div>
        </div>
      </div>

      {/* Tiered Bidding Slabs Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-3 bg-cyan-500/20 text-cyan-300 rounded-xl border border-cyan-500/40 shrink-0">
              <Gavel className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sand-100 text-sm flex items-center gap-2 font-display">
                Official Tiered Bidding Increments
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] uppercase tracking-wider border border-cyan-500/40">Live Rule</span>
              </h4>
              <p className="text-xs text-sand-400 mt-0.5">
                Bidding increments scale dynamically based on the player's current high bid price:
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5 text-center font-mono text-xs shrink-0">
            <div className="p-2.5 rounded-xl bg-warm-900/90 border border-emerald-500/30">
              <span className="text-[10px] text-sand-400 block">Up to ₹1,000</span>
              <span className="text-emerald-400 font-black">+₹100 PTS</span>
            </div>
            <div className="p-2.5 rounded-xl bg-warm-900/90 border border-cyan-500/30">
              <span className="text-[10px] text-sand-400 block">₹1,000 – ₹3,000</span>
              <span className="text-cyan-300 font-black">+₹200 PTS</span>
            </div>
            <div className="p-2.5 rounded-xl bg-warm-900/90 border border-amber-500/30">
              <span className="text-[10px] text-sand-400 block">Above ₹3,000</span>
              <span className="text-amber-300 font-black">+₹300 PTS+</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {rules.map(rule => {
          const IconComp = iconMap[rule.icon] || BookOpen;
          return (
            <div
              key={rule.id}
              className="glass-card p-6 rounded-2xl border border-warm-700/50 glass-card-hover flex items-start space-x-4 relative overflow-hidden"
            >
              <div className="w-11 h-11 rounded-xl bg-warm-900 border border-warm-700 flex items-center justify-center shrink-0 text-terracotta-400">
                <IconComp className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#c9a227] bg-[#c9a227]/10 px-2 py-0.5 rounded border border-[#c9a227]/20">
                    RULE #{rule.number}
                  </span>

                  {/* Super Admin Delete Rule Button */}
                  {canManage && (
                    <button
                      onClick={() => handleDeleteRule(rule)}
                      className="p-1 rounded-lg bg-warm-900 hover:bg-red-950/80 text-sand-600 hover:text-red-400 border border-warm-700 hover:border-red-500/40 transition"
                      title={`Delete Rule #${rule.number}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-sand-100 font-serif">
                  {rule.title}
                </h3>
                <p className="text-xs text-sand-400 leading-relaxed">
                  {rule.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Super Admin Edit Prize Pool Modal ── */}
      {showPrizeModal && isSuperAdmin && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
              <h3 className="text-xl font-black text-amber-300 flex items-center gap-2 font-display">
                <Gift className="w-6 h-6 text-amber-400" />
                <span>⚡ Super Admin: Edit Official Prize Pool</span>
              </h3>
              <button
                onClick={() => setShowPrizeModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePrizePool} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Currency Prefix</label>
                  <input
                    type="text"
                    required
                    value={prizeFormData.currency}
                    onChange={e => setPrizeFormData({ ...prizeFormData, currency: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-400 mb-1">Winner Prize Amount</label>
                  <input
                    type="text"
                    required
                    placeholder="2,500"
                    value={prizeFormData.winner}
                    onChange={e => setPrizeFormData({ ...prizeFormData, winner: e.target.value })}
                    className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-2 text-emerald-300 font-mono font-extrabold text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1">Runner Up Prize Amount</label>
                  <input
                    type="text"
                    required
                    placeholder="1,500"
                    value={prizeFormData.runnerUp}
                    onChange={e => setPrizeFormData({ ...prizeFormData, runnerUp: e.target.value })}
                    className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-2 text-amber-300 font-mono font-extrabold text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-cyan-400 mb-1">Man of Tournament Prize</label>
                  <input
                    type="text"
                    placeholder="500"
                    value={prizeFormData.playerOfTournament}
                    onChange={e => setPrizeFormData({ ...prizeFormData, playerOfTournament: e.target.value })}
                    className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl px-3 py-2 text-cyan-300 font-mono font-extrabold text-base"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs text-slate-400">
                <span className="text-amber-400 font-bold block mb-1">Live Database Synchronization:</span>
                Saving will instantly update the official prize pool card and persist the record to MongoDB Atlas.
              </div>

              <div className="pt-3 flex justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPrizeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 border border-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-xl cursor-pointer"
                >
                  Save Prize Pool to MongoDB
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body
      )}

      {/* ── Super Admin Add Rule Modal ── */}
      {showAddModal && canManage && createPortal(
        <div className="fixed inset-0 z-[100] bg-warm-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="warm-card w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-warm-700/60 space-y-6 relative max-h-[90vh] overflow-y-auto shadow-2xl my-auto">
            
            <div className="flex items-center justify-between border-b border-warm-700/50 pb-4">
              <h3 className="text-xl font-black text-sand-100 flex items-center gap-2 font-serif">
                <BookOpen className="w-5 h-5 text-terracotta-400" />
                Add Official League Rule to MongoDB
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRuleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Rule #</label>
                  <input
                    type="text"
                    placeholder={`e.g. ${String(rules.length + 1).padStart(2, '0')}`}
                    value={newRule.number}
                    onChange={e => setNewRule({ ...newRule, number: e.target.value })}
                    className="warm-input font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-sand-400 block mb-1.5">Rule Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. No Free Hit on Wide"
                    value={newRule.title}
                    onChange={e => setNewRule({ ...newRule, title: e.target.value })}
                    className="warm-input"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-sand-400 block mb-1.5">Rule Icon Category</label>
                <select
                  value={newRule.icon}
                  onChange={e => setNewRule({ ...newRule, icon: e.target.value })}
                  className="warm-input cursor-pointer"
                >
                  <option value="BookOpen">📖 Directive / Standard Rule</option>
                  <option value="Trophy">🏆 Tournament / Format</option>
                  <option value="Gavel">🔨 Auction / Selection</option>
                  <option value="Clock">⏱️ Overs / Time Limit</option>
                  <option value="Users">👥 Squad & Playing XI</option>
                  <option value="ShieldAlert">🛡️ Boundary & Fence</option>
                  <option value="XCircle">❌ Out / Wickets</option>
                  <option value="Zap">⚡ Playoff & Qualifier</option>
                  <option value="UserCheck">👨‍⚖️ Umpire & Decisions</option>
                  <option value="Gift">🎁 Prize Money</option>
                  <option value="CloudRain">🌧️ Rain / Schedule</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-sand-400 block mb-1.5">Rule Directive Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide explicit directive instructions for captains, players, and umpires..."
                  value={newRule.desc}
                  onChange={e => setNewRule({ ...newRule, desc: e.target.value })}
                  className="warm-input resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-warm-700/50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary cursor-pointer">
                  <Plus className="w-4 h-4" />
                  Save Rule to MongoDB Atlas
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
