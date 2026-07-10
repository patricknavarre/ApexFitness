import { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  passwordHash: String,
  googleId: String,
  age: Number,
  sex: String,
  heightCm: Number,
  weightKg: Number,
  goal: String,
  fitnessLevel: String,
  equipment: String,
  daysPerWeek: Number,
  calorieTarget: Number,
  proteinTarget: Number,
  carbTarget: Number,
  fatTarget: Number,
  units: { type: String, default: 'imperial' },
  activePlanId: String,
  planStartedAt: Date,
  /** When set with activePlanDaySetOn === today, overrides calendar-based day. */
  activePlanDayNumber: Number,
  /** Local YYYY-MM-DD when activePlanDayNumber was last set (same-day override only). */
  activePlanDaySetOn: String,
  lastInsightDate: String,
  lastInsightText: String,
  lastInsightContextHash: String,
  lastInsightGeneratedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

export default models.User ?? model('User', UserSchema);
