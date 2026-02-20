import { Schema, model, models } from 'mongoose';

const WorkoutLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scheduledWorkoutId: { type: Schema.Types.ObjectId, ref: 'ScheduledWorkout' },
  loggedAt: { type: Date, default: Date.now },
  durationMinutes: Number,
  notes: String,
  exercisesCompleted: [
    {
      name: String,
      sets: [{ reps: Number, weightKg: Number }],
    },
  ],
});

export default models.WorkoutLog ?? model('WorkoutLog', WorkoutLogSchema);
