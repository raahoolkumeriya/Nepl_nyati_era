import { Server } from 'socket.io';
import AuctionState from './models/AuctionState.js';
import Player from './models/Player.js';
import Team from './models/Team.js';
import BidHistory from './models/BidHistory.js';
import Settings from './models/Settings.js';

let ioInstance = null;

// In-memory fallback / cache for high-speed live auction streaming
let liveState = {
  activePlayerId: null,
  currentBid: 0,   // 0 = neutral; real value set when first player is selected
  highBidder: null,
  status: 'idle', // 'idle' | 'bidding' | 'sold' | 'unsold'
};

async function initLiveStateFromDb() {
  try {
    const doc = await AuctionState.findOne({ id: 'active_session' });
    if (doc) {
      liveState = {
        activePlayerId: doc.activePlayerId,
        currentBid: doc.currentBid,
        highBidder: doc.highBidder && doc.highBidder.id ? doc.highBidder : null,
        status: doc.status || 'idle',
      };
      console.log('📡 [Socket] Live auction session state restored from MongoDB:', liveState);
    }
  } catch (err) {
    console.warn('⚠️ [Socket] Failed to restore auction state from MongoDB:', err.message);
  }
}

async function persistLiveState() {
  try {
    await AuctionState.findOneAndUpdate(
      { id: 'active_session' },
      {
        id: 'active_session',
        activePlayerId: liveState.activePlayerId,
        currentBid: liveState.currentBid,
        highBidder: liveState.highBidder || { id: null, name: null, color: null, logo: null },
        status: liveState.status,
      },
      { upsert: true, returnDocument: 'after' }
    );
  } catch (err) {
    console.warn('⚠️ [Socket] Error persisting live auction state:', err.message);
  }
}

