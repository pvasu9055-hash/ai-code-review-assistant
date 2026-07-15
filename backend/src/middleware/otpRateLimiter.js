const rateLimit = require("express-rate-limit");

const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 OTP requests per identifier window per IP
  message: { error: "Too many OTP requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { otpRequestLimiter };