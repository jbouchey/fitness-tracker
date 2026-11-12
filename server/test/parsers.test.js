process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const express = require('express');

const { parseGpxFile } = require('../src/services/gpxParser.service');
const { parseTcxFile } = require('../src/services/tcxParser.service');
const { parseFile } = require('../src/services/fileParser.service');
const upload = require('../src/middleware/upload');

// A Garmin-style GPX: two segments (a pause), namespaced heart rate and cadence,
// and one point with no position that must be dropped.
const GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Garmin Connect"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:ns3="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata><time>2026-03-01T15:00:00.000Z</time></metadata>
  <wpt lat="36.10" lon="-115.40"><name>Trailhead</name></wpt>
  <trk>
    <name>Morning Trail Run</name>
    <trkseg>
      <trkpt lat="36.1000" lon="-115.4000">
        <ele>1200.5</ele>
        <time>2026-03-01T15:00:00.000Z</time>
        <extensions><ns3:TrackPointExtension><ns3:hr>120</ns3:hr><ns3:cad>80</ns3:cad></ns3:TrackPointExtension></extensions>
      </trkpt>
      <trkpt lat="36.1010" lon="-115.4010">
        <ele>1210</ele>
        <time>2026-03-01T15:01:00.000Z</time>
        <extensions><ns3:TrackPointExtension><ns3:hr>135</ns3:hr></ns3:TrackPointExtension></extensions>
      </trkpt>
    </trkseg>
    <trkseg>
      <trkpt><time>2026-03-01T15:01:30.000Z</time></trkpt>
      <trkpt lat="36.1020" lon="-115.4020">
        <ele>1225.25</ele>
        <time>2026-03-01T15:02:00.000Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

const TCX = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Running">
      <Id>2026-03-01T15:00:00.000Z</Id>
      <Lap StartTime="2026-03-01T15:00:00.000Z">
        <TotalTimeSeconds>120.0</TotalTimeSeconds>
        <DistanceMeters>400.0</DistanceMeters>
        <Calories>30</Calories>
        <AverageHeartRateBpm><Value>130</Value></AverageHeartRateBpm>
        <MaximumHeartRateBpm><Value>150</Value></MaximumHeartRateBpm>
        <Track>
          <Trackpoint>
            <Time>2026-03-01T15:00:00.000Z</Time>
            <Position><LatitudeDegrees>36.1000</LatitudeDegrees><LongitudeDegrees>-115.4000</LongitudeDegrees></Position>
            <AltitudeMeters>1200.5</AltitudeMeters>
            <HeartRateBpm><Value>120</Value></HeartRateBpm>
            <Cadence>80</Cadence>
          </Trackpoint>
          <Trackpoint>
            <Time>2026-03-01T15:02:00.000Z</Time>
            <Position><LatitudeDegrees>36.1020</LatitudeDegrees><LongitudeDegrees>-115.4020</LongitudeDegrees></Position>
            <AltitudeMeters>1225.25</AltitudeMeters>
            <HeartRateBpm><Value>150</Value></HeartRateBpm>
          </Trackpoint>
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

test('GPX: reads points across segments with elevation, time, heart rate and cadence', () => {
  const raw = parseGpxFile(Buffer.from(GPX));

  assert.strictEqual(raw.trackPoints.length, 3, 'the point with no position is dropped');
  assert.deepStrictEqual(raw.trackPoints.map((p) => p.sequence), [0, 1, 2]);

  const [a, b, c] = raw.trackPoints;
  assert.strictEqual(a.latitude, 36.1);
  assert.strictEqual(a.longitude, -115.4);
  assert.strictEqual(a.elevationM, 1200.5);
  assert.strictEqual(a.heartRate, 120);
  assert.strictEqual(a.cadence, 80);
  assert.strictEqual(a.elapsedSec, 0);
  assert.strictEqual(b.heartRate, 135);
  assert.strictEqual(b.cadence, null);
  assert.strictEqual(b.elapsedSec, 60);
  assert.strictEqual(c.heartRate, null);
  assert.strictEqual(c.elevationM, 1225.25);
  assert.strictEqual(c.elapsedSec, 120);

  assert.strictEqual(raw.startTime.toISOString(), '2026-03-01T15:00:00.000Z');
  assert.strictEqual(raw.endTime.toISOString(), '2026-03-01T15:02:00.000Z');
  assert.strictEqual(raw.elapsedSeconds, 120);
});

