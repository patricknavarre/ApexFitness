import { Schema, model, models } from 'mongoose';

const ProgressPhotoSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  photoUrl: String,
  s3Key: String,
  thumbnailUrl: String,
  thumbnailS3Key: String,
  weightKg: Number,
  notes: String,
  analysisId: { type: Schema.Types.ObjectId, ref: 'Analysis' },
  takenAt: Date,
  createdAt: { type: Date, default: Date.now },
});

export default models.ProgressPhoto ?? model('ProgressPhoto', ProgressPhotoSchema);
