import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: String,
  category: String,
  basePrice: Number,
  matches: Number,
  runs: Number,
  avg: Number,
  strikeRate: Number,
  wickets: Number,
  economy: Number,
  bestBowling: String,
  cricHeroesUrl: String,
  avatarUrl: String,
  status: { type: String, enum: ['available', 'sold', 'unsold'], default: 'available' },
  soldPrice: { type: Number, default: 0 },
  soldTo: { type: String, default: null },
}, { timestamps: true });

export default mongoose.model('Player', PlayerSchema);