test('GPX: a file with only waypoints gives the friendly error', () => {
  const onlyWaypoints = '<?xml version="1.0"?><gpx version="1.1"><wpt lat="1" lon="2"/></gpx>';
  assert.throws(() => parseGpxFile(Buffer.from(onlyWaypoints)), /No track data found/);
});

test('GPX: something that is not GPX is rejected', () => {
  assert.throws(() => parseGpxFile(Buffer.from('<html><body>hi</body></html>')), /Invalid or malformed GPX/);
});

test('GPX: entity-expansion tricks do not blow up the parser', () => {
  const bomb = `<?xml version="1.0"?>
<!DOCTYPE gpx [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;"><!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;&b;&b;">]>
<gpx version="1.1"><trk><name>&c;</name><trkseg><trkpt lat="1" lon="2"><ele>3</ele></trkpt></trkseg></trk></gpx>`;
  const started = Date.now();
  try {
    parseGpxFile(Buffer.from(bomb));
  } catch {
    // Rejecting the file is also an acceptable outcome
  }
  assert.ok(Date.now() - started < 2000, 'parsing stays fast');
});

test('GPX: full pipeline computes distance and elevation gain', async () => {
  const parsed = await parseFile(Buffer.from(GPX), 'run.gpx');
  assert.strictEqual(parsed.format, 'GPX');
  assert.strictEqual(parsed.trackPoints.length, 3);
  // Three points roughly 143 m apart each: about 0.18 miles in total
  assert.ok(parsed.metrics.distanceMiles > 0.15 && parsed.metrics.distanceMiles < 0.2, String(parsed.metrics.distanceMiles));
  // 1200.5 m up to 1225.25 m is about 81 ft of climbing
  assert.ok(parsed.metrics.elevationGainFt > 75 && parsed.metrics.elevationGainFt < 87, String(parsed.metrics.elevationGainFt));
});

test('TCX: still parses after the XML parser upgrade', () => {
  const raw = parseTcxFile(Buffer.from(TCX));
  assert.strictEqual(raw.trackPoints.length, 2);
  assert.strictEqual(raw.trackPoints[0].latitude, 36.1);
  assert.strictEqual(raw.trackPoints[0].heartRate, 120);
  assert.strictEqual(raw.trackPoints[0].cadence, 80);
  assert.strictEqual(raw.trackPoints[1].elevationM, 1225.25);
  assert.strictEqual(raw.elapsedSeconds, 120);
  assert.strictEqual(raw.calories, 30);
  assert.strictEqual(raw.avgHeartRate, 130);
  assert.strictEqual(raw.maxHeartRate, 150);
  assert.ok(Math.abs(raw.distanceMiles - 400 / 1609.344) < 1e-9);
});

test('upload middleware (multer 2): accepts .gpx in memory and refuses other file types', async () => {
  const app = express();
  app.post('/u', (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ name: req.file.originalname, size: req.file.buffer.length });
    });
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/u`;

  try {
    const ok = new FormData();
    ok.append('file', new Blob([GPX]), 'run.gpx');
    const good = await fetch(url, { method: 'POST', body: ok });
    assert.strictEqual(good.status, 200);
    assert.deepStrictEqual(await good.json(), { name: 'run.gpx', size: Buffer.byteLength(GPX) });

    const bad = new FormData();
    bad.append('file', new Blob(['#!/bin/sh']), 'script.sh');
    const refused = await fetch(url, { method: 'POST', body: bad });
    assert.strictEqual(refused.status, 400);
    assert.match((await refused.json()).error, /Only \.fit, \.gpx, and \.tcx/);
  } finally {
    server.close();
  }
});
