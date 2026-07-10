const fs = require('fs');
const prisma = require('../config/db');
const { runStaticAnalysis } = require('../services/staticAnalysisService');

// @desc  Submit code (paste) - creates project + review + runs static analysis
// @route POST /api/reviews/submit-code
const submitCode = async (req, res) => {
  try {
    const { code, language, projectName } = req.body;

    if (!code || !projectName) {
      return res.status(400).json({ message: 'Code and project name are required' });
    }

    const project = await prisma.project.create({
      data: {
        userId: req.user.id,
        projectName,
      },
    });

    const review = await prisma.review.create({
      data: {
        projectId: project.id,
        reviewType: 'paste',
        summary: `Static analysis complete for ${language || 'unknown'} code`,
      },
    });

    const findings = await runStaticAnalysis(code, 'submitted.js');

    if (findings.length > 0) {
      await prisma.reviewFinding.createMany({
        data: findings.map((f) => ({ ...f, reviewId: review.id })),
      });
    }

    res.status(201).json({
      message: 'Code submitted and analyzed successfully',
      project,
      review,
      findings,
      codePreview: code.substring(0, 200),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Submit code (file upload) - creates project + review + runs static analysis
// @route POST /api/reviews/submit-file
const submitFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { projectName } = req.body;

    if (!projectName) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf-8');

    const project = await prisma.project.create({
      data: {
        userId: req.user.id,
        projectName,
      },
    });

    const review = await prisma.review.create({
      data: {
        projectId: project.id,
        reviewType: 'file',
        summary: `Static analysis complete for uploaded file: ${req.file.originalname}`,
      },
    });

    const findings = await runStaticAnalysis(fileContent, req.file.originalname);

    if (findings.length > 0) {
      await prisma.reviewFinding.createMany({
        data: findings.map((f) => ({ ...f, reviewId: review.id })),
      });
    }

    res.status(201).json({
      message: 'File uploaded and analyzed successfully',
      project,
      review,
      findings,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      codePreview: fileContent.substring(0, 200),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitCode, submitFile };