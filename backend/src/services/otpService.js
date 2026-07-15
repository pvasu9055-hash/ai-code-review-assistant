const { Resend } = require("resend");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);
const OTP_EXPIRY_MINUTES = 5;

function generateNumericCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

function getSubjectAndAction(purpose, code) {
  const actions = {
    signup: "complete your sign up",
    login: "log in to your account",
    reset: "reset your password",
  };
  return {
    actionText: actions[purpose] || "verify your identity",
    subject: `${code} is your verification code`,
  };
}

async function sendEmailOtp(email, purpose) {
  const code = generateNumericCode(6);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otp.updateMany({
    where: { identifier: email, purpose, consumed: false },
    data: { consumed: true },
  });

  await prisma.otp.create({
    data: { identifier: email, code, purpose, expiresAt },
  });

  const { actionText, subject } = getSubjectAndAction(purpose, code);

  const html = `
  <div style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
    <div style="background: #111827; padding: 24px 32px;">
      <h1 style="color: #ffffff; font-size: 20px; margin: 0; letter-spacing: 0.5px;">AI Code Review Assistant</h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 15px; color: #374151; margin: 0 0 8px;">Hi there,</p>
      <p style="font-size: 15px; color: #374151; margin: 0 0 24px;">
        Use the code below to ${actionText}. This code is valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
      </p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827;">${code}</span>
      </div>
      <p style="font-size: 13px; color: #9ca3af; margin: 0;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>
    <div style="background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        © ${new Date().getFullYear()} AI Code Review Assistant. All rights reserved.
      </p>
    </div>
  </div>
  `;

  await resend.emails.send({
    from: `AI Code Review Assistant <${process.env.RESEND_FROM_EMAIL}>`,
    to: email,
    subject,
    html,
  });

  return { success: true };
}

async function verifyEmailOtp(email, code, purpose) {
  const record = await prisma.otp.findFirst({
    where: { identifier: email, purpose, consumed: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { valid: false, reason: "No OTP found. Please request a new one." };
  if (record.expiresAt < new Date()) return { valid: false, reason: "OTP expired. Please request a new one." };
  if (record.code !== code) return { valid: false, reason: "Incorrect code." };

  await prisma.otp.update({ where: { id: record.id }, data: { consumed: true } });

  // Mark email as verified on successful signup/login OTP (not on reset, since account already exists either way)
  if (purpose === "signup" || purpose === "login") {
    await prisma.user.updateMany({
      where: { email },
      data: { emailVerified: true },
    });
  }

  return { valid: true };
}

module.exports = { sendEmailOtp, verifyEmailOtp };