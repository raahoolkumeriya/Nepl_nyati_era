import mongoose from 'mongoose';

const BidHistorySchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['SOLD', 'UNSOLD', 'BID'], default: 'BID' },
  playerId: String,
  playerName: String,
  teamId: String,
  teamName: String,
  teamColor: String,
  amount: Number,
  timestamp: String,
}, { timestamps: true });

export default mongoose.model('BidHistory', BidHistorySchema);
