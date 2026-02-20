import { Schema, model, models } from 'mongoose';

const ScheduledWorkoutSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planId: { type: Schema.Types.ObjectId, ref: 'WorkoutPlan' },
  scheduledDate: { type: Date, index: true },
  dayName: String,
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
  completed: { type: Boolean, default: false },
  completedAt: Date,
});

ScheduledWorkoutSchema.index({ userId: 1, scheduledDate: 1 });

export default models.ScheduledWorkout ?? model('ScheduledWorkout', ScheduledWorkoutSchema);
