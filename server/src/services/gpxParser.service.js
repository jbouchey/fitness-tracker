const GPXParser = require('gpxparser');

/**
 * Parse a GPX file buffer into a normalized raw data object.
 * @param {Buffer} buffer
 * @returns {object} raw data for metricsCalculator
 */
function parseGpxFile(buffer) {
  let gpx;
  try {
    gpx = new GPXParser();
    gpx.parse(buffer.toString('utf8'));
  } catch (e) {
    throw new Error(`Invalid or malformed GPX file: ${e.message}`);
  }

  const track = gpx.tracks?.[0];
  if (!track || !track.points?.length) {
    throw new Error('No track data found in this GPX file. The file may be empty or contain only waypoints, not a recorded route.');
  }

  const points = track.points;

  const trackPoints = points.map((p, i) => ({
    sequence: i,
    latitude: p.lat,
    longitude: p.lon,
    elevationM: p.ele ?? null,
    timestamp: p.time ? new Date(p.time) : null,
    elapsedSec: null, // filled in below
    heartRate:
      p.extensions?.heartrate ??
      p.extensions?.hr ??
      p.extensions?.['gpxtpx:hr'] ??
      null,
    cadence:
      p.extensions?.cadence ??
      p.extensions?.cad ??
      p.extensions?.['gpxtpx:cad'] ??
      null,
    speed: null,
  }));

  // Compute elapsed seconds from timestamps
  const t0 = trackPoints[0]?.timestamp?.getTime();
  if (t0 != null) {
    for (const tp of trackPoints) {
      if (tp.timestamp) {
        tp.elapsedSec = Math.round((tp.timestamp.getTime() - t0) / 1000);
      }
    }
  }

  const startTime = trackPoints[0]?.timestamp ?? null;
  const endTime = trackPoints.at(-1)?.timestamp ?? null;
  const elapsedSeconds =
    startTime && endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : 0;

  return {
    startTime,
    endTime,
    elapsedSeconds,
    distanceMiles: null, // calculated by metricsCalculator
    calories: null,
    avgHeartRate: null,
    maxHeartRate: null,
    trackPoints,
  };
}

module.exports = { parseGpxFile };
