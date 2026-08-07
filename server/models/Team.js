import mongoose from 'mongoose';

const SquadPlayerSchema = new mongoose.Schema({
  id: String,
  name: String,
  role: String,
  category: String,
  soldPrice: Number,
  avatarUrl: String,
  cricHeroesUrl: String,
}, { _id: false });

const TeamSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  shortName: String,
  owner: String,
  color: String,
  gradient: String,
  borderColor: String,
  bgBadge: String,
  totalPurse: { type: Number, default: 10000 },
  spentPurse: { type: Number, default: 0 },
  playersCount: { type: Number, default: 0 },
  logo: String,
  squad: [SquadPlayerSchema],
}, { timestamps: true });

export default mongoose.model('Team', TeamSchema);
