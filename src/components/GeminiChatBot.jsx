import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, Sparkles, X, Minimize2, Maximize2, 
  Settings, Key, Users, BookOpen, RefreshCw, Copy, 
  Check, CheckCircle2, Award, Zap, ChevronRight, 
  ShieldAlert, RotateCcw, Download, PlusCircle, Trash2,
  Sliders, Maximize, Minimize, CheckCheck
} from 'lucide-react';
import { queryGeminiChat, generateBalancedNEFLTeams, calculatePlayerRating } from '../services/gemini';
import { NEFL_2026_RAW_RULES_TEXT } from '../data/neflRulesData';
import { saveTeams, savePlayers, updateTeam as apiUpdateTeam, updatePlayer as apiUpdatePlayer } from '../services/api';
import FormattedChatMessage from './FormattedChatMessage';

export default function GeminiChatBot({
  players = [],
  setPlayers,
  teams = [],
  setTeams,
  isOpen,
  setIsOpen
}) {
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      role: 'assistant',
      text: `👋 **Welcome to the NEPL (Nyati Era Premiere League) AI Tournament Strategist!**\n\nI am pre-loaded with all official **NEPL ${new Date().getFullYear()} Season Rules** and live player performance ratings.\n\nAsk me any tournament question, simulate match scenarios, or click **"Generate Balanced Teams"** below!`,
      source: 'Gemini AI Assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    return localStorage.getItem('nepl_gemini_api_key') || '';
  });
  const [customRulesText, setCustomRulesText] = useState(() => {
    return localStorage.getItem('nepl_custom_rules') || '';
  });
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'teams-generator' | 'custom-rules'
  const [generatedTeamsData, setGeneratedTeamsData] = useState(null);
  const [teamCount, setTeamCount] = useState(4);
  const [squadSize, setSquadSize] = useState(10);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Window sizing & maximize state
  const [chatWidth, setChatWidth] = useState(() => {
    return localStorage.getItem('nepl_chat_width') || 'wide'; // 'standard' | 'wide' | 'ultra'
  });
  const [isMaximized, setIsMaximized] = useState(() => {
    return localStorage.getItem('nepl_chat_maximized') === 'true';
  });

  const handleToggleWidth = (mode) => {
    setChatWidth(mode);
    localStorage.setItem('nepl_chat_width', mode);
    if (isMaximized) {
      setIsMaximized(false);
      localStorage.setItem('nepl_chat_maximized', 'false');
    }
  };

  const handleToggleMaximize = () => {
    setIsMaximized(prev => {
      const next = !prev;
      localStorage.setItem('nepl_chat_maximized', String(next));
      return next;
    });
  };

  const handleCopyMessage = (msgId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeView]);

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    localStorage.setItem('nepl_gemini_api_key', apiKeyInput.trim());
    setIsApiKeyModalOpen(false);
    alert('✅ Gemini API Key saved successfully in local storage!');
  };

  const handleSaveCustomRules = (e) => {
    e.preventDefault();
    localStorage.setItem('nepl_custom_rules', customRulesText);
    alert('✅ Custom NEPL Rules updated and attached to AI context!');
  };

  const handleSendMessage = async (textToSend) => {
    const userText = (textToSend || inputValue).trim();
    if (!userText || isLoading) return;

    const userMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await queryGeminiChat({
        prompt: userText,
        conversationHistory: messages,
        customRules: customRulesText,
        apiKey: apiKeyInput,
        players,
        teams
      });

      const botMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: response.text,
        source: response.source || 'Gemini 1.5 Flash',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ Error processing query: ${err.message}`,
          source: 'Error Handler',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const [onlyActivePlayers, setOnlyActivePlayers] = useState(true);

  const handleGenerateTeams = (overrideTeamCount, overrideSquadSize) => {
    const activeTeamCount = overrideTeamCount || teamCount;
    const activeSquadSize = overrideSquadSize || squadSize;
    setIsLoading(true);
    setAppliedSuccess(false);
    try {
      const result = generateBalancedNEFLTeams(players, activeTeamCount, [], onlyActivePlayers, activeSquadSize);
      if (result.error) {
        alert(`⚠️ Team Generation Notice: ${result.error}`);
        setIsLoading(false);
        return;
      }

      setGeneratedTeamsData(result);
      setActiveView('teams-generator');

      // Add summary message into chat history
      setMessages(prev => [
        ...prev,
        {
          id: `gen-${Date.now()}`,
          role: 'assistant',
          text: `⚡ **Generated ${result.teams?.length || activeTeamCount} Balanced NEFL Teams (${activeSquadSize} Players / Squad)**\n\n- **Target Squad Number:** ${activeSquadSize} members per team\n- **Total Players Assigned:** ${result.totalPlayersAssigned} (Filtered by: ${onlyActivePlayers ? 'Playing in NEPL Only' : 'All Players'})\n- Balanced aggregate ratings and batting/bowling strength across squads. View the detailed roster below or click **Apply to Teams**!`,
          source: 'NEFL AI Team Optimizer',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      alert(`Failed to generate teams: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyGeneratedTeams = async () => {
    if (!generatedTeamsData?.teams || generatedTeamsData.teams.length === 0) return;
    if (window.confirm(`⚡ Ready to load ${generatedTeamsData.teams.length} teams and their squads directly into the live tournament without an auction?\n\nThis will place all balanced players into team squads, designate team captains, and keep all rosters ready for matches. (Super Admin can override, swap, or reassign players at any time in Teams & Roster).`)) {
      
      const teamIdMap = {};
      const newTeams = generatedTeamsData.teams.map((t, idx) => {
        // Reuse existing team identity (color, logo, shortName) if available
        const existing = (teams && teams[idx]) || {};
        const teamId = existing.id || t.id || `team-${idx + 1}`;
        const captain = t.captain || (t.players && t.players.find(p => p.isCaptain)) || (t.players && t.players[0]) || null;
        const capId = captain ? captain.id : null;
        
        const squad = (t.players || []).map(p => {
          teamIdMap[p.id] = teamId;
          const isThisCaptain = Boolean(capId && String(capId) === String(p.id));
          return {
            id: p.id,
            name: p.name,
            role: p.role || 'Batting All-Rounder',
            category: p.category || 'Male',
            soldPrice: 0,
            avatarUrl: p.avatarUrl || '/avatars/male.png',
            cricHeroesUrl: p.cricHeroesUrl || '',
            isCaptain: isThisCaptain,
            captainOfTeamId: isThisCaptain ? teamId : null,
            ratings: p.ratings || {}
          };
        });

        return {
          id: teamId,
          name: t.name || existing.name || `Team ${idx + 1}`,
          shortName: t.shortName || existing.shortName || `T${idx + 1}`,
          logo: existing.logo || t.logo || '🏏',
          color: existing.color || t.color || '#d4622a',
          owner: captain ? captain.name : (existing.owner || 'Assigned'),
          captainId: capId,
          captainName: captain ? captain.name : (existing.captainName || null),
          totalPurse: existing.totalPurse || 10000,
          spentPurse: 0,
          maxSquadSize: squadSize || t.maxSquadSize || 10,
          playersCount: squad.length,
          squad: squad
        };
      });

      // Update players state & status (only 1 captain per team)
      const updatedPlayers = players.map(p => {
        const assignedTeamId = teamIdMap[p.id];
        if (assignedTeamId) {
          const matchingTeam = newTeams.find(t => t.id === assignedTeamId);
          const isCap = Boolean(matchingTeam && String(matchingTeam.captainId) === String(p.id));
          return {
            ...p,
            status: 'sold',
            soldTo: assignedTeamId,
            soldPrice: 0,
            isCaptain: isCap,
            captainOfTeamId: isCap ? assignedTeamId : null,
            isAuctioneer: isCap ? true : Boolean(p.isAuctioneer)
          };
        } else {
          return {
            ...p,
            status: 'available',
            soldTo: null,
            soldPrice: 0,
            isCaptain: false,
            captainOfTeamId: null
          };
        }
      });

      setTeams(newTeams);
      if (setPlayers) {
        setPlayers(updatedPlayers);
      }

      try {
        await saveTeams(newTeams);
        await savePlayers(updatedPlayers);
      } catch (err) {
        console.warn('Error saving teams & players to backend:', err);
      }

      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 4000);
      alert('🎉 Generated teams and squads successfully applied! Tournament is 100% ready without auction. Super Admin can override or swap players anytime in the Teams view.');
    }
  };

  const copyRosterToClipboard = () => {
    if (!generatedTeamsData?.teams) return;
    let text = `=== NEPL ${new Date().getFullYear()} BALANCED TEAM ROSTERS ===\n\n`;
    generatedTeamsData.teams.forEach((t, i) => {
      text += `TEAM ${i + 1}: ${t.name} (Avg Rating: ${t.avgRating} | Batting: ${t.battingPower} | Bowling: ${t.bowlingPower})\n`;
      text += `Captain: ${t.captain?.name || 'TBD'} (Rating: ${t.captain?.ratings?.overall || 50})\n`;
      text += `Vice Captain: ${t.viceCaptain?.name || 'TBD'}\n`;
      text += `Players (${t.players.length}):\n`;
      t.players.forEach(p => {
        text += `  • [${p.category || 'General'}] ${p.name} (Rating: ${p.ratings?.overall || 50}, SR: ${p.strikeRate || '-'}, Runs: ${p.runs || 0}, Wkts: ${p.wickets || 0})\n`;
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedId('roster');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Determine window size classes
  const getWindowSizeClasses = () => {
    if (isMaximized) {
      return 'fixed inset-2 sm:inset-4 md:inset-6 z-50 flex flex-col bg-[#070b14]/98 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl sm:rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.95)]';
    }

    let widthClass = 'sm:w-[680px] sm:h-[720px] sm:max-h-[88vh]';
    if (chatWidth === 'standard') {
      widthClass = 'sm:w-[580px] sm:h-[680px] sm:max-h-[85vh]';
    } else if (chatWidth === 'wide') {
      widthClass = 'sm:w-[880px] sm:h-[760px] sm:max-h-[90vh]';
    } else if (chatWidth === 'ultra') {
      widthClass = 'sm:w-[1180px] sm:h-[820px] sm:max-h-[92vh]';
    }

    return `fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 md:bottom-6 md:right-6 ${widthClass} sm:max-w-[calc(100vw-2rem)] z-50 flex flex-col bg-[#070b14]/95 backdrop-blur-2xl border border-cyan-500/30 sm:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.85)]`;
  };

  if (!isOpen) {
    return (
      <div className="hidden lg:block fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 text-slate-950 font-sans font-extrabold text-sm sm:text-base shadow-[0_0_30px_rgba(0,242,254,0.5)] hover:shadow-[0_0_40px_rgba(0,242,254,0.8)] hover:scale-105 transition-all cursor-pointer tracking-tight"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#00ff87]" />
          <Bot className="w-5 h-5 text-slate-950" />
          <span className="font-sans font-extrabold">NEPL AI Bot</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-950/20 text-xs font-sans font-extrabold text-slate-900 border border-slate-950/30">
            Gemini
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={`${getWindowSizeClasses()} overflow-hidden animate-fade-in-up font-sans transition-all duration-200`}>
      
      {/* ── Chat Header ── */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#0b1120] via-[#0f172a] to-[#0b1120] border-b border-cyan-500/20 flex items-center justify-between flex-shrink-0 gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-500 p-[2px] shadow-[0_0_15px_rgba(0,242,254,0.4)] flex-shrink-0">
            <div className="w-full h-full bg-[#070b14] rounded-[10px] flex items-center justify-center">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="text-xs sm:text-sm md:text-base font-extrabold text-white tracking-tight font-sans truncate">
                NEPL AI Tournament Strategist
              </h3>
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-sans font-bold border border-cyan-500/30 flex-shrink-0">
                Gemini
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#00ff87] flex-shrink-0" />
              Rules Knowledge · Rating Engine · Team Balancer
            </p>
          </div>
        </div>

        {/* Header Right Actions: Width Selector + Maximize + API Key + Close */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          
          {/* Width Selection Pills */}
          <div className="hidden md:flex items-center bg-[#070b14] p-0.5 rounded-xl border border-cyan-500/25 text-[10px] font-sans font-bold mr-1">
            <button
              onClick={() => handleToggleWidth('standard')}
              className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                chatWidth === 'standard' && !isMaximized
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Standard Width (580px)"
            >
              Standard
            </button>
            <button
              onClick={() => handleToggleWidth('wide')}
              className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                chatWidth === 'wide' && !isMaximized
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Wide Width (880px)"
            >
              Wide
            </button>
            <button
              onClick={() => handleToggleWidth('ultra')}
              className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                chatWidth === 'ultra' && !isMaximized
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Ultra-Wide (1180px)"
            >
              Ultra
            </button>
          </div>

          {/* Maximize / Minimize Button */}
          <button
            onClick={handleToggleMaximize}
            className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer ${
              isMaximized
                ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/50 border-cyan-500/20'
            }`}
            title={isMaximized ? "Restore Window Size" : "Maximize Chat Window"}
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>

          {/* API Key settings button */}
          <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800/50 border border-cyan-500/20 transition cursor-pointer"
            title="Configure Gemini API Key"
          >
            <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 border border-cyan-500/20 transition cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* ── View Navigation Bar ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#070b14] border-b border-cyan-500/15 text-xs flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveView('chat')}
            className={`px-3 py-1 rounded-xl font-sans font-extrabold transition cursor-pointer ${
              activeView === 'chat'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveView('teams-generator')}
            className={`px-3 py-1 rounded-xl font-sans font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
              activeView === 'teams-generator'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Balancer</span>
          </button>
          <button
            onClick={() => setActiveView('custom-rules')}
            className={`px-3 py-1 rounded-xl font-sans font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
              activeView === 'custom-rules'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Custom Rules</span>
          </button>
        </div>

        <button
          onClick={handleGenerateTeams}
          className="px-2.5 py-1 text-xs font-sans font-extrabold rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:scale-105 transition cursor-pointer flex items-center gap-1"
        >
          <Zap className="w-3 h-3 fill-slate-950" />
          <span>Auto-Balance</span>
        </button>
      </div>

      {/* ── Chat Messages View ── */}
      {activeView === 'chat' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* ⚡ AI Team & Squad Number Generator Quick Bar */}
          {(() => {
            const activePoolCount = players.filter(p => p.isPlayingNEPL !== false).length;
            const autoSquadNumber = teamCount > 0 ? Math.max(1, Math.floor(activePoolCount / teamCount)) : 10;
            
            return (
              <div className="bg-[#070b14] border border-cyan-500/30 rounded-2xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg shrink-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 font-extrabold text-xs flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 fill-cyan-400" />
                    <span>AI Squad Builder</span>
                  </span>

                  {/* Team Count Selector */}
                  <div className="flex items-center gap-1.5 bg-[#0b1120] px-2.5 py-1.5 rounded-xl border border-cyan-500/30 text-xs">
                    <span className="text-slate-400 font-mono">Teams:</span>
                    <select
                      value={teamCount}
                      onChange={e => setTeamCount(Number(e.target.value))}
                      className="bg-transparent text-cyan-300 font-mono font-black focus:outline-none cursor-pointer"
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 24].map(n => (
                        <option key={n} value={n} className="bg-[#0b1120] text-slate-200">{n} Teams</option>
                      ))}
                    </select>
                  </div>

                  {/* Squad Number / Players per Team Selector */}
                  <div className="flex items-center gap-1.5 bg-[#0b1120] px-2.5 py-1.5 rounded-xl border border-purple-500/30 text-xs">
                    <span className="text-slate-400 font-mono">Squad Number:</span>
                    <select
                      value={squadSize}
                      onChange={e => setSquadSize(Number(e.target.value))}
                      className="bg-transparent text-purple-300 font-mono font-black focus:outline-none cursor-pointer"
                    >
                      {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 25, 30].map(n => (
                        <option key={n} value={n} className="bg-[#0b1120] text-slate-200">{n} Players/Team</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSquadSize(autoSquadNumber)}
                    className="text-[11px] font-mono font-bold text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 rounded-lg border border-amber-500/30 transition cursor-pointer"
                    title={`Auto calculate squad size from ${activePoolCount} playing pool`}
                  >
                    Auto ({autoSquadNumber})
                  </button>
                </div>

                <button
                  onClick={() => handleGenerateTeams(teamCount, squadSize)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-sans font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,242,254,0.35)] transition cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Generate {teamCount} Teams ({squadSize} Players Each)</span>
                </button>
              </div>
            );
          })()}

          {/* Quick Prompt Pill Chips */}
          <div className="flex flex-wrap gap-1.5 pb-2">
            {[
              { label: '⚡ Generate 10-Player Squads', action: () => { setSquadSize(10); handleGenerateTeams(teamCount, 10); } },
              { label: '⚡ Generate 12-Player Squads', action: () => { setSquadSize(12); handleGenerateTeams(teamCount, 12); } },
              { label: '📋 Deficiency Rule Matrix', query: `Explain the NEPL ${new Date().getFullYear()} deficiency rule and bonus runs matrix with examples.` },
              { label: '🔄 Female Circular Strike', query: 'How does the female circular strike rotation rule work in the 3 privilege overs?' },
              { label: '🏏 Fence Bonus Scoring', query: 'What are the fence bonus scoring runs and straight net 4s and 6s in NEPL?' },
              { label: '🛡️ Fielding Restrictions', query: 'What are the 2-behind and 2-before fielding restrictions and penalties in NEPL?' }
            ].map((pill, i) => (
              <button
                key={i}
                onClick={() => pill.action ? pill.action() : handleSendMessage(pill.query)}
                className="text-xs font-sans font-bold px-3 py-1.5 rounded-xl bg-[#0b1120] hover:bg-cyan-500/15 text-slate-300 hover:text-cyan-300 border border-cyan-500/20 transition cursor-pointer"
              >
                {pill.label}
              </button>
            ))}
          </div>

          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div
                  className={`w-full max-w-[95%] sm:max-w-[90%] md:max-w-[85%] p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm font-sans leading-relaxed transition-all shadow-md ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-[0_0_15px_rgba(0,242,254,0.25)] rounded-br-none ml-auto'
                      : 'bg-[#0b1120] text-slate-200 border border-cyan-500/25 rounded-bl-none shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                  }`}
                >
                  <FormattedChatMessage content={msg.text} isUser={isUser} />
                </div>

                <div className={`flex items-center gap-2 text-[10px] text-slate-500 font-mono px-1 ${isUser ? 'justify-end' : 'justify-between w-full max-w-[95%] sm:max-w-[90%] md:max-w-[85%]'}`}>
                  <div className="flex items-center gap-1.5">
                    <span>{msg.timestamp}</span>
                    {msg.source && <span className="text-cyan-400/80 font-sans font-bold">· {msg.source}</span>}
                  </div>

                  {!isUser && (
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.text)}
                      className="text-[10px] font-sans font-bold text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer py-0.5 px-1.5 rounded-md hover:bg-slate-800"
                    >
                      {copiedMsgId === msg.id ? (
                        <>
                          <CheckCheck className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 p-3.5 bg-[#0b1120] border border-cyan-500/20 rounded-2xl w-fit text-xs sm:text-sm font-sans font-bold text-cyan-300">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Gemini AI is analyzing rules & player ratings…</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ── Team Balancer Generator View ── */}
      {activeView === 'teams-generator' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          <div className="bg-[#0b1120] border border-purple-500/30 rounded-2xl p-4 shadow-xl">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-3">
              <div>
                <h4 className="text-sm sm:text-base font-extrabold text-purple-300 font-sans flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Performance-Balanced NEPL Squad Generator</span>
                </h4>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Balanced by composite rating (runs, strike rate, wickets, economy, category quotas & squad size)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Team count */}
                <div className="flex items-center gap-1.5 bg-[#070b14] px-2.5 py-1.5 rounded-xl border border-purple-500/30">
                  <label className="text-xs text-slate-300 font-mono">Teams:</label>
                  <select
                    value={teamCount}
                    onChange={e => setTeamCount(Number(e.target.value))}
                    className="bg-transparent text-purple-300 text-xs font-mono font-black focus:outline-none cursor-pointer"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 24].map(n => (
                      <option key={n} value={n} className="bg-[#0b1120] text-slate-200">{n} Teams</option>
                    ))}
                  </select>
                </div>

                {/* Squad size / Squad Number */}
                <div className="flex items-center gap-1.5 bg-[#070b14] px-2.5 py-1.5 rounded-xl border border-cyan-500/30">
                  <label className="text-xs text-slate-300 font-mono">Squad Number:</label>
                  <select
                    value={squadSize}
                    onChange={e => setSquadSize(Number(e.target.value))}
                    className="bg-transparent text-cyan-300 text-xs font-mono font-black focus:outline-none cursor-pointer"
                  >
                    {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 25, 30].map(n => (
                      <option key={n} value={n} className="bg-[#0b1120] text-slate-200">{n} Players</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => handleGenerateTeams(teamCount, squadSize)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-sans text-xs font-extrabold transition cursor-pointer flex items-center gap-1 shadow-md"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-purple-500/20 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-400 font-sans">
                  Pool: <strong className="text-white">{players.length}</strong> (<span className="text-emerald-400 font-bold">{players.filter(p => p.isPlayingNEPL !== false).length} Playing</span> · <span className="text-amber-400">{players.filter(p => p.isPlayingNEPL === false).length} Reserve</span>)
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-cyan-300 font-sans font-bold text-xs bg-[#070b14] px-2.5 py-1 rounded-lg border border-cyan-500/30">
                  <input
                    type="checkbox"
                    checked={onlyActivePlayers}
                    onChange={e => setOnlyActivePlayers(e.target.checked)}
                    className="accent-cyan-400 cursor-pointer"
                  />
                  <span>Playing Only</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyRosterToClipboard}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-sans font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedId === 'roster' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedId === 'roster' ? 'Copied!' : 'Copy Roster'}</span>
                </button>
                <button
                  onClick={handleApplyGeneratedTeams}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs font-sans flex items-center gap-1 shadow-[0_0_12px_rgba(16,185,129,0.4)] transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apply to Live Teams</span>
                </button>
              </div>
            </div>

            {appliedSuccess && (
              <div className="mt-2 p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs text-center font-bold font-sans animate-fade-in">
                ✅ Live tournament teams updated with generated rosters!
              </div>
            )}
          </div>

          {/* Generated Teams Grid */}
          {generatedTeamsData?.teams && (
            <div className={`grid gap-3.5 ${
              isMaximized || chatWidth === 'ultra'
                ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                : chatWidth === 'wide'
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1'
            }`}>
              {generatedTeamsData.teams.map((team, idx) => (
                <div 
                  key={team.id || idx}
                  className="bg-[#0b1120] border border-cyan-500/20 rounded-2xl p-3.5 space-y-2.5 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs font-mono">
                          {idx + 1}
                        </span>
                        <h5 className="font-extrabold text-sm sm:text-base text-white font-sans">{team.name}</h5>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-[#070b14] border border-purple-500/30 text-purple-300 shadow-sm">
                          {team.players.length} / {team.maxSquadSize || squadSize} Players
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-sans mt-0.5">
                        👑 Captain: <span className="text-amber-300 font-bold">{team.captain?.name || 'TBD'}</span> · VC: <span className="text-cyan-300 font-bold">{team.viceCaptain?.name || 'TBD'}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold block">
                        Rating: {team.avgRating}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        🏏 Bat: {team.battingPower} | 🎯 Bowl: {team.bowlingPower}
                      </span>
                    </div>
                  </div>

                  {/* Player Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {team.players.map(p => {
                      const cat = (p.category || '').toLowerCase();
                      let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
                      if (cat.includes('super')) badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                      else if (cat.includes('master')) badgeStyle = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
                      else if (cat.includes('female')) badgeStyle = 'bg-pink-500/20 text-pink-300 border-pink-500/40';

                      return (
                        <div 
                          key={p.id}
                          className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1 ${badgeStyle} font-sans`}
                          title={`Rating: ${p.ratings?.overall || 50} | SR: ${p.strikeRate || '-'} | Runs: ${p.runs || 0} | Wkts: ${p.wickets || 0}`}
                        >
                          <span className="font-extrabold font-sans">{p.name}</span>
                          <span className="opacity-75 font-mono text-[10px]">({p.ratings?.overall || 50})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Custom Rules Ingestion View ── */}
      {activeView === 'custom-rules' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="bg-[#0b1120] border border-amber-500/30 rounded-2xl p-4">
            <h4 className="text-sm sm:text-base font-extrabold text-amber-300 font-sans mb-1">
              Add Custom NEPL Rules
            </h4>
            <p className="text-xs text-slate-400 font-sans mb-3">
              Paste or modify custom tournament rules here. The Gemini AI will immediately incorporate these rules into all future answers & scenarios!
            </p>

            <textarea
              value={customRulesText}
              onChange={e => setCustomRulesText(e.target.value)}
              placeholder="Paste custom rules, special boundary conditions, magic over modifications, or specific handicap rules..."
              rows={9}
              className="w-full bg-[#070b14] border border-amber-500/30 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
            />

            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => setCustomRulesText(NEFL_2026_RAW_RULES_TEXT)}
                className="text-xs text-slate-400 hover:text-amber-300 font-mono transition cursor-pointer"
              >
                Load Official {new Date().getFullYear()} Rules
              </button>
              <button
                onClick={handleSaveCustomRules}
                className="px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-mono font-bold text-xs hover:bg-amber-400 transition cursor-pointer"
              >
                Save & Attach to AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Input Bar (Always accessible when in Chat) ── */}
      {activeView === 'chat' && (
        <div className="p-3 bg-[#0b1120] border-t border-cyan-500/20 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything about NEPL rules, deficiency, or team balancing..."
              className="flex-1 bg-[#070b14] border border-cyan-500/30 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 disabled:opacity-50 hover:scale-105 transition cursor-pointer flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ── API Key Modal ── */}
      {isApiKeyModalOpen && (
        <div className="absolute inset-0 bg-[#070b14]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-cyan-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-300 font-display font-bold text-sm">
                <Key className="w-4 h-4" />
                <span>Google Gemini API Configuration</span>
              </div>
              <button onClick={() => setIsApiKeyModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your Google Gemini API key to enable live AI multimodal reasoning. If left empty, the built-in offline rules & team balancing engine will operate autonomously!
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-3">
              <input
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#070b14] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs hover:bg-cyan-300 transition cursor-pointer"
                >
                  Save API Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
