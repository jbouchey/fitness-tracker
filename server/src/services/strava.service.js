const prisma = require('../config/database');
const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } = require('../config/env');
const { downsamplePoints } = require('./fileParser.service');

const STRAVA_API = 'https://www.strava.com/api/v3';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

// Miles per meter conversion
const METERS_TO_MILES = 1 / 1609.344;
const METERS_TO_FEET = 3.28084;

const SPORT_TYPE_MAP = {
  Run: 'TRAIL_RUN',
  VirtualRun: 'TRAIL_RUN',
  TrailRun: 'TRAIL_RUN',
  Ride: 'CYCLING',
  VirtualRide: 'CYCLING',
  EBikeRide: 'CYCLING',
  Hike: 'HIKE',
  Walk: 'HIKE',
  WeightTraining: 'STRENGTH',
  Workout: 'STRENGTH',
};

function mapSportType(stravaType) {
  return SPORT_TYPE_MAP[stravaType] || 'OTHER';
}

function getOAuthUrl(callbackUrl, state) {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: callbackUrl,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}

async function exchangeCode(code) {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strava token exchange failed: ${body}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at * 1000),
    athlete: data.athlete,
  };
}

async function refreshToken(userId, currentRefreshToken) {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: currentRefreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strava token refresh failed: ${body}`);
  }
  const data = await res.json();
  const expiresAt = new Date(data.expires_at * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      stravaAccessToken: data.access_token,
      stravaRefreshToken: data.refresh_token,
      stravaTokenExpiry: expiresAt,
    },
  });
  return data.access_token;
}

async function getValidToken(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stravaAccessToken: true, stravaRefreshToken: true, stravaTokenExpiry: true },
  });
  if (!user?.stravaAccessToken) throw new Error('User has no Strava token');

  // Refresh if expiring within 5 minutes
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (!user.stravaTokenExpiry || user.stravaTokenExpiry <= fiveMinFromNow) {
    return refreshToken(userId, user.stravaRefreshToken);
  }
  return user.stravaAccessToken;
}

async function fetchActivity(accessToken, activityId) {
  const res = await fetch(`${STRAVA_API}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strava fetch activity failed: ${body}`);
  }
  return res.json();
}

async function fetchStreams(accessToken, activityId) {
  const keys = 'latlng,altitude,time,heartrate';
  const res = await fetch(`${STRAVA_API}/activities/${activityId}/streams?keys=${keys}&key_by_type=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    // Streams may not exist for all activities — return null instead of throwing
    return null;
  }
  return res.json();
}

