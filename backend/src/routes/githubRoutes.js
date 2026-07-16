const express = require('express');
const router = express.Router();
const { handleGithubWebhook } = require('../controllers/githubController');

router.post('/webhook', handleGithubWebhook);

module.exports = router;