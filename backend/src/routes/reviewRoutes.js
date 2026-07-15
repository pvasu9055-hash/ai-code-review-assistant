const express = require('express');
const router = express.Router();
const {
  submitCode,
  submitFile,
  chatAboutReview,
  getReviewHistory,
  getReviewDetail,
  deleteReview,
  getScoreTrend,
  streamReview,
  searchReviews,
} = require('../controllers/reviewController');
const protect = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/submit-code', protect, submitCode);
router.post('/submit-file', protect, upload.single('file'), submitFile);
router.get('/analytics/trend', protect, getScoreTrend);
router.get('/stream-review', protect, streamReview);
router.get('/search', protect, searchReviews);
router.post('/:reviewId/chat', protect, chatAboutReview);
router.get('/', protect, getReviewHistory);
router.get('/:reviewId', protect, getReviewDetail);
router.delete('/:reviewId', protect, deleteReview);

module.exports = router;