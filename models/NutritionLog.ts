import { Schema, model, models } from 'mongoose';

const NutritionLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  logDate: { type: Date, index: true },
  meal: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snacks'] },
  foodName: String,
  calories: Number,
  proteinG: Number,
  carbsG: Number,
  fatG: Number,
  createdAt: { type: Date, default: Date.now },
});

NutritionLogSchema.index({ userId: 1, logDate: -1 });

export default models.NutritionLog ?? model('NutritionLog', NutritionLogSchema);