export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  ioInstance = io;

  // Restore state on server start
  initLiveStateFromDb();

  io.on('connection', (socket) => {
    const viewerCount = io.engine.clientsCount;
    console.log(`🔌 [Socket] Client connected: ${socket.id} (Total viewers: ${viewerCount})`);

    // 1. Send current live auction state & viewer count to the newly connected device
    socket.emit('auction:stateSync', {
      ...liveState,
      viewerCount,
    });

    // Broadcast updated viewer count to all connected clients
    io.emit('auction:viewerCount', { count: viewerCount });

    // 2. Client requests fresh state explicitly
    socket.on('auction:getState', () => {
      socket.emit('auction:stateSync', {
        ...liveState,
        viewerCount: io.engine.clientsCount,
      });
    });

    // 3. Auctioneer / Super Admin selects active player for the block
    socket.on('auction:selectPlayer', async (data) => {
      const { playerId } = data || {};
      if (!playerId) return;

      let effectiveBase = Number(data?.basePrice);
      if (!effectiveBase || isNaN(effectiveBase) || effectiveBase <= 0) {
        try {
          const s = await Settings.findOne({ id: 'tournament_settings' }).lean();
          effectiveBase = Number(s?.defaultBasePrice) || 100;
        } catch {
          effectiveBase = 100;
        }
      }

      liveState = {
        activePlayerId: playerId,
        currentBid: effectiveBase,
        highBidder: null,
        status: 'bidding',
      };

      await persistLiveState();

      console.log(`📢 [Socket] Player selected for bidding: ${playerId} at base ₹${liveState.currentBid}`);
      io.emit('auction:playerSelected', {
        activePlayerId: playerId,
        currentBid: liveState.currentBid,
        highBidder: null,
        status: 'bidding',
      });
    });

    // 4. Any authorized device places a live bid
    socket.on('auction:placeBid', async (data) => {
      const { playerId, team, amount, logItem } = data || {};
      if (!playerId || !team || !amount) return;

      // Update in-memory state
      liveState.activePlayerId = playerId;
      liveState.currentBid = Number(amount);
      liveState.highBidder = {
        id: team.id,
        name: team.name,
        color: team.color,
        logo: team.logo,
      };
      liveState.status = 'bidding';

      await persistLiveState();

      // Save to BidHistory collection if logItem provided
      if (logItem) {
        try {
          await BidHistory.create({
            id: logItem.id || Date.now().toString(),
            type: 'BID',
            playerId,
            playerName: logItem.playerName || '',
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color,
            amount: Number(amount),
            timestamp: logItem.timestamp || new Date().toLocaleTimeString(),
          });
        } catch (e) {
          console.warn('⚠️ [Socket] Failed saving bid history:', e.message);
        }
      }

      console.log(`🔥 [Socket] Live Bid placed: ₹${amount} PTS by ${team.name} on player ${playerId}`);

      // Broadcast bid to ALL connected devices in real time
      io.emit('auction:bidPlaced', {
        playerId,
        currentBid: liveState.currentBid,
        highBidder: liveState.highBidder,
        logItem,
      });
    });

    // 5. Auctioneer / Super Admin marks player as SOLD
    socket.on('auction:markSold', async (data) => {
      const { playerId, buyerTeamId, soldPrice, player, team, logItem } = data || {};
      if (!playerId) return;

      liveState.status = 'sold';
      liveState.currentBid = Number(soldPrice) || liveState.currentBid;
      await persistLiveState();

      // Persist to MongoDB
      try {
        if (player) {
          await Player.findOneAndUpdate(
            { id: playerId },
            { $set: { status: 'sold', soldPrice: Number(soldPrice), soldTo: buyerTeamId } }
          );
        }
        if (team && buyerTeamId) {
          await Team.findOneAndUpdate(
            { id: buyerTeamId },
            { $set: team }
          );
        }
        if (logItem) {
          await BidHistory.create({
            id: logItem.id || Date.now().toString(),
            type: 'SOLD',
            playerId,
            playerName: logItem.playerName || player?.name || '',
            teamId: buyerTeamId,
            teamName: team?.name || logItem.teamName || '',
            teamColor: team?.color || '',
            amount: Number(soldPrice),
            timestamp: logItem.timestamp || new Date().toLocaleTimeString(),
          });
        }
      } catch (err) {
        console.warn('⚠️ [Socket] Error updating DB on markSold:', err.message);
      }

      console.log(`🔨 [Socket] Gavel Hit! SOLD: Player ${playerId} to ${buyerTeamId} for ₹${soldPrice}`);

      // Broadcast to ALL devices
      io.emit('auction:playerSold', {
        playerId,
        buyerTeamId,
        soldPrice: Number(soldPrice),
        player,
        team,
        logItem,
      });
    });

    // 6. Auctioneer / Super Admin marks player as UNSOLD
    socket.on('auction:markUnsold', async (data) => {
      const { playerId, player, logItem } = data || {};
      if (!playerId) return;

      liveState.status = 'unsold';
      liveState.highBidder = null;
      if (player?.basePrice) {
        liveState.currentBid = Number(player.basePrice);
      }
      await persistLiveState();

      try {
        await Player.findOneAndUpdate(
          { id: playerId },
          { $set: { status: 'unsold', soldPrice: 0, soldTo: null } }
        );
        if (logItem) {
          await BidHistory.create({
            id: logItem.id || Date.now().toString(),
            type: 'UNSOLD',
            playerId,
            playerName: logItem.playerName || player?.name || '',
            timestamp: logItem.timestamp || new Date().toLocaleTimeString(),
          });
        }
      } catch (err) {
        console.warn('⚠️ [Socket] Error updating DB on markUnsold:', err.message);
      }

      console.log(`❌ [Socket] Player marked UNSOLD: ${playerId}`);

      io.emit('auction:playerUnsold', {
        playerId,
        player,
        logItem,
      });
    });

    // 7. Super Admin: Revoke Bid — reset currentBid to player's base price (falls back to settings defaultBasePrice)
    socket.on('auction:adminRevokeBid', async (data) => {
      const { playerId, basePrice, logItem } = data || {};
      // Use the player's actual base price; if missing, fall back to settings
      let fallbackBase = Number(basePrice);
      if (!fallbackBase || isNaN(fallbackBase) || fallbackBase <= 0) {
        try {
          const s = await Settings.findOne({ id: 'tournament_settings' }).lean();
          fallbackBase = Number(s?.defaultBasePrice) || 100;
        } catch {
          fallbackBase = 100;
        }
      }
      liveState.currentBid = fallbackBase;
      liveState.highBidder = null;
      await persistLiveState();

      if (logItem) {
        try {
          await BidHistory.create({
            id: logItem.id || Date.now().toString(),
            type: 'ADMIN_REVOKE',
            playerId,
            playerName: logItem.playerName,
            teamName: logItem.teamName,
            amount: basePrice,
            timestamp: logItem.timestamp || new Date().toLocaleTimeString(),
          });
        } catch {}
      }

      console.log(`⚡ [Socket] Admin Revoked Bid on ${playerId}`);
      io.emit('auction:bidRevoked', {
        playerId,
        currentBid: liveState.currentBid,
        highBidder: null,
        logItem,
      });
    });

    // 8. Super Admin: Reduce Bid
    socket.on('auction:adminReduceBid', async (data) => {
      const { playerId, newPrice, logItem } = data || {};
      liveState.currentBid = Number(newPrice);
      await persistLiveState();

      if (logItem) {
        try {
          await BidHistory.create({
            id: logItem.id || Date.now().toString(),
            type: 'ADMIN_REDUCE',
            playerId,
            playerName: logItem.playerName,
            teamName: logItem.teamName,
            amount: newPrice,
            timestamp: logItem.timestamp || new Date().toLocaleTimeString(),
          });
        } catch {}
      }

      console.log(`⚡ [Socket] Admin Reduced Bid on ${playerId} to ₹${newPrice}`);
      io.emit('auction:bidReduced', {
        playerId,
        currentBid: liveState.currentBid,
        highBidder: liveState.highBidder,
        logItem,
      });
    });

    // 9. Full Data Reset
    socket.on('auction:dataReset', async () => {
      let resetBase = 0;
      try {
        const s = await Settings.findOne({ id: 'tournament_settings' }).lean();
        resetBase = Number(s?.defaultBasePrice) || 0;
      } catch {
        resetBase = 0;
      }
      liveState = {
        activePlayerId: null,
        currentBid: resetBase,
        highBidder: null,
        status: 'idle',
      };
      await persistLiveState();
      console.log('🔄 [Socket] Auction data reset broadcasted');
      io.emit('auction:dataReset');
    });

    // 10. Tournament Brand Settings Update
    socket.on('settings:update', async (newSettings) => {
      try {
        if (newSettings && newSettings.tournamentName) {
          const updated = await Settings.findOneAndUpdate(
            { id: 'tournament_settings' },
            {
              $set: {
                tournamentName: String(newSettings.tournamentName).trim(),
                subtitle: newSettings.subtitle ? String(newSettings.subtitle).trim() : 'Box Cricket League',
                shortCode: newSettings.shortCode ? String(newSettings.shortCode).trim() : 'NEPL',
                edition: newSettings.edition ? String(newSettings.edition).trim() : '2026',
                logoUrl: newSettings.logoUrl ? String(newSettings.logoUrl).trim() : '/nyati_era_logo.png',
                defaultBasePrice: newSettings.defaultBasePrice !== undefined ? Math.max(1, Number(newSettings.defaultBasePrice) || 100) : 100,
                bidIncrementStep: newSettings.bidIncrementStep !== undefined ? Math.max(1, Number(newSettings.bidIncrementStep) || 100) : 100,
                startupPurse: newSettings.startupPurse !== undefined ? Math.max(100, Number(newSettings.startupPurse) || 10000) : 10000,
                updatedAt: new Date(),
              }
            },
            { upsert: true, returnDocument: 'after' }
          );
          console.log('🏆 [Socket] Tournament brand & bidding rules updated:', updated.tournamentName, 'Base Price:', updated.defaultBasePrice, 'Startup Purse:', updated.startupPurse);
          io.emit('settings:sync', updated);

          // If active player has no bids yet, synchronize current bid to updated defaultBasePrice
          if (liveState.activePlayerId && !liveState.highBidder && liveState.status === 'bidding') {
            liveState.currentBid = updated.defaultBasePrice;
            await persistLiveState();
            io.emit('auction:playerSelected', {
              activePlayerId: liveState.activePlayerId,
              currentBid: liveState.currentBid,
              highBidder: null,
              status: 'bidding',
            });
            console.log(`📢 [Socket] Synced active player base bid to updated base ₹${liveState.currentBid}`);
          }
        }
      } catch (err) {
        console.warn('⚠️ [Socket] Error updating tournament settings:', err.message);
      }
    });

    socket.on('disconnect', () => {
      const viewerCount = io.engine.clientsCount;
      console.log(`🔌 [Socket] Client disconnected: ${socket.id} (Remaining: ${viewerCount})`);
      io.emit('auction:viewerCount', { count: viewerCount });
    });
  });

  return io;
}

export function getIo() {
  return ioInstance;
}

export const getIoInstance = getIo;
