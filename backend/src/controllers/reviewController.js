const fs = require('fs');
const prisma = require('../config/db');
const { runStaticAnalysis } = require('../services/staticAnalysisService');
const { runAIReview } = require('../services/aiReviewService');
const { runComplexityAnalysis } = require('../services/complexityAnalysisService');
const { runDocGeneration } = require('../services/docGenerationService');
const { runChatQuery } = require('../services/chatService');

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

    const staticFindings = await runStaticAnalysis(code, 'submitted.js');
    const aiResult = await runAIReview(code, language || 'javascript');
    const complexityResult = await runComplexityAnalysis(code, 'submitted.js');
    const docResult = await runDocGeneration(code, language || 'javascript');

    const aiFindings = (aiResult.findings || []).map((f) => ({
      severity: f.severity,
      issue: f.issue,
      explanation: f.explanation,
      suggestedFix: f.suggestedFix || null,
      fileName: 'submitted.js',
      lineNumber: null,
    }));

    const complexityFindings = complexityResult.findings || [];
    const allFindingsForDb = [...staticFindings, ...aiFindings, ...complexityFindings];

    const review = await prisma.review.create({
      data: {
        projectId: project.id,
        reviewType: 'paste',
        overallScore: aiResult.overallScore,
        summary: aiResult.summary,
      },
    });

    if (allFindingsForDb.length > 0) {
      await prisma.reviewFinding.createMany({
        data: allFindingsForDb.map((f) => ({ ...f, reviewId: review.id })),
      });
    }

    const findingsWithSource = [
      ...staticFindings.map((f) => ({ ...f, source: 'static' })),
      ...aiFindings.map((f) => ({ ...f, source: 'ai' })),
      ...complexityFindings.map((f) => ({ ...f, source: 'complexity' })),
    ];

    res.status(201).json({
      message: 'Code submitted and analyzed successfully',
      project,
      review,
      findings: findingsWithSource,
      complexityMetrics: {
        loc: complexityResult.loc,
        functionCount: complexityResult.functionCount,
        classCount: complexityResult.classCount,
        fileComplexity: complexityResult.fileComplexity,
        fileComplexityRating: complexityResult.fileComplexityRating,
      },
      documentation: docResult.documentation || [],
      codePreview: code.substring(0, 200),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

    const staticFindings = await runStaticAnalysis(fileContent, req.file.originalname);
    const aiResult = await runAIReview(fileContent, 'javascript');
    const complexityResult = await runComplexityAnalysis(fileContent, req.file.originalname);
    const docResult = await runDocGeneration(fileContent, 'javascript');

    const aiFindings = (aiResult.findings || []).map((f) => ({
      severity: f.severity,
      issue: f.issue,
      explanation: f.explanation,
      suggestedFix: f.suggestedFix || null,
      fileName: req.file.originalname,
      lineNumber: null,
    }));

    const complexityFindings = complexityResult.findings || [];
    const allFindingsForDb = [...staticFindings, ...aiFindings, ...complexityFindings];

    const review = await prisma.review.create({
      data: {
        projectId: project.id,
        reviewType: 'file',
        overallScore: aiResult.overallScore,
        summary: aiResult.summary,
      },
    });

    if (allFindingsForDb.length > 0) {
      await prisma.reviewFinding.createMany({
        data: allFindingsForDb.map((f) => ({ ...f, reviewId: review.id })),
      });
    }

    const findingsWithSource = [
      ...staticFindings.map((f) => ({ ...f, source: 'static' })),
      ...aiFindings.map((f) => ({ ...f, source: 'ai' })),
      ...complexityFindings.map((f) => ({ ...f, source: 'complexity' })),
    ];

    res.status(201).json({
      message: 'File uploaded and analyzed successfully',
      project,
      review,
      findings: findingsWithSource,
      complexityMetrics: {
        loc: complexityResult.loc,
        functionCount: complexityResult.functionCount,
        classCount: complexityResult.classCount,
        fileComplexity: complexityResult.fileComplexity,
        fileComplexityRating: complexityResult.fileComplexityRating,
      },
      documentation: docResult.documentation || [],
      fileName: req.file.originalname,
      fileSize: req.file.size,
      codePreview: fileContent.substring(0, 200),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const chatAboutReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userMessage, chatHistory, code, language, complexityMetrics } = req.body;

    if (!userMessage) {
      return res.status(400).json({ message: 'userMessage is required' });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { findings: true, project: true },
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.project.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this review' });
    }

    const chatResult = await runChatQuery({
      code: code || '',
      language: language || 'javascript',
      findings: review.findings,
      complexityMetrics: complexityMetrics || null,
      chatHistory: chatHistory || [],
      userMessage,
    });

    res.status(200).json({ reply: chatResult.reply });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReviewHistory = async (req, res) => {
  try {
    const { search, minScore, maxScore, reviewType, sortBy } = req.query;

    const reviews = await prisma.review.findMany({
      where: {
        project: {
          userId: req.user.id,
          ...(search && { projectName: { contains: search, mode: 'insensitive' } }),
        },
        ...(reviewType && { reviewType }),
      },
      include: { project: true, findings: true },
      orderBy: { createdAt: sortBy === 'oldest' ? 'asc' : 'desc' },
    });

    let filtered = reviews;
    if (minScore) {
      filtered = filtered.filter((r) => r.overallScore !== null && r.overallScore >= Number(minScore));
    }
    if (maxScore) {
      filtered = filtered.filter((r) => r.overallScore !== null && r.overallScore <= Number(maxScore));
    }

    const formatted = filtered.map((r) => ({
      id: r.id,
      projectName: r.project.projectName,
      reviewType: r.reviewType,
      overallScore: r.overallScore,
      summary: r.summary,
      issuesCount: r.findings.length,
      createdAt: r.createdAt,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReviewDetail = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { project: true, findings: true },
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.project.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this review' });
    }

    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { project: true },
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.project.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await prisma.reviewFinding.deleteMany({ where: { reviewId } });
    await prisma.review.delete({ where: { id: reviewId } });

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  submitCode,
  submitFile,
  chatAboutReview,
  getReviewHistory,
  getReviewDetail,
  deleteReview,
};