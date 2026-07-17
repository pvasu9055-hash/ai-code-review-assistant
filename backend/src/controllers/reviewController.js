const fs = require('fs');
const prisma = require('../config/db');
const { runStaticAnalysis } = require('../services/staticAnalysisService');
const { runAIReview, runDiffAwareReviewBatch, runRAGReview, runInsightsAnalysis } = require('../services/aiReviewService');
const { runComplexityAnalysis } = require('../services/complexityAnalysisService');
const { runDocGeneration } = require('../services/docGenerationService');
const { runChatQuery } = require('../services/chatService');
const { streamAIReview } = require('../services/aiReviewStreamService');
const { generateEmbedding, cosineSimilarity, generateStandardEmbedding } = require('../services/embeddingService');
const { parseUnifiedDiff, buildReviewSnippets } = require('../services/diffAnalysisService');
const { runMultiAgentReview } = require('../services/multiAgentReviewService');

const findOrCreateProject = async (userId, projectName, minScoreThreshold, maxComplexityThreshold) => {
  const existing = await prisma.project.findFirst({
    where: { userId, projectName },
  });

  if (existing) return existing;

  return prisma.project.create({
    data: {
      userId,
      projectName,
      ...(minScoreThreshold !== undefined && { minScoreThreshold: Number(minScoreThreshold) }),
      ...(maxComplexityThreshold !== undefined && { maxComplexityThreshold: Number(maxComplexityThreshold) }),
    },
  });
};

