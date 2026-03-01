const { verifyToken, signToken } = require('../utils/jwtUtils');
const prisma = require('../config/database');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, emailVerified: true, tokenVersion: true },
    });

    // tokenVersion ?? 0 gracefully handles tokens issued before this feature was added
    if (!user || user.tokenVersion !== (payload.tokenVersion ?? 0)) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    req.user = { id: user.id, email: user.email, emailVerified: user.emailVerified };

    // Sliding refresh: if token expires in < 24h, issue a replacement
    const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
    if (expiresIn < 86400) {
      res.setHeader(
        'X-Token-Refresh',
        signToken({ userId: user.id, email: user.email, tokenVersion: user.tokenVersion })
      );
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
