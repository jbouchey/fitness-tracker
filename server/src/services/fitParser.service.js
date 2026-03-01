const FitParser = require('fit-file-parser').default || require('fit-file-parser');

/**
 * Parse a FIT file buffer into a normalized raw data object.
 * @param {Buffer} buffer
 * @returns {Promise<object>} raw data for metricsCalculator
 */
function parseFitFile(buffer) {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({
      force: true,
      speedUnit: 'm/s',
      lengthUnit: 'm',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'list',
    });

    parser.parse(buffer, (error, data) => {
      if (error) return reject(new Error(`FIT parse error: ${error.message}`));

      const records = data.records || [];
      const session = data.sessions?.[0] || {};

      const trackPoints = records
        .filter((r) => r.position_lat != null && r.position_long != null)
        .map((r, i) => ({
          sequence: i,
          latitude: r.position_lat,   // fit-file-parser converts semicircles → degrees
          longitude: r.position_long,
          elevationM: r.enhanced_altitude ?? r.altitude ?? null,
          timestamp: r.timestamp ? new Date(r.timestamp) : null,
          elapsedSec: r.elapsed_time != null ? Math.round(r.elapsed_time) : null,
          heartRate: r.heart_rate ?? null,
          cadence: r.cadence ?? null,
          speed: r.speed ?? null, // already in m/s
        }));

      const FEET_PER_METER = 3.28084;

      resolve({
        startTime: session.start_time ? new Date(session.start_time) : trackPoints[0]?.timestamp,
        endTime: session.timestamp ? new Date(session.timestamp) : trackPoints.at(-1)?.timestamp,
        distanceMiles: session.total_distance ? session.total_distance / 1609.344 : null,
        elapsedSeconds: session.total_elapsed_time
          ? Math.round(session.total_elapsed_time)
          : trackPoints.length > 1
            ? (trackPoints.at(-1).elapsedSec ?? 0)
            : 0,
        calories: session.total_calories ?? null,
        avgHeartRate: session.avg_heart_rate ?? null,
        maxHeartRate: session.max_heart_rate ?? null,
        // Use watch-computed totals when available — more accurate than recalculating from track points
        elevationGainFt: session.total_ascent != null ? session.total_ascent * FEET_PER_METER : null,
        elevationLossFt: session.total_descent != null ? session.total_descent * FEET_PER_METER : null,
        trackPoints,
      });
    });
  });
}

module.exports = { parseFitFile };
