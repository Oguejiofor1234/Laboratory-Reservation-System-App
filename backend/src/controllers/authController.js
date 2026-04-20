const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const {
  generateToken,
  generateAccessToken,
  generateRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
} = require('../utils/helpers');
const { sendEmailVerification, sendPasswordReset } = require('../services/emailService');

// ─── Register ─────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;

  const allowedRoles = ['STUDENT', 'TECHNOLOGIST'];
  const userRole = allowedRoles.includes(role?.toUpperCase()) ? role.toUpperCase() : 'STUDENT';

  const hashed = await bcrypt.hash(password, 12);
  const emailVerifyToken = generateToken();

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashed,
      firstName,
      lastName,
      role: userRole,
      emailVerifyToken,
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });

  // Use the request's Origin header so the link works on any device/network.
  // Falls back to CLIENT_URL env var, then localhost.
  const baseUrl = req.headers.origin || process.env.CLIENT_URL || 'http://localhost:5173';
  const verifyUrl = `${baseUrl}/verify-email/${emailVerifyToken}`;

  // Send email (fire and forget — may fail for non-Gmail domains)
  sendEmailVerification(user, emailVerifyToken).catch(() => {});

  res.status(201).json({
    success: true,
    message: 'Account created. Please verify your email.',
    data: user,
    verifyUrl, // Return link so it can be shown directly on the page
  });
};

// ─── Verify email ─────────────────────────────────────────────────────────────
exports.verifyEmail = async (req, res) => {
  const { token } = req.params;

  const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
  if (!user) throw new AppError('Invalid or expired verification token', 400);

  await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true, emailVerifyToken: null },
  });

  res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
};

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Invalid email or password', 401);
  }

  const payload = { id: user.id, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  setRefreshCookie(res, refreshToken);

  res.json({
    success: true,
    data: {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    },
  });
};

// ─── Refresh token ────────────────────────────────────────────────────────────
exports.refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError('No refresh token', 401);

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, role: true },
  });
  if (!user) throw new AppError('User not found', 401);

  const payload = { id: user.id, role: user.role };
  const accessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload); // rotation

  setRefreshCookie(res, newRefreshToken);
  res.json({ success: true, data: { accessToken } });
};

// ─── Logout ───────────────────────────────────────────────────────────────────
exports.logout = (req, res) => {
  clearRefreshCookie(res);
  res.json({ success: true, message: 'Logged out successfully' });
};

// ─── Check if email is verified (public) ───────────────────────────────────
exports.checkVerified = async (req, res) => {
  const email = req.query.email;
  if (!email) throw new AppError('Email required', 400);
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { isEmailVerified: true },
  });
  res.json({ verified: user?.isEmailVerified || false });
};

// ─── Resend email verification ────────────────────────────────────────────────────
exports.resendVerification = async (req, res) => {
  // Support: authenticated (req.user), query param email, or body email
  let user;
  if (req.user) {
    user = await prisma.user.findUnique({ where: { id: req.user.id } });
  } else {
    const email = req.query.email || req.body?.email;
    if (email) {
      user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    }
  }

  if (!user) throw new AppError('User not found', 404);
  if (user.isEmailVerified) {
    return res.json({ success: true, message: 'Email is already verified.' });
  }

  const token = generateToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken: token },
  });

  await sendEmailVerification(user, token);
  res.json({ success: true, message: 'Verification email sent. Please check your inbox.' });
};

// ─── List technologists (for person-in-charge selector)
exports.getTechnologists = async (req, res) => {
  const technologists = await prisma.user.findMany({
    where: { role: { in: ['TECHNOLOGIST', 'ADMIN'] } },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { firstName: 'asc' },
  });
  res.json({ success: true, data: technologists });
};

// ─── Get current user ───────────────────────────────────────────────────────────────────────────────
exports.me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, isEmailVerified: true, createdAt: true,
    },
  });
  res.json({ success: true, data: user });
};

// ─── Delete own account ────────────────────────────────────────────────────
exports.deleteAccount = async (req, res) => {
  await prisma.user.delete({ where: { id: req.user.id } });
  clearRefreshCookie(res);
  res.json({ success: true, message: 'Account deleted.' });
};

// ─── Forgot password ──────────────────────────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Always respond positively (security: don't reveal if email exists)
  if (user) {
    const token = generateToken();
    // 6-digit numeric code — typed on any device without following a URL
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: token, resetPasswordCode: code, resetPasswordExpires: expires },
    });

    // Use request origin so the link works on any device/network
    const baseUrl = req.headers.origin || process.env.CLIENT_URL || 'http://localhost:5173';
    await sendPasswordReset(user, token, code, baseUrl);
  }

  res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
};

// ─── Reset password via 6-digit code (device-agnostic) ─────────────────────
exports.resetByCode = async (req, res) => {
  const { email, code, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (
    !user ||
    !user.resetPasswordCode ||
    user.resetPasswordCode !== code ||
    !user.resetPasswordExpires ||
    user.resetPasswordExpires < new Date()
  ) {
    throw new AppError('Invalid or expired code. Please request a new one.', 400);
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, resetPasswordToken: null, resetPasswordCode: null, resetPasswordExpires: null },
  });

  res.json({ success: true, message: 'Password reset successful. Please log in.' });
};

// ─── Reset password via link token ─────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: { gt: new Date() },
    },
  });

  if (!user) throw new AppError('Invalid or expired reset token', 400);

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed, resetPasswordToken: null, resetPasswordExpires: null },
  });

  res.json({ success: true, message: 'Password reset successful. Please log in.' });
};
