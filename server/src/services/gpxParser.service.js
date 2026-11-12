const { XMLParser } = require('fast-xml-parser');

// GPX is plain XML, so it is read with the same parser as TCX. This replaced the
// `gpxparser` package, which pulled in an old browser emulator (jsdom) and the
// unmaintained `request` library just to walk a few elements.
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '_',
  // Drop namespace prefixes so <gpxtpx:hr> and <ns3:hr> both read as "hr"
  removeNSPrefix: true,
  // Ensure these elements are always arrays even when there is only one child
  isArray: (name) => ['trk', 'trkseg', 'trkpt'].includes(name),
});

function toNumber(value) {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/** Find the first value stored under any of `names`, searching nested extension blocks. */
function findInExtensions(node, names, depth = 0) {
  if (node == null || typeof node !== 'object' || depth > 4) return null;
  for (const name of names) {
    if (node[name] != null && typeof node[name] !== 'object') return node[name];
  }
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (child && typeof child === 'object') {
      const found = findInExtensions(child, names, depth + 1);
      if (found != null) return found;
    }
  }
  return null;
}

/**
 * Parse a GPX file buffer into a normalized raw data object.
 * @param {Buffer} buffer
 * @returns {object} raw data for metricsCalculator
 */
function parseGpxFile(buffer) {
  let root;
  try {
    root = xmlParser.parse(buffer.toString('utf8'));
  } catch (e) {
    throw new Error(`Invalid or malformed GPX file: ${e.message}`);
  }

  const gpx = root?.gpx;
  if (!gpx) {
    throw new Error('Invalid or malformed GPX file: missing gpx root element.');
  }

  // Use the first track, joining its segments (a paused recording is split into segments)
  const track = gpx.trk?.[0];
  const points = (track?.trkseg ?? []).flatMap((seg) => seg?.trkpt ?? []);

  const trackPoints = points
    .map((p) => {
      const time = p.time ? new Date(p.time) : null;
      const hr = toNumber(findInExtensions(p.extensions, ['hr', 'heartrate']));
      const cad = toNumber(findInExtensions(p.extensions, ['cad', 'cadence']));
      return {
        latitude: toNumber(p._lat),
        longitude: toNumber(p._lon),
        elevationM: toNumber(p.ele),
        timestamp: time && !isNaN(time.getTime()) ? time : null,
        elapsedSec: null, // filled in below
        heartRate: hr != null ? Math.round(hr) : null,
        cadence: cad != null ? Math.round(cad) : null,
        speed: null,
      };
    })
    // latitude/longitude are required columns, so points without a position are dropped
    .filter((tp) => tp.latitude !== null && tp.longitude !== null)
    .map((tp, i) => ({ sequence: i, ...tp }));

  if (!trackPoints.length) {
    throw new Error('No track data found in this GPX file. The file may be empty or contain only waypoints, not a recorded route.');
  }

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
