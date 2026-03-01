const { z } = require('zod');
const prisma = require('../config/database');
const { parseFile } = require('../services/fileParser.service');
const { catchAsync } = require('../middleware/errorHandler');

const uploadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  workoutType: z.enum(['TRAIL_RUN', 'ROAD_RUN', 'HIKE', 'CYCLING', 'STRENGTH', 'OTHER']).optional(),
});

const uploadWorkout = catchAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { title, workoutType } = uploadSchema.parse(req.body);

  let parsed;
  try {
    parsed = await parseFile(req.file.buffer, req.file.originalname);
  } catch (err) {
    return res.status(422).json({ error: `Could not parse file: ${err.message}` });
  }

  const { format, metrics, splits, trackPoints, startTime, endTime } = parsed;

  const defaultTitle =
    title ||
    (startTime
      ? `${formatWorkoutType(workoutType || 'TRAIL_RUN')} – ${formatDate(startTime)}`
      : req.file.originalname);

  const workout = await prisma.$transaction(async (tx) => {
    const w = await tx.workout.create({
      data: {
        userId: req.user.id,
        title: defaultTitle,
        workoutType: workoutType || 'TRAIL_RUN',
        fileFormat: format,
        originalFileName: req.file.originalname,
        startTime: startTime || new Date(),
        endTime: endTime || new Date(),
        elapsedSeconds: metrics.elapsedSeconds || 0,
        distanceMiles: metrics.distanceMiles || 0,
        avgPaceSecPerMile: metrics.avgPaceSecPerMile || 0,
        bestPaceSecPerMile: metrics.bestPaceSecPerMile ?? null,
        elevationGainFt: metrics.elevationGainFt || 0,
        elevationLossFt: metrics.elevationLossFt || 0,
        avgElevationFt: metrics.avgElevationFt || 0,
        maxElevationFt: metrics.maxElevationFt ?? null,
        minElevationFt: metrics.minElevationFt ?? null,
        avgHeartRate: metrics.avgHeartRate ?? null,
        maxHeartRate: metrics.maxHeartRate ?? null,
        minHeartRate: metrics.minHeartRate ?? null,
        calories: metrics.calories ?? null,
      },
    });

    // Insert splits
    if (splits.length > 0) {
      await tx.split.createMany({
        data: splits.map((s) => ({ ...s, workoutId: w.id })),
      });
    }

    // Insert track points in batches of 1000 to avoid hitting query limits
    const BATCH = 1000;
    for (let i = 0; i < trackPoints.length; i += BATCH) {
      await tx.trackPoint.createMany({
        data: trackPoints.slice(i, i + BATCH).map((tp) => ({ ...tp, workoutId: w.id })),
      });
    }

    return w;
  });

  // Return full workout with splits
  const fullWorkout = await prisma.workout.findUnique({
    where: { id: workout.id },
    include: { splits: { orderBy: { splitNumber: 'asc' } } },
  });

  res.status(201).json({ workout: fullWorkout, message: 'Workout uploaded successfully.' });
});

function formatWorkoutType(type) {
  return type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

module.exports = { uploadWorkout };
