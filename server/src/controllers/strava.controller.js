const prisma = require('../config/database');
const { catchAsync } = require('../middleware/errorHandler');
const { CLIENT_URL, STRAVA_WEBHOOK_VERIFY_TOKEN, STRAVA_WEBHOOK_SUBSCRIPTION_ID } = require('../config/env');
const { signStravaState, verifyStravaState } = require('../utils/jwtUtils');
const {
  getOAuthUrl,
  exchangeCode,
  importStravaActivity,
} = require('../services/strava.service');

/** GET /api/strava/connect — return Strava OAuth URL (requires auth) */
const connect = catchAsync(async (req, res) => {
  const callbackUrl = `${req.protocol}://${req.get('host')}/api/strava/callback`;
  // The callback has no session, so the user is carried in a signed, 10-minute state value.
  const url = getOAuthUrl(callbackUrl, signStravaState(req.user.id));
  res.json({ url });
});

/** GET /api/strava/callback — Strava redirects here after user authorizes (public) */
const callback = catchAsync(async (req, res) => {
  const { code, error, state } = req.query;

  if (error || !code || !state) {
    return res.redirect(`${CLIENT_URL}/profile?strava=denied`);
  }

  let userId;
  try {
    userId = verifyStravaState(String(state));
  } catch {
    return res.redirect(`${CLIENT_URL}/profile?strava=denied`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
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

  const { object_type, aspect_type, object_id, owner_id, subscription_id } = req.body || {};

  if (object_type !== 'activity' || aspect_type !== 'create') return;
  // Strava does not sign webhook posts. Ids must be plain numbers, and when the
  // subscription id is configured, events from any other subscription are dropped.
  if (!/^\d{1,20}$/.test(String(object_id)) || !/^\d{1,20}$/.test(String(owner_id))) return;
  if (STRAVA_WEBHOOK_SUBSCRIPTION_ID && String(subscription_id) !== String(STRAVA_WEBHOOK_SUBSCRIPTION_ID)) return;

  setImmediate(async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { stravaAthleteId: String(owner_id) },
        select: { id: true },
      });
      if (!user) return;

      const workout = await importStravaActivity(user.id, object_id);
      if (workout) {
        const { processWorkoutReward } = require('../rpg/campaignService');
        await processWorkoutReward(prisma, user.id, workout);
      }
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
