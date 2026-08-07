import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  BookOpen, Trophy, Gavel, Clock, Users, ShieldAlert, XCircle, 
  Zap, UserCheck, Gift, CloudRain, UtensilsCrossed, Plus, Trash2, X, Lock, Database,
} from 'lucide-react';
import { TOURNAMENT_RULES } from '../data/initialData';
import { useAuth } from '../auth/AuthContext';
import { addRule as apiAddRule, deleteRule as apiDeleteRule, isMongoDB } from '../services/api';

export default function RulesHub({ rules = TOURNAMENT_RULES, setRules }) {
  const { can } = useAuth();
  const canManage = can('canResetData') || can('canManageUsers');

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
                className="flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl bg-terracotta-600 hover:bg-terracotta-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-terracotta-600/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Rule</span>
              </button>
            )}

            {/* Prize Card */}
            <div className="bg-gradient-to-tr from-[#c9a227]/20 via-[#c9a227]/10 to-[#c9a227]/25 p-5 rounded-2xl border border-[#c9a227]/40 shadow-xl flex items-center space-x-4 min-w-[240px]">
              <div className="p-3 bg-[#c9a227] text-warm-950 rounded-xl font-bold shadow-lg">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold text-[#c9a227] tracking-wider block">Official Prize Pool</span>
                <div className="text-sm font-bold text-sand-100 mt-0.5">
                  WINNER: <span className="text-cricket-emerald font-mono font-extrabold">INR 2,500/-</span>
                </div>
                <div className="text-xs text-sand-400 font-medium">
                  RUNNER UP: <span className="text-[#c9a227] font-mono font-extrabold">INR 1,500/-</span>
                </div>
              </div>
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
                className="p-1.5 rounded-lg text-sand-500 hover:text-sand-200 bg-warm-900 border border-warm-700"
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
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
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
