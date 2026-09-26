import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  role: { 
    type: String, 
    enum: ['suprememaster', 'superuser', 'auctioneer', 'player'], 
    default: 'auctioneer' 
  },
  avatar: { type: String, default: '🔨' },
  photoUrl: { type: String, default: null },
  isDisabled: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
