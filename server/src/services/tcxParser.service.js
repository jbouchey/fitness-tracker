const { XMLParser } = require('fast-xml-parser');

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '_',
  // Ensure these elements are always arrays even when there is only one child
  isArray: (name) => ['Activity', 'Lap', 'Trackpoint'].includes(name),
});

/**
 * Parse a TCX file buffer into a normalized raw data object.
 * @param {Buffer} buffer
 * @returns {object} raw data for metricsCalculator
 */
function parseTcxFile(buffer) {
  let root;
  try {
    root = xmlParser.parse(buffer.toString('utf8'));
  } catch (e) {
    throw new Error(`Invalid or malformed TCX file: ${e.message}`);
  }

  const db = root?.TrainingCenterDatabase;
  if (!db) {
    throw new Error('Not a valid TCX file: missing TrainingCenterDatabase root element.');
  }

  const activity = db?.Activities?.Activity?.[0];
  if (!activity) {
    throw new Error('No activity data found in TCX file.');
  }

  const laps = activity.Lap ?? [];
  if (!laps.length) {
    throw new Error('No laps found in TCX activity.');
  }

  // Aggregate session-level metrics across all laps
  let totalTimeSeconds = 0;
  let totalDistanceM = 0;
  let totalCalories = 0;
  let avgHRSum = 0;
  let avgHRCount = 0;
  let maxHR = null;

  const rawTrackpoints = [];

  for (const lap of laps) {
    totalTimeSeconds += parseFloat(lap.TotalTimeSeconds) || 0;
    totalDistanceM += parseFloat(lap.DistanceMeters) || 0;
    totalCalories += parseInt(lap.Calories) || 0;

    const lapAvgHR = lap.AverageHeartRateBpm?.Value;
    if (lapAvgHR != null) {
      avgHRSum += parseInt(lapAvgHR);
      avgHRCount++;
    }
    const lapMaxHR = lap.MaximumHeartRateBpm?.Value;
    if (lapMaxHR != null) {
      const v = parseInt(lapMaxHR);
      if (maxHR === null || v > maxHR) maxHR = v;
    }

    const points = lap.Track?.Trackpoint ?? [];
    for (const tp of points) {
      rawTrackpoints.push(tp);
    }
  }

  // Establish t0 from the first trackpoint that has a timestamp
  const firstTime = rawTrackpoints.find((tp) => tp.Time)?.Time;
  const t0 = firstTime ? new Date(firstTime).getTime() : null;

  // Build normalized track points, keeping only those with valid GPS coordinates
  // (latitude/longitude are required non-nullable columns in the DB schema).
  // TCX strength/indoor workouts may have heartRate and cadence data but no GPS.
  const trackPoints = rawTrackpoints
    .map((tp) => {
      const lat = parseFloat(tp.Position?.LatitudeDegrees);
      const lon = parseFloat(tp.Position?.LongitudeDegrees);
      const timestamp = tp.Time ? new Date(tp.Time) : null;
      return {
        latitude: isFinite(lat) ? lat : null,
        longitude: isFinite(lon) ? lon : null,
        elevationM: tp.AltitudeMeters != null ? parseFloat(tp.AltitudeMeters) : null,
        timestamp,
        elapsedSec: timestamp && t0 !== null ? Math.round((timestamp.getTime() - t0) / 1000) : null,
        heartRate: tp.HeartRateBpm?.Value != null ? parseInt(tp.HeartRateBpm.Value) : null,
        cadence: tp.Cadence != null ? parseInt(tp.Cadence) : null,
        speed: null,
      };
    })
    .filter((tp) => tp.latitude !== null && tp.longitude !== null)
    .map((tp, i) => ({ ...tp, sequence: i }));

  const startTime = trackPoints[0]?.timestamp ?? (firstTime ? new Date(firstTime) : null);
  const endTime = trackPoints.at(-1)?.timestamp ?? null;
  const elapsedSeconds =
    totalTimeSeconds > 0
      ? Math.round(totalTimeSeconds)
      : startTime && endTime
        ? Math.round((endTime.getTime() - startTime.getTime()) / 1000)
        : 0;

  return {
    startTime,
    endTime,
    elapsedSeconds,
    distanceMiles: totalDistanceM > 0 ? totalDistanceM / 1609.344 : null,
    calories: totalCalories > 0 ? totalCalories : null,
    avgHeartRate: avgHRCount > 0 ? Math.round(avgHRSum / avgHRCount) : null,
    maxHeartRate: maxHR,
    trackPoints,
  };
}

module.exports = { parseTcxFile };
