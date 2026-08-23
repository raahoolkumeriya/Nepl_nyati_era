import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  matchNumber: { type: Number, default: 1 },
  round: { type: String, default: 'Match 1' },
  stage: { type: String, default: 'league', enum: ['league', 'semifinal', 'final', 'custom'] },
  team1Id: { type: String, default: '' },
  team1Name: { type: String, required: true },
  team1Logo: { type: String, default: '🏏' },
  team1Color: { type: String, default: '#d4622a' },
  team2Id: { type: String, default: '' },
  team2Name: { type: String, required: true },
  team2Logo: { type: String, default: '🏏' },
  team2Color: { type: String, default: '#3b82f6' },
  date: { type: String, default: '' }, // YYYY-MM-DD
  time: { type: String, default: '' }, // e.g. "09:00 AM"
  slot: { type: String, default: 'Morning Slot' }, // e.g. "Saturday Morning", "Rain Cover", etc.
  venue: { type: String, default: 'NEPL Ground' },
  maxOvers: { type: Number, default: 8 },
  status: { type: String, default: 'Scheduled', enum: ['Scheduled', 'Live', 'Completed', 'Rain / Abandoned'] },
  score1: { type: Number, default: 0 },
  overs1: { type: Number, default: 0 },
  wickets1: { type: Number, default: 0 },
  score2: { type: Number, default: 0 },
  overs2: { type: Number, default: 0 },
  wickets2: { type: Number, default: 0 },
  winnerId: { type: String, default: null },
  winner: { type: String, default: null },
  winMargin: { type: String, default: '' },
  tossWinner: { type: String, default: '' },
  tossDecision: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Match', MatchSchema);
