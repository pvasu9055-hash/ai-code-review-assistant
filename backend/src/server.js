require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const otpAuthRoutes = require('./routes/otpAuthRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const githubRoutes = require('./routes/githubRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL }));

// Capture raw body (needed for GitHub webhook signature verification)
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Serve uploaded files (avatars, etc.) statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/auth/otp', otpAuthRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/github', githubRoutes);

app.get('/', (req, res) => {
  res.send('AI Code Review Assistant API is running');
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));