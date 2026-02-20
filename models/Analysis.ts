import { Schema, model, models } from 'mongoose';

const AnalysisSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  photoUrl: String,
  s3Key: String,
  bodyType: String,
  bodyFatRange: String,
  strengths: [String],
  focusAreas: [String],
  postureNotes: String,
  fitnessLevelEstimate: String,
  summary: String,
  recommendedSplit: String,
  calorieTarget: Number,
  proteinTarget: Number,
  carbTarget: Number,
  fatTarget: Number,
  rawJson: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

export default models.Analysis ?? model('Analysis', AnalysisSchema);
