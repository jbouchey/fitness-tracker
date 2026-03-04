const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { signToken } = require('../utils/jwtUtils');
const { sendEmail } = require('../utils/emailUtils');
const { APP_URL } = require('../config/env');

const USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  emailVerified: true,
  createdAt: true,
  adventureModeEnabled: true,
  adventureCharacterArchetype: true,
  adventureCharacterGender: true,
  adventureCharacterColor: true,
  adventureDifficulty: true,
};

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function register({ email, password, displayName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('An account with that email already exists.');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const emailVerificationToken = generateToken();
  const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: displayName || null,
      emailVerified: false,
      emailVerificationToken,
      emailVerificationExpiry,
    },
    select: USER_SELECT,
  });

  const verifyUrl = `${APP_URL}/verify-email?token=${emailVerificationToken}`;
  await sendEmail(
    email,
    'Verify your TrailTracker email',
    `<p>Welcome to TrailTracker! Click the link below to verify your email address.</p>
     <p><a href="${verifyUrl}">${verifyUrl}</a></p>
     <p>This link expires in 24 hours.</p>`
  );

  const token = signToken({ userId: user.id, email: user.email, tokenVersion: 0 });
  return { user, token };
}

async function verifyEmail(rawToken) {
  const user = await prisma.user.findUnique({ where: { emailVerificationToken: rawToken } });
  if (!user || user.emailVerificationExpiry < new Date()) {
    const err = new Error('This verification link is invalid or has expired.');
    err.status = 400;
    throw err;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerificationToken: null, emailVerificationExpiry: null },
  });
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

  const token = signToken({ userId: user.id, email: user.email, tokenVersion: user.tokenVersion });
  return {
    user: { id: user.id, email: user.email, displayName: user.displayName, emailVerified: user.emailVerified, createdAt: user.createdAt },
    token,
  };
}

async function requestPasswordReset(email) {
  // Always resolve so we don't reveal whether an email exists
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const passwordResetToken = generateToken();
  const passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken, passwordResetExpiry },
  });

  const resetUrl = `${APP_URL}/reset-password/${passwordResetToken}`;
  await sendEmail(
    email,
    'Reset your TrailTracker password',
    `<p>Click the link below to reset your password. This link expires in 1 hour.</p>
     <p><a href="${resetUrl}">${resetUrl}</a></p>
     <p>If you didn't request this, you can safely ignore this email.</p>`
  );
}

async function resetPassword(rawToken, newPassword) {
  const user = await prisma.user.findUnique({ where: { passwordResetToken: rawToken } });
  if (!user || user.passwordResetExpiry < new Date()) {
    const err = new Error('This reset link is invalid or has expired.');
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      tokenVersion: { increment: 1 },
    },
  });
}

async function logout(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
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
    updateData.tokenVersion = { increment: 1 };
  }

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: USER_SELECT,
  });
}

module.exports = { register, verifyEmail, login, requestPasswordReset, resetPassword, logout, updateProfile };
