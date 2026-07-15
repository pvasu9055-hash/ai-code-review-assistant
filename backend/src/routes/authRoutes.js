const express = require('express');
const router = express.Router();
const { signup, login, getProfile, uploadAvatar } = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');
const uploadAvatarMiddleware = require('../middleware/avatarUploadMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.post('/avatar', protect, uploadAvatarMiddleware.single('avatar'), uploadAvatar);

module.exports = router;