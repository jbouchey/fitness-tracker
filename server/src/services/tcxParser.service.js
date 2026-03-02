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

  if (!rawTrackpoints.length) {
    throw new Error('No track points found in TCX file. The file may contain only summary data without a recorded route.');
  }

  // Build normalized track point array
  let t0 = null;
  const trackPoints = rawTrackpoints.map((tp, i) => {
    const lat = parseFloat(tp.Position?.LatitudeDegrees);
    const lon = parseFloat(tp.Position?.LongitudeDegrees);
    const timestamp = tp.Time ? new Date(tp.Time) : null;

    if (t0 === null && timestamp) t0 = timestamp.getTime();

    return {
      sequence: i,
      latitude: isFinite(lat) ? lat : null,
      longitude: isFinite(lon) ? lon : null,
      elevationM: tp.AltitudeMeters != null ? parseFloat(tp.AltitudeMeters) : null,
      timestamp,
      elapsedSec: timestamp && t0 !== null ? Math.round((timestamp.getTime() - t0) / 1000) : null,
      heartRate: tp.HeartRateBpm?.Value != null ? parseInt(tp.HeartRateBpm.Value) : null,
      cadence: tp.Cadence != null ? parseInt(tp.Cadence) : null,
      speed: null,
    };
  });

  const startTime = trackPoints[0]?.timestamp ?? null;
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
