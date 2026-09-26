import mongoose from 'mongoose';

const AuctionStateSchema = new mongoose.Schema({
  id: { type: String, default: 'active_session', unique: true },
  activePlayerId: { type: String, default: null },
  currentBid: { type: Number, default: 0 },
  highBidder: {
    id: { type: String, default: null },
    name: { type: String, default: null },
    color: { type: String, default: null },
    logo: { type: String, default: null },
  },
  status: { type: String, enum: ['idle', 'bidding', 'sold', 'unsold', 'paused'], default: 'idle' },
}, { timestamps: true });

export default mongoose.model('AuctionState', AuctionStateSchema);
