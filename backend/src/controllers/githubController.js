const prisma = require('../config/db');
const { verifyGithubSignature } = require('../services/githubWebhookVerify');
const { fetchPRDiff, postPRComment } = require('../services/githubService');
const { parseUnifiedDiff, buildReviewSnippets } = require('../services/diffAnalysisService');
const { runDiffAwareReviewBatch } = require('../services/aiReviewService');
const { generateEmbedding } = require('../services/embeddingService');

// @desc  Receive GitHub PR webhook, run diff review, post results as PR comment
// @route POST /api/github/webhook
const handleGithubWebhook = async (req, res) => {
  try {
    if (!verifyGithubSignature(req)) {
      return res.status(401).json({ message: 'Invalid webhook signature' });
    }

    const event = req.headers['x-github-event'];

    if (event !== 'pull_request') {
      return res.status(200).json({ message: `Ignored event: ${event}` });
    }

    const { action, pull_request: pr, repository } = req.body;

    if (!['opened', 'synchronize', 'reopened'].includes(action)) {
      return res.status(200).json({ message: `Ignored action: ${action}` });
    }

    // Respond to GitHub immediately (avoid webhook timeout); do the review async
    res.status(202).json({ message: 'Webhook received, processing review' });

    const owner = repository.owner.login;
    const repo = repository.name;
    const pullNumber = pr.number;
    const repoFullName = repository.full_name; // e.g. "yourname/yourrepo"
    const repoHtmlUrl = repository.html_url;   // e.g. "https://github.com/yourname/yourrepo"

    const diff = await fetchPRDiff(owner, repo, pullNumber);
    const parsedFiles = parseUnifiedDiff(diff);

    if (parsedFiles.length === 0) {
      await postPRComment(owner, repo, pullNumber, '⚠️ AI Review: could not parse any changed files in this diff.');
      return;
    }

    const fileSnippets = buildReviewSnippets(parsedFiles);
    const diffReviewResult = await runDiffAwareReviewBatch(fileSnippets, 'javascript');

    // Look up an EXISTING project the user connected (matches by githubUrl). Never create one here.
    const project = await prisma.project.findFirst({
      where: {
        OR: [{ githubUrl: repoHtmlUrl }, { githubUrl: `${repoHtmlUrl}.git` }, { githubUrl: repoFullName }],
      },
    });

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

    if (project) {
      const embeddingText = diffReviewResult.fileReviews.map((r) => `${r.fileName}: ${r.summary}`).join('\n');
      const embeddingVector = await generateEmbedding(embeddingText);

      const review = await prisma.review.create({
        data: {
          projectId: project.id,
          reviewType: 'diff',
          overallScore: diffReviewResult.overallScore,
          passedQualityGate:
            diffReviewResult.overallScore === null ||
            diffReviewResult.overallScore >= (project.minScoreThreshold ?? 70),
          summary: `PR #${pullNumber}: ${diffReviewResult.totalFindings} finding(s).`,
          embedding: embeddingVector ? JSON.stringify(embeddingVector) : null,
        },
      });

      if (allFindingsForDb.length > 0) {
        await prisma.reviewFinding.createMany({
          data: allFindingsForDb.map((f) => ({ ...f, reviewId: review.id })),
        });
      }
    }
    // If no matching project, we just skip DB save — comment still gets posted below.

    const commentBody = buildCommentMarkdown(diffReviewResult, !!project);
    await postPRComment(owner, repo, pullNumber, commentBody);
  } catch (error) {
    console.error('GitHub webhook error:', error.message);
  }
};

const buildCommentMarkdown = (diffReviewResult, savedToDb) => {
  let md = `## 🤖 AI Code Review\n\n`;
  md += `**Score:** ${diffReviewResult.overallScore ?? 'N/A'}/100 | **Findings:** ${diffReviewResult.totalFindings}\n\n`;

  diffReviewResult.fileReviews.forEach((fileReview) => {
    md += `### 📄 ${fileReview.fileName}\n`;
    if (!fileReview.findings || fileReview.findings.length === 0) {
      md += `No issues found.\n\n`;
      return;
    }
    fileReview.findings.forEach((f) => {
      md += `- **[${f.severity}]** ${f.issue}${f.lineNumber ? ` (line ${f.lineNumber})` : ''}\n  ${f.explanation}\n`;
      if (f.suggestedFix) md += `  💡 Suggested fix: \`${f.suggestedFix}\`\n`;
    });
    md += `\n`;
  });

  if (!savedToDb) {
    md += `_ℹ️ This repo isn't linked to a project in the dashboard yet, so this review wasn't saved to history._\n`;
  }

  return md;
};

module.exports = { handleGithubWebhook };