import { io } from 'socket.io-client';

let socket = null;

export function initSocket() {
  if (socket) return socket;

  // In production (Render/custom domain), connect to current origin.
  // In development, Vite proxies /socket.io to http://localhost:3001
  let socketUrl = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
  if (import.meta.env.VITE_SOCKET_URL) {
    socketUrl = import.meta.env.VITE_SOCKET_URL;
  } else if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.startsWith('http')) {
    try {
      socketUrl = new URL(import.meta.env.VITE_API_URL).origin;
    } catch {
      socketUrl = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
    }
  }

  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('⚡ [Socket.io] Connected to NEPL Live Streaming Auction Engine:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.warn('⚠️ [Socket.io] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.warn('⚠️ [Socket.io] Connection error:', error.message);
  });

  return socket;
}

export function getSocket() {
  if (!socket) {
    return initSocket();
  }
  return socket;
}

// ── Event Emitter Helpers ───────────────────────────────────────────────────

export function liveSelectPlayer(playerId, basePrice) {
  const s = getSocket();
  s.emit('auction:selectPlayer', { playerId, basePrice });
}

export function livePlaceBid(playerId, team, amount, logItem) {
  const s = getSocket();
  s.emit('auction:placeBid', { playerId, team, amount, logItem });
}

export function liveMarkSold(playerId, buyerTeamId, soldPrice, player, team, logItem) {
  const s = getSocket();
  s.emit('auction:markSold', { playerId, buyerTeamId, soldPrice, player, team, logItem });
}

export function liveMarkUnsold(playerId, player, logItem) {
  const s = getSocket();
  s.emit('auction:markUnsold', { playerId, player, logItem });
}

export function liveRevokeBid(playerId, basePrice, logItem) {
  const s = getSocket();
  s.emit('auction:adminRevokeBid', { playerId, basePrice, logItem });
}

export function liveReduceBid(playerId, newPrice, logItem) {
  const s = getSocket();
  s.emit('auction:adminReduceBid', { playerId, newPrice, logItem });
}

export function liveRequestState() {
  const s = getSocket();
  s.emit('auction:getState');
}

export function liveBroadcastReset() {
  const s = getSocket();
  s.emit('auction:dataReset');
}
