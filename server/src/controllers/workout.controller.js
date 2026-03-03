const { z } = require('zod');
const workoutService = require('../services/workout.service');
const { catchAsync } = require('../middleware/errorHandler');

const trendsSchema = z.object({
  period: z.enum(['week', 'month']).default('week'),
  utcOffset: z.coerce.number().int().min(-720).max(840).default(0),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  workoutType: z.enum(['TRAIL_RUN', 'ROAD_RUN', 'HIKE', 'CYCLING', 'STRENGTH', 'OTHER']).optional(),
  notes: z.string().max(2000).optional(),
});

const VALID_TYPES = ['TRAIL_RUN', 'ROAD_RUN', 'HIKE', 'CYCLING', 'STRENGTH', 'OTHER'];

const getWorkouts = catchAsync(async (req, res) => {
  const { page, limit, type, types: typesParam, search, startDate, endDate, sortBy, sortDir } = req.query;
  const types = typesParam ? typesParam.split(',').filter((t) => VALID_TYPES.includes(t)) : null;
  const result = await workoutService.getWorkouts(req.user.id, {
    page: parseInt(page) || 1,
    limit: Math.min(parseInt(limit) || 20, 100),
    type,
    types,
    search,
    startDate,
    endDate,
    sortBy,
    sortDir,
  });
  res.json(result);
});

const getWorkout = catchAsync(async (req, res) => {
  const result = await workoutService.getWorkoutById(req.params.id, req.user.id);
  res.json(result);
});

const updateWorkout = catchAsync(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const workout = await workoutService.updateWorkout(req.params.id, req.user.id, data);
  res.json({ workout });
});

const deleteWorkout = catchAsync(async (req, res) => {
  await workoutService.deleteWorkout(req.params.id, req.user.id);
  res.json({ message: 'Workout deleted.' });
});

const getPersonalRecords = catchAsync(async (req, res) => {
  const records = await workoutService.getPersonalRecords(req.user.id);
  res.json({ records });
});

const getActivityTrends = catchAsync(async (req, res) => {
  const { period, utcOffset } = trendsSchema.parse(req.query);
  const types = req.query.types ? req.query.types.split(',').filter((t) => VALID_TYPES.includes(t)) : null;
  const trends = await workoutService.getActivityTrends(req.user.id, period, utcOffset, types);
  res.json({ trends });
});

module.exports = { getWorkouts, getWorkout, updateWorkout, deleteWorkout, getPersonalRecords, getActivityTrends };
