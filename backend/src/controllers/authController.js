const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');
const generateToken = require('../utils/generateToken');

// @desc  Register new user
// @route POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Login user
// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get logged-in user profile + real usage stats (optimized)
// @route GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const projects = await prisma.project.findMany({
      where: { userId },
      select: {
        id: true,
        projectName: true,
        reviews: {
          select: {
            id: true,
            overallScore: true,
            reviewType: true,
            createdAt: true,
            _count: { select: { findings: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allReviews = projects.flatMap((p) =>
      p.reviews.map((r) => ({ ...r, projectName: p.projectName }))
    );

    const scoredReviews = allReviews.filter((r) => r.overallScore !== null && r.overallScore !== undefined);
    const averageScore =
      scoredReviews.length > 0
        ? Math.round(scoredReviews.reduce((sum, r) => sum + r.overallScore, 0) / scoredReviews.length)
        : null;

    const totalFindings = allReviews.reduce((sum, r) => sum + r._count.findings, 0);

    const severityGroups = await prisma.reviewFinding.groupBy({
      by: ['severity'],
      where: { review: { project: { userId } } },
      _count: { severity: true },
    });

    const severityCounts = {
      error: severityGroups.find((g) => g.severity === 'error')?._count.severity || 0,
      warning: severityGroups.find((g) => g.severity === 'warning')?._count.severity || 0,
      info: severityGroups.find((g) => g.severity === 'info')?._count.severity || 0,
    };

    const recentReviews = allReviews
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        projectName: r.projectName,
        overallScore: r.overallScore,
        reviewType: r.reviewType,
        issuesCount: r._count.findings,
        createdAt: r.createdAt,
      }));

    res.json({
      user: req.user,
      stats: {
        totalProjects: projects.length,
        totalReviews: allReviews.length,
        totalFindings,
        averageScore,
        severityCounts,
      },
      recentReviews,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Upload/replace the logged-in user's avatar
// @route POST /api/auth/avatar
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const existing = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatarUrl: true },
    });

    // Remove old avatar file if one exists, so we don't accumulate orphaned files
    if (existing?.avatarUrl) {
      const oldPath = path.join(process.cwd(), existing.avatarUrl.replace(/^\//, ''));
      fs.unlink(oldPath, () => {}); // best-effort, ignore errors
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl },
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
    });

    res.json({ message: 'Avatar updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { signup, login, getProfile, uploadAvatar };