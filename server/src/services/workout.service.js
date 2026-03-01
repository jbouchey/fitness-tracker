const prisma = require('../config/database');
const { Prisma } = require('@prisma/client');

const WORKOUT_SELECT = {
  id: true,
  userId: true,
  title: true,
  workoutType: true,
  fileFormat: true,
  startTime: true,
  endTime: true,
  elapsedSeconds: true,
  distanceMiles: true,
  avgPaceSecPerMile: true,
  bestPaceSecPerMile: true,
  elevationGainFt: true,
  elevationLossFt: true,
  avgElevationFt: true,
  maxElevationFt: true,
  minElevationFt: true,
  avgHeartRate: true,
  maxHeartRate: true,
  minHeartRate: true,
  calories: true,
  notes: true,
  createdAt: true,
};

async function getWorkouts(userId, { page = 1, limit = 20, type, search, startDate, endDate, sortBy = 'startTime', sortDir = 'desc' }) {
  const where = { userId };

  if (type) where.workoutType = type;
  if (search) where.title = { contains: search, mode: 'insensitive' };
  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) where.startTime.gte = new Date(startDate);
    if (endDate) where.startTime.lte = new Date(endDate);
  }

  const allowedSortFields = ['startTime', 'distanceMiles', 'elapsedSeconds', 'elevationGainFt', 'avgHeartRate'];
  const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'startTime';
  const orderByDir = sortDir === 'asc' ? 'asc' : 'desc';

  const skip = (page - 1) * limit;

  const [workouts, total, aggregate] = await Promise.all([
    prisma.workout.findMany({
      where,
      select: WORKOUT_SELECT,
      orderBy: { [orderByField]: orderByDir },
      skip,
      take: limit,
    }),
    prisma.workout.count({ where }),
    prisma.workout.aggregate({
      where,
      _sum: { distanceMiles: true, elevationGainFt: true },
      _count: { id: true },
    }),
  ]);

  return {
    workouts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats: {
      totalWorkouts: aggregate._count.id,
      totalMiles: aggregate._sum.distanceMiles ?? 0,
      totalElevationGain: aggregate._sum.elevationGainFt ?? 0,
    },
  };
}

async function getWorkoutById(id, userId) {
  const workout = await prisma.workout.findUnique({
    where: { id },
    select: {
      ...WORKOUT_SELECT,
      originalFileName: true,
      splits: {
        orderBy: { splitNumber: 'asc' },
      },
    },
  });

  if (!workout) {
    const err = new Error('Workout not found.');
    err.status = 404;
    throw err;
  }
  if (workout.userId !== userId) {
    const err = new Error('Access denied.');
    err.status = 403;
    throw err;
  }

  const trackPoints = await prisma.trackPoint.findMany({
    where: { workoutId: id },
    orderBy: { sequence: 'asc' },
    select: {
      sequence: true,
      latitude: true,
      longitude: true,
      elevationM: true,
      elapsedSec: true,
      heartRate: true,
    },
  });

  return { workout, trackPoints };
}

async function updateWorkout(id, userId, data) {
  const workout = await prisma.workout.findUnique({ where: { id }, select: { userId: true } });
  if (!workout) {
    const err = new Error('Workout not found.');
    err.status = 404;
    throw err;
  }
  if (workout.userId !== userId) {
    const err = new Error('Access denied.');
    err.status = 403;
    throw err;
  }

  const allowed = {};
  if (data.title !== undefined) allowed.title = data.title;
  if (data.workoutType !== undefined) allowed.workoutType = data.workoutType;
  if (data.notes !== undefined) allowed.notes = data.notes;

  return prisma.workout.update({
    where: { id },
    data: allowed,
    select: WORKOUT_SELECT,
  });
}

async function deleteWorkout(id, userId) {
  const workout = await prisma.workout.findUnique({ where: { id }, select: { userId: true } });
  if (!workout) {
    const err = new Error('Workout not found.');
    err.status = 404;
    throw err;
  }
  if (workout.userId !== userId) {
    const err = new Error('Access denied.');
    err.status = 403;
    throw err;
  }

  await prisma.workout.delete({ where: { id } });
}

async function getPersonalRecords(userId) {
  const [fastestSplit, longestRun, mostElevation] = await Promise.all([
    prisma.split.findFirst({
      where: {
        workout: { userId },
        distanceMiles: { gte: 0.9 },
      },
      orderBy: { paceSecPerMile: 'asc' },
      select: {
        paceSecPerMile: true,
        workout: { select: { id: true, title: true, startTime: true } },
      },
    }),
    prisma.workout.findFirst({
      where: { userId },
      orderBy: { distanceMiles: 'desc' },
      select: { id: true, title: true, startTime: true, distanceMiles: true },
    }),
    prisma.workout.findFirst({
      where: { userId },
      orderBy: { elevationGainFt: 'desc' },
      select: { id: true, title: true, startTime: true, elevationGainFt: true },
    }),
  ]);

  return { fastestSplit, longestRun, mostElevation };
}

async function getActivityTrends(userId, period, utcOffset = 0) {
  // Embed utcOffset as a raw literal to avoid PostgreSQL parameter type ambiguity
  // with interval arithmetic. Value is validated as int(-720..840) by the controller.
  const offsetLiteral = Prisma.raw(String(parseInt(utcOffset) || 0));

  if (period === 'week') {
    // Rolling last 7 days, grouped by local day
    const rows = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('day', "startTime" - ${offsetLiteral} * INTERVAL '1 minute')::DATE AS day,
        CAST(SUM("distanceMiles") AS FLOAT) AS miles,
        CAST(SUM("elevationGainFt") AS FLOAT) AS elevation,
        COUNT(*)::INT AS runs
      FROM "workouts"
      WHERE "userId" = ${userId}
        AND "startTime" >= NOW() - INTERVAL '6 days'
      GROUP BY 1
      ORDER BY 1
    `;
    return rows;
  } else {
    // Current calendar month, grouped by week-of-month (1–5 depending on month length)
    const rows = await prisma.$queryRaw`
      SELECT
        CEIL(EXTRACT(DAY FROM "startTime" - ${offsetLiteral} * INTERVAL '1 minute') / 7.0)::INT AS week_num,
        CAST(SUM("distanceMiles") AS FLOAT) AS miles,
        CAST(SUM("elevationGainFt") AS FLOAT) AS elevation,
        COUNT(*)::INT AS runs
      FROM "workouts"
      WHERE "userId" = ${userId}
        AND "startTime" - ${offsetLiteral} * INTERVAL '1 minute' >= DATE_TRUNC('month', NOW() - ${offsetLiteral} * INTERVAL '1 minute')
        AND "startTime" - ${offsetLiteral} * INTERVAL '1 minute' < DATE_TRUNC('month', NOW() - ${offsetLiteral} * INTERVAL '1 minute') + INTERVAL '1 month'
      GROUP BY 1
      ORDER BY 1
    `;
    return rows;
  }
}

module.exports = { getWorkouts, getWorkoutById, updateWorkout, deleteWorkout, getPersonalRecords, getActivityTrends };
