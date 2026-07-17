const express = require('express');
const router = express.Router();
const {
  uploadStandard,
  getStandards,
  deleteStandard,
} = require('../controllers/standardsController');
const protect = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/upload', protect, upload.standardsUpload.single('file'), uploadStandard);
router.get('/', protect, getStandards);
router.delete('/:id', protect, deleteStandard);

module.exports = router;