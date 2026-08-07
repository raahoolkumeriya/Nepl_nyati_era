import mongoose from 'mongoose';

const RuleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  number: String,
  title: { type: String, required: true },
  desc: { type: String, required: true },
  icon: { type: String, default: 'BookOpen' },
}, { timestamps: true });

export default mongoose.model('Rule', RuleSchema);
