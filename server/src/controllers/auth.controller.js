const { z } = require('zod');
const authService = require('../services/auth.service');
const { catchAsync } = require('../middleware/errorHandler');
const prisma = require('../config/database');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  displayName: z.string().min(1).max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const register = catchAsync(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const result = await authService.register(data);
  res.status(201).json(result);
});

const login = catchAsync(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const result = await authService.login(data);
  res.json(result);
});

const me = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, displayName: true, emailVerified: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
});

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
}).refine((data) => !data.newPassword || data.currentPassword, {
  message: 'Current password is required to set a new password.',
  path: ['currentPassword'],
});

const updateProfile = catchAsync(async (req, res) => {
  const data = updateProfileSchema.parse(req.body);
  const user = await authService.updateProfile(req.user.id, data);
  res.json({ user });
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.params.token);
  res.json({ message: 'Email verified successfully.' });
});

const forgotPassword = catchAsync(async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  await authService.requestPasswordReset(email);
  // Always return success to avoid email enumeration
  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(token, password);
  res.json({ message: 'Password reset successfully. Please log in.' });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.user.id);
  res.json({ message: 'Logged out.' });
});

module.exports = { register, login, me, updateProfile, verifyEmail, forgotPassword, resetPassword, logout };
