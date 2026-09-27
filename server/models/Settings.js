import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  id: { type: String, required: true, default: 'tournament_settings', unique: true },
  tournamentName: { type: String, default: 'Nyati Era' },
  subtitle: { type: String, default: 'Box Cricket League' },
  shortCode: { type: String, default: 'NEPL' },
  edition: { type: String, default: '2026' },
  logoUrl: { type: String, default: '/nyati_era_logo.png' },
  defaultBasePrice: { type: Number, default: 100 },
  bidIncrementStep: { type: Number, default: 100 },
  startupPurse: { type: Number, default: 10000 },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
