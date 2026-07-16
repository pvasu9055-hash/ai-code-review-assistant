const fs = require('fs');
const prisma = require('../config/db');
const { runStaticAnalysis } = require('../services/staticAnalysisService');
const { runAIReview, runDiffAwareReviewBatch } = require('../services/aiReviewService');
const { runComplexityAnalysis } = require('../services/complexityAnalysisService');
const { runDocGeneration } = require('../services/docGenerationService');
const { runChatQuery } = require('../services/chatService');
const { streamAIReview } = require('../services/aiReviewStreamService');
const { generateEmbedding, cosineSimilarity } = require('../services/embeddingService');
const { parseUnifiedDiff, buildReviewSnippets } = require('../services/diffAnalysisService');

const submitCode = async (req, res) => {
  try {
    const { code, language, projectName, minScoreThreshold, maxComplexityThreshold } = req.body;

    if (!code || !code.trim() || !projectName || !projectName.trim()) {
      return res.status(400).json({ message: 'Code and project name are required' });
    }

    if (code.length > 50000) {
      return res.status(400).json({ message: 'Code is too large. Maximum 50,000 characters for pasted code.' });
    }

    const project = await prisma.project.create({
      data: {
        userId: req.user.id,
        projectName,
        ...(minScoreThreshold !== undefined && { minScoreThreshold: Number(minScoreThreshold) }),
        ...(maxComplexityThreshold !== undefined && { maxComplexityThreshold: Number(maxComplexityThreshold) }),
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

    const passedQualityGate =
      (aiResult.overallScore === null || aiResult.overallScore >= project.minScoreThreshold) &&
      (complexityResult.fileComplexity === null || complexityResult.fileComplexity <= project.maxComplexityThreshold);

    const embeddingText = [aiResult.summary, ...allFindingsForDb.map((f) => `${f.severity}: ${f.issue} - ${f.explanation}`)]
      .filter(Boolean)
      .join('\n');
    const embeddingVector = await generateEmbedding(embeddingText);

    const review = await prisma.review.create({
      data: {
        projectId: project.id,
        reviewType: 'paste',
        overallScore: aiResult.overallScore,
        passedQualityGate,
        summary: aiResult.summary,
        embedding: embeddingVector ? JSON.stringify(embeddingVector) : null,
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
      qualityGate: {
        passed: passedQualityGate,
        minScoreThreshold: project.minScoreThreshold,
        maxComplexityThreshold: project.maxComplexityThreshold,
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

    const { projectName, minScoreThreshold, maxComplexityThreshold } = req.body;

    if (!projectName || !projectName.trim()) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf-8');

    if (!fileContent.trim()) {
      return res.status(400).json({ message: 'Uploaded file is empty' });
    }

    const project = await prisma.project.create({
      data: {
        userId: req.user.id,
        projectName,
        ...(minScoreThreshold !== undefined && { minScoreThreshold: Number(minScoreThreshold) }),
        ...(maxComplexityThreshold !== undefined && { maxComplexityThreshold: Number(maxComplexityThreshold) }),
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

    const passedQualityGate =
      (aiResult.overallScore === null || aiResult.overallScore >= project.minScoreThreshold) &&
      (complexityResult.fileComplexity === null || complexityResult.fileComplexity <= project.maxComplexityThreshold);

    const embeddingText = [aiResult.summary, ...allFindingsForDb.map((f) => `${f.severity}: ${f.issue} - ${f.explanation}`)]
      .filter(Boolean)
      .join('\n');
    const embeddingVector = await generateEmbedding(embeddingText);

    const review = await prisma.review.create({
      data: {
        projectId: project.id,
        reviewType: 'file',
        overallScore: aiResult.overallScore,
        passedQualityGate,
        summary: aiResult.summary,
        embedding: embeddingVector ? JSON.stringify(embeddingVector) : null,
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
      qualityGate: {
        passed: passedQualityGate,
        minScoreThreshold: project.minScoreThreshold,
        maxComplexityThreshold: project.maxComplexityThreshold,
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

// @desc  Submit a unified diff (like a git diff / PR patch) for focused review
// @route POST /api/reviews/diff
const submitDiff = async (req, res) => {
  try {
    const { diff, language, projectName, minScoreThreshold, maxComplexityThreshold } = req.body;

    if (!diff || !diff.trim() || !projectName || !projectName.trim()) {
      return res.status(400).json({ message: 'Diff and project name are required' });
    }

    if (diff.length > 100000) {
      return res.status(400).json({ message: 'Diff is too large. Maximum 100,000 characters.' });
    }

    const parsedFiles = parseUnifiedDiff(diff);

    if (parsedFiles.length === 0) {
      return res.status(400).json({ message: 'Could not parse any files from the provided diff' });
    }

    const fileSnippets = buildReviewSnippets(parsedFiles);

    const project = await prisma.project.create({
      data: {
        userId: req.user.id,
        projectName,
        ...(minScoreThreshold !== undefined && { minScoreThreshold: Number(minScoreThreshold) }),
        ...(maxComplexityThreshold !== undefined && { maxComplexityThreshold: Number(maxComplexityThreshold) }),
      },
    });

    const diffReviewResult = await runDiffAwareReviewBatch(fileSnippets, language || 'javascript');

    const allFindingsForDb = diffReviewResult.fileReviews.flatMap((fileReview) =>
      (fileReview.findings || []).map((f) => ({
        severity: f.severity,
        issue: f.issue,
        explanation: f.explanation,
        suggestedFix: f.suggestedFix || null,
        fileName: fileReview.fileName,
        lineNumber: f.lineNumber || null,
      }))
    );

    const passedQualityGate =
      diffReviewResult.overallScore === null || diffReviewResult.overallScore >= project.minScoreThreshold;

    const embeddingText = diffReviewResult.fileReviews
      .map((r) => `${r.fileName}: ${r.summary}`)
      .filter(Boolean)
      .join('\n');
    const embeddingVector = await generateEmbedding(embeddingText);

    const review = await prisma.review.create({
      data: {
        projectId: project.id,
        reviewType: 'diff',
        overallScore: diffReviewResult.overallScore,
        passedQualityGate,
        summary: `Reviewed ${parsedFiles.length} changed file(s), ${diffReviewResult.totalFindings} finding(s).`,
        embedding: embeddingVector ? JSON.stringify(embeddingVector) : null,
      },
    });

    if (allFindingsForDb.length > 0) {
      await prisma.reviewFinding.createMany({
        data: allFindingsForDb.map((f) => ({ ...f, reviewId: review.id })),
      });
    }

    res.status(201).json({
      message: 'Diff submitted and analyzed successfully',
      project,
      review,
      fileReviews: diffReviewResult.fileReviews,
      qualityGate: {
        passed: passedQualityGate,
        minScoreThreshold: project.minScoreThreshold,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const chatAboutReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userMessage, chatHistory, code, language, complexityMetrics } = req.body;

    if (!userMessage || !userMessage.trim()) {
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
      passedQualityGate: r.passedQualityGate,
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

const getScoreTrend = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { project: { userId: req.user.id }, overallScore: { not: null } },
      select: {
        overallScore: true,
        createdAt: true,
        project: { select: { projectName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const trend = reviews.map((r) => ({
      date: r.createdAt,
      score: r.overallScore,
      projectName: r.project.projectName,
    }));

    res.json(trend);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Stream AI review live via Server-Sent Events
// @route GET /api/reviews/stream-review?code=...&language=...
const streamReview = async (req, res) => {
  try {
    const { code, language } = req.query;

    if (!code || !code.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Code is required' }));
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const decodedCode = decodeURIComponent(code);

    const finalResult = await streamAIReview(decodedCode, language || 'javascript', (chunkText) => {
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ type: 'done', result: finalResult })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
};

// @desc  Semantic search across review history
// @route GET /api/reviews/search?q=...
const searchReviews = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ message: 'Query is required' });
    }

    const queryVector = await generateEmbedding(q);
    if (!queryVector) {
      return res.status(500).json({ message: 'Failed to generate query embedding' });
    }

    const reviews = await prisma.review.findMany({
      where: { project: { userId: req.user.id }, embedding: { not: null } },
      include: { project: true, findings: true },
    });

    const scored = reviews
      .map((r) => ({
        id: r.id,
        projectName: r.project.projectName,
        summary: r.summary,
        overallScore: r.overallScore,
        createdAt: r.createdAt,
        issuesCount: r.findings.length,
        score: cosineSimilarity(queryVector, JSON.parse(r.embedding)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json(scored);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  submitCode,
  submitFile,
  submitDiff,
  chatAboutReview,
  getReviewHistory,
  getReviewDetail,
  deleteReview,
  getScoreTrend,
  streamReview,
  searchReviews,
};