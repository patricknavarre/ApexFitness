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
  /** When set, overrides calendar-based day progression. */
  activePlanDayNumber: Number,
  lastInsightDate: String,
  lastInsightText: String,
  createdAt: { type: Date, default: Date.now },
});

export default models.User ?? model('User', UserSchema);
