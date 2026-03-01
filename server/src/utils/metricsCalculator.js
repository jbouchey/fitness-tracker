const { haversineDistanceM } = require('./geoUtils');

const FEET_PER_METER = 3.28084;
const METERS_PER_MILE = 1609.344;
const MIN_ELEVATION_DELTA_M = 0.5; // noise filter (barometric altimeter data is already smoothed)

/**
 * Given raw data from a parser, compute all derived metrics and splits.
 * @param {object} raw - { trackPoints, distanceMiles?, elapsedSeconds, startTime, endTime,
 *                         calories?, avgHeartRate?, maxHeartRate? }
 * @returns Enriched metrics object ready for DB insertion.
 */
function calculateMetrics(raw) {
  const { trackPoints = [], ...session } = raw;

  // ---- Distance ----
  let computedDistanceM = 0;
  for (let i = 1; i < trackPoints.length; i++) {
    const p = trackPoints[i - 1];
    const c = trackPoints[i];
    if (p.latitude != null && c.latitude != null) {
      computedDistanceM += haversineDistanceM(p.latitude, p.longitude, c.latitude, c.longitude);
    }
  }
  // Prefer session-level distance (FIT provides GPS-smoothed total)
  const distanceMiles =
    session.distanceMiles != null
      ? session.distanceMiles
      : computedDistanceM / METERS_PER_MILE;

  // ---- Elevation ----
  let gainM = 0;
  let lossM = 0;
  let sumElevM = 0;
  let validElevCount = 0;
  let minElevM = Infinity;
  let maxElevM = -Infinity;
  let prevElevM = null;

  for (const tp of trackPoints) {
    if (tp.elevationM == null) continue;
    validElevCount++;
    sumElevM += tp.elevationM;
    if (tp.elevationM < minElevM) minElevM = tp.elevationM;
    if (tp.elevationM > maxElevM) maxElevM = tp.elevationM;
    if (prevElevM !== null) {
      const delta = tp.elevationM - prevElevM;
      if (delta > MIN_ELEVATION_DELTA_M) gainM += delta;
      else if (delta < -MIN_ELEVATION_DELTA_M) lossM += Math.abs(delta);
    }
    prevElevM = tp.elevationM;
  }

  const avgElevationFt = validElevCount > 0 ? (sumElevM / validElevCount) * FEET_PER_METER : 0;

  // ---- Heart Rate ----
  const hrValues = trackPoints.filter((tp) => tp.heartRate != null).map((tp) => tp.heartRate);
  const avgHeartRate =
    session.avgHeartRate != null
      ? session.avgHeartRate
      : hrValues.length > 0
        ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length)
        : null;
  const maxHeartRate =
    session.maxHeartRate != null
      ? session.maxHeartRate
      : hrValues.length > 0
        ? Math.max(...hrValues)
        : null;
  const minHeartRate = hrValues.length > 0 ? Math.min(...hrValues) : null;

  // ---- Pace ----
  const { elapsedSeconds } = session;
  const avgPaceSecPerMile = distanceMiles > 0 ? elapsedSeconds / distanceMiles : 0;

  // ---- Splits ----
  const splits = computeSplits(trackPoints);
  const bestPaceSecPerMile =
    splits.length > 0 ? Math.min(...splits.map((s) => s.paceSecPerMile)) : null;

  return {
    distanceMiles,
    elapsedSeconds,
    avgPaceSecPerMile,
    bestPaceSecPerMile,
    // Prefer watch-computed totals (FIT session record) over recalculated values
    elevationGainFt: session.elevationGainFt ?? gainM * FEET_PER_METER,
    elevationLossFt: session.elevationLossFt ?? lossM * FEET_PER_METER,
    avgElevationFt,
    maxElevationFt: maxElevM !== -Infinity ? maxElevM * FEET_PER_METER : null,
    minElevationFt: minElevM !== Infinity ? minElevM * FEET_PER_METER : null,
    avgHeartRate,
    maxHeartRate,
    minHeartRate,
    calories: session.calories ?? null,
    splits,
  };
}

function computeSplits(trackPoints) {
  if (trackPoints.length < 2) return [];

  const splits = [];
  let splitNumber = 1;
  let accumulated = 0;
  let splitStartTime = trackPoints[0]?.elapsedSec ?? 0;
  let splitHRSum = 0;
  let splitHRCount = 0;
  let splitGainM = 0;
  let splitLossM = 0;
  let prevElevM = trackPoints[0]?.elevationM ?? null;
  let splitStartLat = trackPoints[0]?.latitude ?? null;
  let splitStartLng = trackPoints[0]?.longitude ?? null;

  for (let i = 1; i < trackPoints.length; i++) {
    const prev = trackPoints[i - 1];
    const curr = trackPoints[i];

    const segDistM =
      prev.latitude != null && curr.latitude != null
        ? haversineDistanceM(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
        : 0;
    accumulated += segDistM;

    if (curr.heartRate != null) {
      splitHRSum += curr.heartRate;
      splitHRCount++;
    }

    if (curr.elevationM != null && prevElevM !== null) {
      const delta = curr.elevationM - prevElevM;
      if (delta > MIN_ELEVATION_DELTA_M) splitGainM += delta;
      else if (delta < -MIN_ELEVATION_DELTA_M) splitLossM += Math.abs(delta);
    }
    if (curr.elevationM != null) prevElevM = curr.elevationM;

    const isLast = i === trackPoints.length - 1;
    if (accumulated >= METERS_PER_MILE || isLast) {
      const splitDistMiles = accumulated / METERS_PER_MILE;
      const splitEndTime = curr.elapsedSec ?? 0;
      const splitElapsed = splitEndTime - splitStartTime;
      const paceSecPerMile = splitDistMiles > 0 ? splitElapsed / splitDistMiles : 0;

      splits.push({
        splitNumber,
        distanceMiles: splitDistMiles,
        elapsedSeconds: splitElapsed,
        paceSecPerMile,
        avgHeartRate: splitHRCount > 0 ? Math.round(splitHRSum / splitHRCount) : null,
        elevationGainFt: splitGainM * FEET_PER_METER,
        elevationLossFt: splitLossM * FEET_PER_METER,
        startLat: splitStartLat,
        startLng: splitStartLng,
      });

      splitNumber++;
      splitStartTime = splitEndTime;
      splitHRSum = 0;
      splitHRCount = 0;
      splitGainM = 0;
      splitLossM = 0;
      accumulated = 0;
      splitStartLat = curr.latitude ?? null;
      splitStartLng = curr.longitude ?? null;
    }
  }

  return splits;
}

module.exports = { calculateMetrics };
