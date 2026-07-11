const bcrypt = require('bcryptjs');
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
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get logged-in user profile + real usage stats
// @route GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        reviews: {
          include: { findings: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allReviews = projects.flatMap((p) => p.reviews);
    const allFindings = allReviews.flatMap((r) => r.findings);

    const scoredReviews = allReviews.filter((r) => r.overallScore !== null && r.overallScore !== undefined);
    const averageScore =
      scoredReviews.length > 0
        ? Math.round(scoredReviews.reduce((sum, r) => sum + r.overallScore, 0) / scoredReviews.length)
        : null;

    const severityCounts = {
      error: allFindings.filter((f) => f.severity === 'error').length,
      warning: allFindings.filter((f) => f.severity === 'warning').length,
      info: allFindings.filter((f) => f.severity === 'info').length,
    };

    const recentReviews = allReviews
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((r) => {
        const parentProject = projects.find((p) => p.id === r.projectId);
        return {
          id: r.id,
          projectName: parentProject?.projectName || 'Unknown project',
          overallScore: r.overallScore,
          reviewType: r.reviewType,
          issuesCount: r.findings.length,
          createdAt: r.createdAt,
        };
      });

    res.json({
      user: req.user,
      stats: {
        totalProjects: projects.length,
        totalReviews: allReviews.length,
        totalFindings: allFindings.length,
        averageScore,
        severityCounts,
      },
      recentReviews,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { signup, login, getProfile };