import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AuctionRoom from './components/AuctionRoom';
import TeamsView from './components/TeamsView';
import PlayersPool from './components/PlayersPool';
import RulesHub from './components/RulesHub';
import ScheduleStandings from './components/ScheduleStandings';
import ProjectorView from './components/ProjectorView';
import { DEFAULT_TEAMS, DEFAULT_PLAYERS } from './data/initialData';
import { soundFx } from './utils/audio';

export default function App() {
  const [activeTab, setActiveTab] = useState('auction');
  const [isProjectorMode, setIsProjectorMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sync soundFx instance with soundEnabled state
  useEffect(() => {
    soundFx.enabled = soundEnabled;
  }, [soundEnabled]);

  // Teams state with localStorage persistence
  const [teams, setTeams] = useState(() => {
    try {
      const saved = localStorage.getItem('nepl_teams');
      return saved ? JSON.parse(saved) : DEFAULT_TEAMS;
    } catch (err) {
      console.error('Failed to load teams from localStorage:', err);
      return DEFAULT_TEAMS;
    }
  });

  // Players state with localStorage persistence
  const [players, setPlayers] = useState(() => {
    try {
      const saved = localStorage.getItem('nepl_players');
      return saved ? JSON.parse(saved) : DEFAULT_PLAYERS;
    } catch (err) {
      console.error('Failed to load players from localStorage:', err);
      return DEFAULT_PLAYERS;
    }
  });

  // Bidding history feed state
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('nepl_history');
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      return [];
    }
  });

  // Save changes to localStorage automatically
  useEffect(() => {
    try {
      localStorage.setItem('nepl_teams', JSON.stringify(teams));
    } catch (e) {}
  }, [teams]);

  useEffect(() => {
    try {
      localStorage.setItem('nepl_players', JSON.stringify(players));
    } catch (e) {}
  }, [players]);

  useEffect(() => {
    try {
      localStorage.setItem('nepl_history', JSON.stringify(history));
    } catch (e) {}
  }, [history]);

  // Reset Data to Initial State
  const handleResetData = () => {
    if (window.confirm("Are you sure you want to reset all auction data, bids, and teams to default state?")) {
      setTeams(DEFAULT_TEAMS);
      setPlayers(DEFAULT_PLAYERS);
      setHistory([]);
      localStorage.removeItem('nepl_teams');
      localStorage.removeItem('nepl_players');
      localStorage.removeItem('nepl_history');
    }
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 font-sans pb-16">
      
      {/* Fullscreen TV / Projector View Overlay */}
      {isProjectorMode ? (
        <ProjectorView
          players={players}
          setPlayers={setPlayers}
          teams={teams}
          setTeams={setTeams}
          onClose={() => setIsProjectorMode(false)}
        />
      ) : (
        <>
          {/* Main Top Header Navigation */}
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isProjectorMode={isProjectorMode}
            setIsProjectorMode={setIsProjectorMode}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            onResetData={handleResetData}
          />

          {/* Main Page Container */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            {activeTab === 'auction' && (
              <AuctionRoom
                players={players}
                setPlayers={setPlayers}
                teams={teams}
                setTeams={setTeams}
                history={history}
                setHistory={setHistory}
              />
            )}

            {activeTab === 'teams' && (
              <TeamsView
                teams={teams}
                players={players}
              />
            )}

            {activeTab === 'players' && (
              <PlayersPool
                players={players}
                setPlayers={setPlayers}
                teams={teams}
              />
            )}

            {activeTab === 'rules' && (
              <RulesHub />
            )}

            {activeTab === 'schedule' && (
              <ScheduleStandings
                teams={teams}
              />
            )}
          </main>
        </>
      )}

    </div>
  );
}
