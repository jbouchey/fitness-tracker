const { parseFitFile } = require('./fitParser.service');
const { parseGpxFile } = require('./gpxParser.service');
const { calculateMetrics } = require('../utils/metricsCalculator');

/**
 * Detect file format using magic bytes (most reliable) with filename as fallback.
 */
function detectFormat(originalName, buffer) {
  // FIT files: bytes 8-11 are ".FIT" in ASCII
  if (buffer.length >= 12) {
    const magic = buffer.slice(8, 12).toString('ascii');
    if (magic === '.FIT') return 'FIT';
  }

  // GPX files: XML with <gpx root tag
  const head = buffer.slice(0, 1000).toString('utf8').toLowerCase();
  if (head.includes('<gpx')) return 'GPX';

  // Extension fallback
  const ext = originalName.split('.').pop().toLowerCase();
  if (ext === 'fit') return 'FIT';
  if (ext === 'gpx') return 'GPX';

  throw new Error('Unsupported file format. Only .fit and .gpx files are accepted.');
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
  } else {
    raw = parseGpxFile(buffer);
  }

  const { splits, trackPoints, ...metrics } = calculateMetrics(raw);

  return {
    format,
    metrics,
    splits,
    trackPoints: raw.trackPoints,
    startTime: raw.startTime,
    endTime: raw.endTime,
  };
}

module.exports = { parseFile };
