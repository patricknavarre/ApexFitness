import { Schema, model, models } from 'mongoose';

const WorkoutLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scheduledWorkoutId: { type: Schema.Types.ObjectId, ref: 'ScheduledWorkout' },
  planId: { type: String, index: true },
  dayNumber: Number,
  loggedAt: { type: Date, default: Date.now },
  durationMinutes: Number,
  caloriesBurned: Number,
  cardioExercise: String,
  cardioDurationMinutes: Number,
  distanceMiles: Number,
  route: [
    {
      lat: Number,
      lng: Number,
      t: Number,
    },
  ],
  isRestDay: { type: Boolean, default: false },
  /** Virtual / trainer ride summary (Phase 1 indoor cycling). */
  rideSource: String,
  deviceName: String,
  avgPowerWatts: Number,
  maxPowerWatts: Number,
  normalizedPowerWatts: Number,
  intensityFactor: Number,
  trainingStressScore: Number,
  workKj: Number,
  avgCadenceRpm: Number,
  maxCadenceRpm: Number,
  distanceMeters: Number,
  energyKcal: Number,
  avgHeartRateBpm: Number,
  maxHeartRateBpm: Number,
  hrDeviceName: String,
  ftpUsed: Number,
  maxHrUsed: Number,
  rideXp: Number,
  rideUsedErg: { type: Boolean, default: false },
  courseId: String,
  courseCompleted: { type: Boolean, default: false },
  elevationGainMeters: Number,
  workoutId: String,
  workoutCompleted: { type: Boolean, default: false },
  laps: [
    {
      index: Number,
      elapsedSec: Number,
      durationSec: Number,
      distanceMeters: Number,
      avgPowerWatts: Number,
      avgHeartRateBpm: Number,
    },
  ],
  exerciseName: String,
  sets: [
    {
      setIndex: Number,
      weight: Number,
      reps: Number,
    },
  ],
  notes: String,
  exercisesCompleted: [
    {
      name: String,
      sets: [{ reps: Number, weightKg: Number }],
    },
  ],
});

export default models.WorkoutLog ?? model('WorkoutLog', WorkoutLogSchema);
