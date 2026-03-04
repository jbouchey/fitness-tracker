const { parseFitFile } = require('./fitParser.service');
const { parseGpxFile } = require('./gpxParser.service');
const { parseTcxFile } = require('./tcxParser.service');
const { calculateMetrics } = require('../utils/metricsCalculator');

// Cap stored track points to keep DB rows manageable without losing route fidelity.
const MAX_TRACK_POINTS = 5000;

function downsamplePoints(points) {
  if (points.length <= MAX_TRACK_POINTS) return points;
  const step = Math.ceil(points.length / MAX_TRACK_POINTS);
  const sampled = points.filter((_, i) => i % step === 0);
  // Always keep the last point so the route end is preserved
  const last = points[points.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled.map((tp, i) => ({ ...tp, sequence: i }));
}

/**
 * Detect file format using magic bytes (most reliable) with filename as fallback.
 */
function detectFormat(originalName, buffer) {
  // FIT files: bytes 8-11 are ".FIT" in ASCII
  if (buffer.length >= 12) {
    const magic = buffer.slice(8, 12).toString('ascii');
    if (magic === '.FIT') return 'FIT';
  }

  // XML-based formats: inspect content before falling back to extension
  const head = buffer.slice(0, 1000).toString('utf8').toLowerCase();
  if (head.includes('<gpx')) return 'GPX';
  if (head.includes('trainingcenterdatabase')) return 'TCX';

  // Extension fallback
  const ext = originalName.split('.').pop().toLowerCase();
  if (ext === 'fit') return 'FIT';
  if (ext === 'gpx') return 'GPX';
  if (ext === 'tcx') return 'TCX';

  throw new Error('Unsupported file format. Only .fit, .gpx, and .tcx files are accepted.');
}

/**
 * Parse an uploaded file buffer and return computed metrics + track points.
 * @param {Buffer} buffer - raw file bytes
 * @param {string} originalName - original filename for format detection
 * @returns {{ format, metrics, trackPoints, startTime, endTime }}
 */
async function parseFile(buffer, originalName) {
  const format = detectFormat(originalName, buffer);

  let raw;
  if (format === 'FIT') {
    raw = await parseFitFile(buffer);
  } else if (format === 'GPX') {
    raw = parseGpxFile(buffer);
  } else {
    raw = parseTcxFile(buffer);
  }

  const { splits, trackPoints, ...metrics } = calculateMetrics(raw);

  return {
    format,
    metrics,
    splits,
    trackPoints: downsamplePoints(raw.trackPoints),
    startTime: raw.startTime,
    endTime: raw.endTime,
  };
}

module.exports = { parseFile, downsamplePoints };
