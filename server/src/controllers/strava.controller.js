const prisma = require('../config/database');
const { catchAsync } = require('../middleware/errorHandler');
const { CLIENT_URL, STRAVA_WEBHOOK_VERIFY_TOKEN } = require('../config/env');
const {
  getOAuthUrl,
  exchangeCode,
  importStravaActivity,
} = require('../services/strava.service');
const { updateQuestProgress } = require('../services/quest.service');

/** GET /api/strava/connect — return Strava OAuth URL (requires auth) */
const connect = catchAsync(async (req, res) => {
  const callbackUrl = `${req.protocol}://${req.get('host')}/api/strava/callback`;
  // Pass userId as state so the callback can identify the user (no JWT on redirect)
  const url = getOAuthUrl(callbackUrl, req.user.id);
  res.json({ url });
});

/** GET /api/strava/callback — Strava redirects here after user authorizes (public) */
const callback = catchAsync(async (req, res) => {
  const { code, error, state } = req.query;

  if (error || !code || !state) {
    return res.redirect(`${CLIENT_URL}/profile?strava=denied`);
  }

  // Verify the user exists
  const user = await prisma.user.findUnique({ where: { id: state }, select: { id: true } });
  if (!user) {
    return res.redirect(`${CLIENT_URL}/profile?strava=denied`);
  }

  const { accessToken, refreshToken, expiresAt, athlete } = await exchangeCode(code);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stravaAthleteId: String(athlete.id),
      stravaAccessToken: accessToken,
      stravaRefreshToken: refreshToken,
      stravaTokenExpiry: expiresAt,
    },
  });

  res.redirect(`${CLIENT_URL}/profile?strava=connected`);
});

/** GET /api/strava/webhook — Strava subscription verification challenge (public) */
const webhookVerify = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return res.json({ 'hub.challenge': challenge });
  }
  res.status(403).json({ error: 'Forbidden' });
};

/** POST /api/strava/webhook — Strava activity event push (public) */
const webhookEvent = (req, res) => {
  // Respond immediately — Strava requires a response within 2 seconds
  res.sendStatus(200);

  const { object_type, aspect_type, object_id, owner_id } = req.body;

  if (object_type !== 'activity' || aspect_type !== 'create') return;

  setImmediate(async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { stravaAthleteId: String(owner_id) },
        select: { id: true },
      });
      if (!user) return;

      const workout = await importStravaActivity(user.id, object_id);
      if (workout) await updateQuestProgress(user.id, workout);
    } catch (err) {
      console.error('[Strava webhook] Failed to import activity:', err);
    }
  });
};

/** GET /api/strava/status — return connection status (requires auth) */
const status = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { stravaAthleteId: true, stravaAccessToken: true },
  });
  res.json({ connected: !!user?.stravaAccessToken });
});

/** DELETE /api/strava/disconnect — clear Strava tokens (requires auth) */
const disconnect = catchAsync(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      stravaAthleteId: null,
      stravaAccessToken: null,
      stravaRefreshToken: null,
      stravaTokenExpiry: null,
    },
  });
  res.json({ message: 'Strava disconnected.' });
});

module.exports = { connect, callback, webhookVerify, webhookEvent, status, disconnect };