const submitCode = async (req, res) => {
  try {
    const { code, language, projectName, minScoreThreshold, maxComplexityThreshold } = req.body;

    if (!code || !code.trim() || !projectName || !projectName.trim()) {
      return res.status(400).json({ message: 'Code and project name are required' });
    }

    if (code.length > 50000) {
      return res.status(400).json({ message: 'Code is too large. Maximum 50,000 characters for pasted code.' });
    }

    const project = await findOrCreateProject(req.user.id, projectName, minScoreThreshold, maxComplexityThreshold);

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

    const project = await findOrCreateProject(req.user.id, projectName, minScoreThreshold, maxComplexityThreshold);

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

const submitRAGReview = async (req, res) => {
  try {
    const { code, language, projectName, minScoreThreshold, maxComplexityThreshold, topK } = req.body;

    if (!code || !code.trim() || !projectName || !projectName.trim()) {
      return res.status(400).json({ message: 'Code and project name are required' });
    }

    const hasStandards = await prisma.codingStandard.count({ where: { userId: req.user.id } });
    if (hasStandards === 0) {
      return res.status(400).json({ message: 'No coding standards uploaded yet. Upload one via /api/standards/upload first.' });
    }

    const codeEmbedding = await generateStandardEmbedding(code);
    if (!codeEmbedding) {
      return res.status(500).json({ message: 'Failed to generate embedding for the submitted code' });
    }
    const vectorLiteral = `[${codeEmbedding.join(',')}]`;
    const k = Math.min(Number(topK) || 5, 10);

    const relevantChunks = await prisma.$queryRawUnsafe(
      `SELECT sc.id, sc.content, sc."chunkIndex", cs."fileName" as "sourceFile",
              1 - (sc.embedding <=> $1::vector) as similarity
       FROM "StandardChunk" sc
       JOIN "CodingStandard" cs ON cs.id = sc."standardId"
       WHERE cs."userId" = $2
       ORDER BY sc.embedding <=> $1::vector
       LIMIT $3`,
      vectorLiteral,
      req.user.id,
      k
    );

    const project = await findOrCreateProject(req.user.id, projectName, minScoreThreshold, maxComplexityThreshold);

    const ragResult = await runRAGReview(code, language || 'javascript', relevantChunks);

    const allFindingsForDb = (ragResult.findings || []).map((f) => ({
      severity: f.severity,
      issue: f.issue,
      explanation: f.explanation,
      suggestedFix: f.suggestedFix || null,
      fileName: 'submitted.js',
      lineNumber: null,
    }));

    const passedQualityGate =
      ragResult.overallScore === null || ragResult.overallScore >= project.minScoreThreshold;

    const review = await prisma.review.create({
      data: {
        projectId: project.id,
        reviewType: 'rag',
        overallScore: ragResult.overallScore,
        passedQualityGate,
        summary: ragResult.summary,
      },
    });

    if (allFindingsForDb.length > 0) {
      await prisma.reviewFinding.createMany({
        data: allFindingsForDb.map((f) => ({ ...f, reviewId: review.id })),
      });
    }

    res.status(201).json({
      message: 'Code reviewed against your coding standards successfully',
      project,
      review,
      findings: ragResult.findings,
      retrievedStandards: relevantChunks.map((c) => ({
        sourceFile: c.sourceFile,
        chunkIndex: c.chunkIndex,
        similarity: Number(c.similarity).toFixed(3),
        preview: c.content.substring(0, 150),
      })),
      qualityGate: {
        passed: passedQualityGate,
        minScoreThreshold: project.minScoreThreshold,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

    const project = await findOrCreateProject(req.user.id, projectName, minScoreThreshold, maxComplexityThreshold);

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

const getProjectAnalytics = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.id },
      include: {
        reviews: {
          select: { overallScore: true, createdAt: true, reviewType: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = projects
      .filter((p) => p.reviews.length > 0)
      .map((p) => {
        const scoredReviews = p.reviews.filter((r) => r.overallScore !== null);
        const averageScore =
          scoredReviews.length > 0
            ? Math.round(scoredReviews.reduce((sum, r) => sum + r.overallScore, 0) / scoredReviews.length)
            : null;

        return {
          projectId: p.id,
          projectName: p.projectName,
          githubUrl: p.githubUrl,
          reviewCount: p.reviews.length,
          averageScore,
          lastReviewedAt: p.reviews[0]?.createdAt || p.createdAt,
          reviewTypes: [...new Set(p.reviews.map((r) => r.reviewType))],
        };
      });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  AI-generated insights summarizing trends across all reviews/repos
// @route GET /api/reviews/insights
const getAIInsights = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.id },
      include: {
        reviews: {
          select: { overallScore: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const findings = await prisma.reviewFinding.findMany({
      where: { review: { project: { userId: req.user.id } } },
      select: { issue: true, severity: true },
    });

    if (findings.length === 0) {
      return res.json({
        repositoriesReviewed: projects.length,
        averageQuality: null,
        mostCommonIssue: null,
        mostCommonIssueCount: 0,
        securityIssuesCount: 0,
        performanceIssuesCount: 0,
        mostImprovedRepo: null,
        mostImprovedDelta: null,
        narrative: 'Not enough review data yet to generate insights. Submit a few more reviews first.',
      });
    }

    const issueCounts = {};
    findings.forEach((f) => {
      const key = f.issue.toLowerCase().trim();
      issueCounts[key] = (issueCounts[key] || 0) + 1;
    });
    const topIssue = Object.entries(issueCounts).sort((a, b) => b[1] - a[1])[0];

    const securityIssuesCount = findings.filter((f) =>
      /security|injection|xss|auth|secret|vulnerab/i.test(f.issue)
    ).length;
    const performanceIssuesCount = findings.filter((f) =>
      /performance|slow|memory|leak|n\+1|inefficient/i.test(f.issue)
    ).length;

    const allScores = projects.flatMap((p) => p.reviews.map((r) => r.overallScore)).filter((s) => s !== null);
    const averageQuality =
      allScores.length > 0 ? Math.round(allScores.reduce((sum, s) => sum + s, 0) / allScores.length) : null;

    let mostImprovedRepo = null;
    let mostImprovedDelta = null;
    projects.forEach((p) => {
      const scored = p.reviews.filter((r) => r.overallScore !== null);
      if (scored.length >= 2) {
        const delta = scored[scored.length - 1].overallScore - scored[0].overallScore;
        if (mostImprovedDelta === null || delta > mostImprovedDelta) {
          mostImprovedDelta = delta;
          mostImprovedRepo = p.projectName;
        }
      }
    });

    const statsText = `
Repositories reviewed: ${projects.length}
Total findings: ${findings.length}
Top issue: "${topIssue[0]}" occurring ${topIssue[1]} times
Security-related findings: ${securityIssuesCount}
Performance-related findings: ${performanceIssuesCount}
Average quality score: ${averageQuality ?? 'N/A'}
Most improved repo: ${mostImprovedRepo || 'N/A'} (${mostImprovedDelta !== null ? `+${mostImprovedDelta}` : 'N/A'})
    `.trim();

    const aiResult = await runInsightsAnalysis(statsText);

    res.json({
      repositoriesReviewed: projects.length,
      averageQuality,
      mostCommonIssue: topIssue[0],
      mostCommonIssueCount: topIssue[1],
      securityIssuesCount,
      performanceIssuesCount,
      mostImprovedRepo,
      mostImprovedDelta,
      narrative: aiResult?.narrative || 'Insights generated from your review history.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitMultiAgent = async (req, res) => {
  try {
    const { code, language, projectName, minScoreThreshold } = req.body;

    if (!code || !code.trim() || !projectName || !projectName.trim()) {
      return res.status(400).json({ message: 'Code and project name are required' });
    }

    if (code.length > 50000) {
      return res.status(400).json({ message: 'Code is too large. Maximum 50,000 characters.' });
    }

    const project = await findOrCreateProject(req.user.id, projectName, minScoreThreshold, undefined);

    const multiAgentResult = await runMultiAgentReview(code, language || 'javascript');

    const allFindingsForDb = multiAgentResult.findings.map((f) => ({
      severity: f.severity,
      issue: f.issue,
      explanation: f.explanation,
      suggestedFix: f.suggestedFix || null,
      fileName: `[${f.agent}]`,
      lineNumber: null,
    }));

    const passedQualityGate =
      multiAgentResult.overallScore === null || multiAgentResult.overallScore >= project.minScoreThreshold;

    const embeddingText = [
      multiAgentResult.summary,
      ...multiAgentResult.findings.map((f) => `${f.severity}: ${f.issue} - ${f.explanation}`),
    ]
      .filter(Boolean)
      .join('\n');
    const embeddingVector = await generateEmbedding(embeddingText);

    const review = await prisma.review.create({
      data: {
        projectId: project.id,
        reviewType: 'multi-agent',
        overallScore: multiAgentResult.overallScore,
        passedQualityGate,
        summary: multiAgentResult.summary,
        embedding: embeddingVector ? JSON.stringify(embeddingVector) : null,
      },
    });

    if (allFindingsForDb.length > 0) {
      await prisma.reviewFinding.createMany({
        data: allFindingsForDb.map((f) => ({ ...f, reviewId: review.id })),
      });
    }

    res.status(201).json({
      message: 'Code reviewed by multi-agent system successfully',
      project,
      review,
      agentReports: multiAgentResult.agentReports,
      summary: multiAgentResult.summary,
      qualityGate: {
        passed: passedQualityGate,
        minScoreThreshold: project.minScoreThreshold,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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
  submitMultiAgent,
  submitRAGReview,
  getProjectAnalytics,
  getAIInsights,
  chatAboutReview,
  getReviewHistory,
  getReviewDetail,
  deleteReview,
  getScoreTrend,
  streamReview,
  searchReviews,
};