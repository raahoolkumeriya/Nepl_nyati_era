import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchTournamentSettings, saveTournamentSettings } from '../services/api';
import { getSocket } from '../services/socket';

const DEFAULT_SETTINGS = {
  id: 'tournament_settings',
  tournamentName: 'CriclockeD',
  subtitle: 'Box Cricket League',
  shortCode: 'CRIC',
  edition: '2026',
  logoUrl: '/cricklocked_logo.png',
  defaultBasePrice: 100,
  bidIncrementStep: 100,
  startupPurse: 10000,
};

const TournamentContext = createContext({
  tournamentSettings: DEFAULT_SETTINGS,
  updateTournamentSettings: async () => { },
  isSettingsLoading: false,
});

export function TournamentProvider({ children }) {
  const [tournamentSettings, setTournamentSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('nepl_tournament_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tournamentName === 'Nyati Era') parsed.tournamentName = 'Criclocked';
        if (parsed.logoUrl === '/nyati_era_logo.png') parsed.logoUrl = '/cricklocked_logo.png';
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  // Sync document title
  useEffect(() => {
    if (tournamentSettings?.tournamentName) {
      document.title = `${tournamentSettings.tournamentName} | ${tournamentSettings.subtitle || 'Box Cricket League'}`;
    }
  }, [tournamentSettings]);

  // Load from MongoDB Atlas on mount
  useEffect(() => {
    let isMounted = true;
    fetchTournamentSettings()
      .then((data) => {
        if (isMounted && data && data.tournamentName) {
          if (data.tournamentName === 'Nyati Era') data.tournamentName = 'Criclocked';
          if (data.logoUrl === '/nyati_era_logo.png') data.logoUrl = '/cricklocked_logo.png';
          const merged = { ...DEFAULT_SETTINGS, ...data };
          setTournamentSettings(merged);
          try {
            localStorage.setItem('nepl_tournament_settings', JSON.stringify(merged));
          } catch { }
        }
      })
      .catch((err) => {
        console.warn('[TournamentContext] Could not fetch settings from backend:', err.message);
      })
      .finally(() => {
        if (isMounted) setIsSettingsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for real-time socket updates from Supreme Master
  useEffect(() => {
    const socket = getSocket();
    const handleSettingsSync = (updated) => {
      if (updated && updated.tournamentName) {
        console.log('🏆 [TournamentContext] Live brand update received:', updated.tournamentName);
        setTournamentSettings((prev) => {
          const merged = { ...prev, ...updated };
          try {
            localStorage.setItem('nepl_tournament_settings', JSON.stringify(merged));
          } catch { }
          return merged;
        });
      }
    };

    socket.on('settings:sync', handleSettingsSync);
    return () => {
      socket.off('settings:sync', handleSettingsSync);
    };
  }, []);

  const updateSettings = useCallback(async (newSettings) => {
    const merged = { ...tournamentSettings, ...newSettings };
    setTournamentSettings(merged);
    try {
      localStorage.setItem('nepl_tournament_settings', JSON.stringify(merged));
    } catch { }

    // Emit live over socket immediately
    try {
      const socket = getSocket();
      socket.emit('settings:update', merged);
    } catch (e) {
      console.warn('Socket broadcast error:', e);
    }

    // Persist to MongoDB backend
    try {
      const saved = await saveTournamentSettings(merged);
      return saved;
    } catch (err) {
      console.warn('Backend save settings error:', err);
      return merged;
    }
  }, [tournamentSettings]);

  return (
    <TournamentContext.Provider
      value={{
        tournamentSettings,
        updateTournamentSettings: updateSettings,
        isSettingsLoading,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return ctx;
}