function convertActivity(stravaData, streams) {
  const startTime = new Date(stravaData.start_date);
  const endTime = new Date(startTime.getTime() + stravaData.elapsed_time * 1000);
  const workoutType = mapSportType(stravaData.sport_type || stravaData.type);

  // Elevation from altitude stream
  const altData = streams?.altitude?.data || [];
  let elevationLossFt = 0;
  let minElevationFt = null;
  let maxElevationFt = null;
  let sumElevationFt = 0;

  if (altData.length > 0) {
    for (let i = 1; i < altData.length; i++) {
      const delta = altData[i] - altData[i - 1];
      if (delta < 0) elevationLossFt += Math.abs(delta) * METERS_TO_FEET;
    }
    const altFeet = altData.map((m) => m * METERS_TO_FEET);
    minElevationFt = Math.min(...altFeet);
    maxElevationFt = Math.max(...altFeet);
    sumElevationFt = altFeet.reduce((s, v) => s + v, 0);
  }

  const avgElevationFt = altData.length > 0 ? sumElevationFt / altData.length : 0;

  const distanceMiles = (stravaData.distance || 0) * METERS_TO_MILES;
  const avgPaceSecPerMile =
    stravaData.average_speed > 0 ? 1609.344 / stravaData.average_speed : 0;
  const bestPaceSecPerMile =
    stravaData.max_speed > 0 ? 1609.344 / stravaData.max_speed : null;

  const metrics = {
    elapsedSeconds: stravaData.elapsed_time || 0,
    distanceMiles,
    avgPaceSecPerMile,
    bestPaceSecPerMile,
    elevationGainFt: (stravaData.total_elevation_gain || 0) * METERS_TO_FEET,
    elevationLossFt,
    avgElevationFt,
    maxElevationFt,
    minElevationFt,
    avgHeartRate: stravaData.average_heartrate ? Math.round(stravaData.average_heartrate) : null,
    maxHeartRate: stravaData.max_heartrate ? Math.round(stravaData.max_heartrate) : null,
    minHeartRate: null,
    calories: stravaData.calories || null,
  };

  // Build splits from splits_standard (imperial)
  const splits = (stravaData.splits_standard || []).map((s, i) => ({
    splitNumber: i + 1,
    distanceMiles: (s.distance || 0) * METERS_TO_MILES,
    elapsedSeconds: s.elapsed_time || 0,
    paceSecPerMile: s.average_speed > 0 ? 1609.344 / s.average_speed : 0,
    avgHeartRate: s.average_heartrate ? Math.round(s.average_heartrate) : null,
    elevationGainFt: s.elevation_difference > 0 ? s.elevation_difference * METERS_TO_FEET : 0,
    elevationLossFt: s.elevation_difference < 0 ? Math.abs(s.elevation_difference) * METERS_TO_FEET : 0,
    startLat: null,
    startLng: null,
  }));

  // Build track points from streams
  const latlngData = streams?.latlng?.data || [];
  const timeData = streams?.time?.data || [];
  const hrData = streams?.heartrate?.data || [];

  const rawTrackPoints = latlngData.map((ll, i) => ({
    sequence: i,
    latitude: ll[0],
    longitude: ll[1],
    elevationM: altData[i] ?? null,
    timestamp: timeData[i] != null ? new Date(startTime.getTime() + timeData[i] * 1000) : null,
    elapsedSec: timeData[i] ?? null,
    heartRate: hrData[i] != null ? Math.round(hrData[i]) : null,
    cadence: null,
    speed: null,
  }));

  const trackPoints = downsamplePoints(rawTrackPoints);

  return {
    title: stravaData.name || `Strava Activity ${stravaData.id}`,
    workoutType,
    startTime,
    endTime,
    metrics,
    splits,
    trackPoints,
  };
}

async function importStravaActivity(userId, stravaActivityId) {
  const activityIdStr = String(stravaActivityId);

  // Dedup check
  const existing = await prisma.workout.findUnique({
    where: { stravaActivityId: activityIdStr },
    select: { id: true },
  });
  if (existing) return existing;

  const accessToken = await getValidToken(userId);
  const [stravaData, streams] = await Promise.all([
    fetchActivity(accessToken, activityIdStr),
    fetchStreams(accessToken, activityIdStr),
  ]);

  const { title, workoutType, startTime, endTime, metrics, splits, trackPoints } =
    convertActivity(stravaData, streams);

  const workout = await prisma.$transaction(async (tx) => {
    const w = await tx.workout.create({
      data: {
        userId,
        title,
        workoutType,
        fileFormat: 'STRAVA',
        originalFileName: `strava-${activityIdStr}`,
        stravaActivityId: activityIdStr,
        startTime,
        endTime,
        elapsedSeconds: metrics.elapsedSeconds,
        distanceMiles: metrics.distanceMiles,
        avgPaceSecPerMile: metrics.avgPaceSecPerMile,
        bestPaceSecPerMile: metrics.bestPaceSecPerMile ?? null,
        elevationGainFt: metrics.elevationGainFt,
        elevationLossFt: metrics.elevationLossFt,
        avgElevationFt: metrics.avgElevationFt,
        maxElevationFt: metrics.maxElevationFt ?? null,
        minElevationFt: metrics.minElevationFt ?? null,
        avgHeartRate: metrics.avgHeartRate ?? null,
        maxHeartRate: metrics.maxHeartRate ?? null,
        minHeartRate: metrics.minHeartRate ?? null,
        calories: metrics.calories ?? null,
      },
    });

    if (splits.length > 0) {
      await tx.split.createMany({
        data: splits.map((s) => ({ ...s, workoutId: w.id })),
      });
    }

    const BATCH = 1000;
    for (let i = 0; i < trackPoints.length; i += BATCH) {
      await tx.trackPoint.createMany({
        data: trackPoints.slice(i, i + BATCH).map((tp) => ({ ...tp, workoutId: w.id })),
      });
    }

    return w;
  });

  return workout;
}

module.exports = {
  getOAuthUrl,
  exchangeCode,
  getValidToken,
  fetchActivity,
  fetchStreams,
  convertActivity,
  importStravaActivity,
};
