import { Schema, model, models } from 'mongoose';

const WorkoutPlanSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: String,
  split: String,
  isActive: { type: Boolean, default: true },
  days: [
    {
      day: String,
      focus: String,
      exercises: [
        {
          name: String,
          sets: Number,
          reps: String,
          rest: String,
          muscleGroup: String,
        },
      ],
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

export default models.WorkoutPlan ?? model('WorkoutPlan', WorkoutPlanSchema);
