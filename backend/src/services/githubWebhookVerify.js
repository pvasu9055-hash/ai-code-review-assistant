const crypto = require('crypto');

// Verifies the X-Hub-Signature-256 header GitHub sends, using the raw request body
const verifyGithubSignature = (req) => {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !req.rawBody) return false;

  const expected =
    'sha256=' +
    crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET).update(req.rawBody).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false; // lengths differ, etc.
  }
};

module.exports = { verifyGithubSignature };