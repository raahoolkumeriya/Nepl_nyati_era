import React, { useState } from 'react';
import { 
  Trophy, 
  Calendar, 
  Zap, 
  Award, 
  CheckCircle2, 
  PlayCircle, 
  PlusCircle, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { calculateNRR, sortStandings } from '../utils/nrr';

export default function ScheduleStandings({ teams }) {
  // Initial League Standings state
  const [standings, setStandings] = useState(() => {
    return teams.map(t => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      logo: t.logo,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      runsScored: 0,
      oversFaced: 0,
      runsConceded: 0,
      oversBowled: 0,
      nrr: 0
    }));
  });

  // Sample League Matches (Round Robin)
  const [matches, setMatches] = useState([
    { id: 'm1', round: 'Match 1', team1: 'Dhanori Super Kings', team2: 'Nyati Royal Strikers', status: 'Scheduled', score1: '', overs1: '', score2: '', overs2: '', winner: null },
    { id: 'm2', round: 'Match 2', team1: 'Era Champions', team2: 'Dhanori Titans', status: 'Scheduled', score1: '', overs1: '', score2: '', overs2: '', winner: null },
    { id: 'm3', round: 'Match 3', team1: 'Dhanori Super Kings', team2: 'Era Champions', status: 'Scheduled', score1: '', overs1: '', score2: '', overs2: '', winner: null },
    { id: 'm4', round: 'Match 4', team1: 'Nyati Royal Strikers', team2: 'Dhanori Titans', status: 'Scheduled', score1: '', overs1: '', score2: '', overs2: '', winner: null },
    { id: 'm5', round: 'Match 5', team1: 'Dhanori Super Kings', team2: 'Dhanori Titans', status: 'Scheduled', score1: '', overs1: '', score2: '', overs2: '', winner: null },
    { id: 'm6', round: 'Match 6', team1: 'Nyati Royal Strikers', team2: 'Era Champions', status: 'Scheduled', score1: '', overs1: '', score2: '', overs2: '', winner: null }
  ]);

  // Handle Recording Match Score
  const handleSaveScore = (matchId, s1, ov1, s2, ov2) => {
    const runs1 = parseInt(s1, 10);
    const overs1 = parseFloat(ov1);
    const runs2 = parseInt(s2, 10);
    const overs2 = parseFloat(ov2);

    if (isNaN(runs1) || isNaN(overs1) || isNaN(runs2) || isNaN(overs2)) {
      alert("Please enter valid runs and overs for both teams!");
      return;
    }

    const winnerName = runs1 > runs2 ? matches.find(m => m.id === matchId).team1 : matches.find(m => m.id === matchId).team2;

    // Update match record
    const updatedMatches = matches.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          score1: runs1,
          overs1: overs1,
          score2: runs2,
          overs2: overs2,
          status: 'Completed',
          winner: winnerName
        };
      }
      return m;
    });

    setMatches(updatedMatches);

    // Recalculate Standings & NRR for completed matches
    const newStandingsMap = {};
    teams.forEach(t => {
      newStandingsMap[t.name] = {
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        logo: t.logo,
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
        runsScored: 0,
        oversFaced: 0,
        runsConceded: 0,
        oversBowled: 0,
        nrr: 0
      };
    });

    updatedMatches.forEach(m => {
      if (m.status === 'Completed') {
        const t1 = newStandingsMap[m.team1];
        const t2 = newStandingsMap[m.team2];

        if (t1 && t2) {
          t1.played += 1;
          t2.played += 1;

          t1.runsScored += m.score1;
          t1.oversFaced += m.overs1;
          t1.runsConceded += m.score2;
          t1.oversBowled += m.overs2;

          t2.runsScored += m.score2;
          t2.oversFaced += m.overs2;
          t2.runsConceded += m.score1;
          t2.oversBowled += m.overs1;

          if (m.score1 > m.score2) {
            t1.won += 1;
            t1.points += 2;
            t2.lost += 1;
          } else if (m.score2 > m.score1) {
            t2.won += 1;
            t2.points += 2;
            t1.lost += 1;
          }
        }
      }
    });

    // Compute NRR for each team
    Object.keys(newStandingsMap).forEach(key => {
      const item = newStandingsMap[key];
      item.nrr = calculateNRR(item.runsScored, item.oversFaced, item.runsConceded, item.oversBowled);
    });

    const sortedList = sortStandings(Object.values(newStandingsMap));
    setStandings(sortedList);
  };

  const sortedStandings = sortStandings(standings);
  const tableTopper = sortedStandings[0];
  const rank2 = sortedStandings[1];
  const rank3 = sortedStandings[2];

  return (
    <div className="space-y-8">
      
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-warm-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-cricket-emerald" />
            NEPL Standings & Schedule Simulator
          </h2>
          <p className="text-sand-500 text-xs mt-1">
            Real-time NRR calculator and playoff standings according to official round-robin league rules.
          </p>
        </div>
      </div>

      {/* Points Table & NRR Standings */}
      <div className="glass-panel p-6 rounded-3xl border border-warm-700/50 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#c9a227]" />
            League Points Table (Ranked by Points & NRR)
          </h3>
          <span className="text-xs text-sand-500 font-mono">5 Matches / Team</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-sand-300">
            <thead className="bg-warm-900/80 text-sand-500 font-mono uppercase tracking-wider border-b border-warm-700/50">
              <tr>
                <th className="py-3.5 px-4">Pos</th>
                <th className="py-3.5 px-4">Team</th>
                <th className="py-3.5 px-4 text-center">Played</th>
                <th className="py-3.5 px-4 text-center">Won</th>
                <th className="py-3.5 px-4 text-center">Lost</th>
                <th className="py-3.5 px-4 text-center">Points</th>
                <th className="py-3.5 px-4 text-center">NRR</th>
                <th className="py-3.5 px-4 text-right">Qualification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-700/40 font-mono">
              {sortedStandings.map((team, idx) => {
                const isTopper = idx === 0;
                const isSemi = idx === 1 || idx === 2;

                return (
                  <tr
                    key={team.id}
                    className={`hover:bg-warm-900/40 transition ${
                      isTopper ? 'bg-[#c9a227]/10' : isSemi ? 'bg-cricket-emerald/5' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-sand-200">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-sans font-bold text-white flex items-center space-x-2">
                      <span>{team.logo}</span>
                      <span>{team.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">{team.played}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-cricket-emerald">{team.won}</td>
                    <td className="py-3.5 px-4 text-center text-red-400">{team.lost}</td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-[#c9a227] text-sm">{team.points}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-cyan-400">
                      {team.nrr > 0 ? `+${team.nrr}` : team.nrr}
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      {isTopper ? (
                        <span className="px-2.5 py-1 rounded-md bg-[#c9a227]/15 text-[#c9a227] font-extrabold text-[10px] uppercase border border-[#c9a227]/30">
                          Finals Qualified 🏆
                        </span>
                      ) : isSemi ? (
                        <span className="px-2.5 py-1 rounded-md bg-cricket-emerald/15 text-cricket-emerald font-bold text-[10px] uppercase border border-cricket-emerald/30">
                          Semifinalist ⚡
                        </span>
                      ) : (
                        <span className="text-sand-600 text-[10px]">Eliminated</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Playoff Bracket Visualization */}
      <div className="glass-panel p-6 rounded-3xl border border-warm-700/50 space-y-4">
        <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-cricket-emerald" />
          NEPL Playoff Bracket
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          
          {/* Semifinal Match Card */}
          <div className="p-5 rounded-2xl bg-warm-900/80 border border-warm-700/50 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#c9a227] font-bold">
              <span>SEMIFINAL MATCH</span>
              <span>2nd Place vs 3rd Place</span>
            </div>
            <div className="p-3 bg-warm-950 rounded-xl space-y-2 border border-warm-700/50/80">
              <div className="flex items-center justify-between text-sm font-bold text-white">
                <span>{rank2 ? rank2.name : 'Rank 2 Team'}</span>
                <span className="text-xs text-sand-500">Seed #2</span>
              </div>
              <div className="text-center text-[10px] font-mono text-cricket-emerald uppercase">VS</div>
              <div className="flex items-center justify-between text-sm font-bold text-white">
                <span>{rank3 ? rank3.name : 'Rank 3 Team'}</span>
                <span className="text-xs text-sand-500">Seed #3</span>
              </div>
            </div>
          </div>

          {/* Finals Match Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-tr from-amber-500/10 via-yellow-500/5 to-amber-500/20 border border-[#c9a227]/30 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#c9a227] font-bold">
              <span>NEPL GRAND FINALS 🏆</span>
              <span>Sunday 8 PM Finish</span>
            </div>
            <div className="p-3 bg-warm-950/80 rounded-xl space-y-2 border border-amber-500/30">
              <div className="flex items-center justify-between text-sm font-extrabold text-[#c9a227]">
                <span>{tableTopper ? tableTopper.name : 'Table Topper'}</span>
                <span className="px-2 py-0.5 rounded bg-[#c9a227]/15 text-[10px]">Direct Finalist</span>
              </div>
              <div className="text-center text-[10px] font-mono text-cricket-emerald uppercase">VS</div>
              <div className="flex items-center justify-between text-sm font-bold text-white">
                <span>Winner of Semifinal</span>
                <span className="text-xs text-sand-500">Semifinal Winner</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Match Scheduler & Scorekeeper */}
      <div className="glass-panel p-6 rounded-3xl border border-warm-700/50 space-y-6">
        <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-cyan-400" />
          Round Robin League Match Center & Scorekeeper
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onSaveScore={handleSaveScore}
            />
          ))}
        </div>
      </div>

    </div>
  );
}

// Sub-component for individual match score entry
function MatchCard({ match, onSaveScore }) {
  const [s1, setS1] = useState(match.score1 || '');
  const [ov1, setOv1] = useState(match.overs1 || '');
  const [s2, setS2] = useState(match.score2 || '');
  const [ov2, setOv2] = useState(match.overs2 || '');

  return (
    <div className="p-4 rounded-2xl bg-warm-900/80 border border-warm-700/50 space-y-3">
      <div className="flex items-center justify-between text-xs text-sand-500 font-mono">
        <span className="font-bold text-cricket-emerald">{match.round}</span>
        <span>{match.status}</span>
      </div>

      <div className="space-y-2 text-xs">
        {/* Team 1 Score Input */}
        <div className="flex items-center justify-between bg-warm-950 p-2.5 rounded-xl border border-warm-700/50">
          <span className="font-bold text-white">{match.team1}</span>
          <div className="flex items-center space-x-1">
            <input
              type="number"
              placeholder="Runs"
              value={s1}
              onChange={(e) => setS1(e.target.value)}
              className="w-14 bg-warm-900 border border-warm-700/50 rounded px-2 py-1 text-xs text-white font-mono text-center"
            />
            <span className="text-sand-600 font-mono">/</span>
            <input
              type="number"
              step="0.1"
              placeholder="Overs"
              value={ov1}
              onChange={(e) => setOv1(e.target.value)}
              className="w-14 bg-warm-900 border border-warm-700/50 rounded px-2 py-1 text-xs text-white font-mono text-center"
            />
          </div>
        </div>

        {/* Team 2 Score Input */}
        <div className="flex items-center justify-between bg-warm-950 p-2.5 rounded-xl border border-warm-700/50">
          <span className="font-bold text-white">{match.team2}</span>
          <div className="flex items-center space-x-1">
            <input
              type="number"
              placeholder="Runs"
              value={s2}
              onChange={(e) => setS2(e.target.value)}
              className="w-14 bg-warm-900 border border-warm-700/50 rounded px-2 py-1 text-xs text-white font-mono text-center"
            />
            <span className="text-sand-600 font-mono">/</span>
            <input
              type="number"
              step="0.1"
              placeholder="Overs"
              value={ov2}
              onChange={(e) => setOv2(e.target.value)}
              className="w-14 bg-warm-900 border border-warm-700/50 rounded px-2 py-1 text-xs text-white font-mono text-center"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        {match.winner ? (
          <span className="text-[11px] font-bold text-cricket-emerald font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {match.winner} WON
          </span>
        ) : (
          <span className="text-[10px] text-sand-600">8 Overs Innings Limit</span>
        )}

        <button
          onClick={() => onSaveScore(match.id, s1, ov1, s2, ov2)}
          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] uppercase transition"
        >
          Update Score
        </button>
      </div>
    </div>
  );
}
