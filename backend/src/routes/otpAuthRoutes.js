const express = require("express");
const router = express.Router();
const otpAuthController = require("../controllers/otpAuthController");
const { otpRequestLimiter } = require("../middleware/otpRateLimiter");

// Signup
router.post("/email/signup/request", otpRequestLimiter, otpAuthController.requestEmailSignupOtp);
router.post("/email/signup/verify", otpAuthController.verifyEmailSignupOtp);

// Login
router.post("/email/login/request", otpRequestLimiter, otpAuthController.requestEmailLoginOtp);
router.post("/email/login/verify", otpAuthController.verifyEmailLoginOtp);

// Forgot password
router.post("/password/reset/request", otpRequestLimiter, otpAuthController.requestPasswordReset);
router.post("/password/reset/verify", otpAuthController.verifyPasswordReset);

module.exports = router;