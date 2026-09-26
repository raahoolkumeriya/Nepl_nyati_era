import { Server } from 'socket.io';
import AuctionState from './models/AuctionState.js';
import Player from './models/Player.js';
import Team from './models/Team.js';
import BidHistory from './models/BidHistory.js';

let ioInstance = null;

// In-memory fallback / cache for high-speed live auction streaming
let liveState = {
  activePlayerId: null,
  currentBid: 500,
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
      { upsert: true, new: true }
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
      const { playerId, basePrice = 500 } = data || {};
      if (!playerId) return;

      liveState = {
        activePlayerId: playerId,
        currentBid: Number(basePrice) || 500,
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

    // 7. Super Admin: Revoke Bid
    socket.on('auction:adminRevokeBid', async (data) => {
      const { playerId, basePrice, logItem } = data || {};
      liveState.currentBid = Number(basePrice) || 500;
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
      liveState = {
        activePlayerId: null,
        currentBid: 500,
        highBidder: null,
        status: 'idle',
      };
      await persistLiveState();
      console.log('🔄 [Socket] Auction data reset broadcasted');
      io.emit('auction:dataReset');
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
