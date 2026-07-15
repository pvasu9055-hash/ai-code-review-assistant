const multer = require('multer');

// @desc  Handle unknown routes (404)
const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// @desc  Centralized error handler - catches thrown errors and multer errors
const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 2MB.' });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }

  if (err.message === 'Unsupported file type') {
    return res.status(400).json({ message: 'Unsupported file type. Allowed: .js, .jsx, .ts, .tsx, .py, .java, .cpp, .c' });
  }

  console.error(err.stack);

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
  });
};

module.exports = { notFound, errorHandler };