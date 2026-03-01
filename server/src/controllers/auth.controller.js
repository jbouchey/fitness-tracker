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
    select: { id: true, email: true, displayName: true, createdAt: true },
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

module.exports = { register, login, me, updateProfile };
