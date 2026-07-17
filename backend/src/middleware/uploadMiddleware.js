const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
});

// Separate multer config for uploading coding-standards documents (PDF/DOCX/TXT/MD)
const standardsAllowedExtensions = ['.pdf', '.docx', '.txt', '.md'];

const standardsFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (standardsAllowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Allowed: .pdf, .docx, .txt, .md'), false);
  }
};

const standardsUpload = multer({
  storage,
  fileFilter: standardsFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (docs can be larger than code snippets)
});

module.exports = upload;
module.exports.standardsUpload = standardsUpload;