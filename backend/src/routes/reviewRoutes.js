const express = require('express');
const router = express.Router();
const { submitCode, submitFile } = require('../controllers/reviewController');
const protect = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/submit-code', protect, submitCode);
router.post('/submit-file', protect, upload.single('file'), submitFile);

module.exports = router;