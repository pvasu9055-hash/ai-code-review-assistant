const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { sendEmailOtp, verifyEmailOtp } = require("../services/otpService");

const prisma = new PrismaClient();

function issueToken(user, rememberMe) {
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: rememberMe ? "30d" : process.env.JWT_EXPIRES_IN,
  });
}

function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

// ---------- SIGNUP ----------

exports.requestEmailSignupOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered." });

  await sendEmailOtp(email, "signup");
  res.json({ message: "OTP sent to email." });
};

exports.verifyEmailSignupOtp = async (req, res) => {
  const { email, code, name, password } = req.body;
  if (!email || !code || !name || !password) {
    return res.status(400).json({ error: "Email, code, name, and password are required." });
  }

  const result = await verifyEmailOtp(email, code, "signup");
  if (!result.valid) return res.status(400).json({ error: result.reason });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered." });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, password: hashedPassword, emailVerified: true },
  });

  const token = issueToken(user, false);
  res.status(201).json({ token, user: safeUser(user) });
};

// ---------- LOGIN ----------

exports.requestEmailLoginOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "No account with this email." });

  await sendEmailOtp(email, "login");
  res.json({ message: "OTP sent to email." });
};

exports.verifyEmailLoginOtp = async (req, res) => {
  const { email, code, rememberMe } = req.body;
  if (!email || !code) return res.status(400).json({ error: "Email and code are required." });

  const result = await verifyEmailOtp(email, code, "login");
  if (!result.valid) return res.status(400).json({ error: result.reason });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "No account with this email." });

  const token = issueToken(user, !!rememberMe);
  res.json({ token, user: safeUser(user) });
};

// ---------- FORGOT PASSWORD ----------

exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success even if user not found, to avoid leaking which emails are registered
  if (user) {
    await sendEmailOtp(email, "reset");
  }
  res.json({ message: "If that email is registered, a reset code has been sent." });
};

exports.verifyPasswordReset = async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "Email, code, and new password are required." });
  }

  const result = await verifyEmailOtp(email, code, "reset");
  if (!result.valid) return res.status(400).json({ error: result.reason });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "No account with this email." });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  res.json({ message: "Password reset successful. You can now log in." });
};