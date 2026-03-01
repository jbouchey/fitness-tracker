const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { signToken } = require('../utils/jwtUtils');

async function register({ email, password, displayName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('An account with that email already exists.');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, displayName: displayName || null },
    select: { id: true, email: true, displayName: true, createdAt: true },
  });

  const token = signToken({ userId: user.id, email: user.email });
  return { user, token };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const token = signToken({ userId: user.id, email: user.email });
  return {
    user: { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt },
    token,
  };
}

async function updateProfile(userId, { displayName, currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User not found.');
    err.status = 404;
    throw err;
  }

  const updateData = {};

  if (displayName !== undefined) updateData.displayName = displayName;

  if (newPassword) {
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      const err = new Error('Current password is incorrect.');
      err.status = 400;
      throw err;
    }
    updateData.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, email: true, displayName: true, createdAt: true },
  });
}

module.exports = { register, login, updateProfile };
