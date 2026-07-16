const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const LANGUAGE_GUIDANCE = {
  javascript: 'Pay attention to var vs let/const, missing semicolons, == vs ===, unhandled promises, and callback error handling.',
  typescript: 'Pay attention to any usage, missing type annotations, unsafe type assertions, and improper null/undefined handling.',
  python: 'Pay attention to PEP8 style, mutable default arguments, bare except clauses, and missing type hints.',
  java: 'Pay attention to null pointer risks, resource leaks (unclosed streams), improper exception handling, and access modifier misuse.',
};

const buildReviewPrompt = (code, language, guidance) => {
  return `You are a senior code reviewer. Review the following ${language} code for bugs, security issues, performance problems, and code quality. Respond ONLY in valid JSON, no markdown, no extra text, in this exact format:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence summary of the code quality>",
  "findings": [
    {
      "severity": "error" | "warning" | "info",
      "issue": "<short issue title>",
      "explanation": "<what's wrong>",
      "suggestedFix": "<how to fix it>"
    }
  ]
}
${guidance}
Code to review:
${code}`;
};

const runAIReview = async (code, language = 'javascript') => {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

  const normalizedLang = language.toLowerCase();
  const guidance = LANGUAGE_GUIDANCE[normalizedLang] || '';

  const prompt = buildReviewPrompt(code, language, guidance);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json|```/g, '').trim();

      try {
        return JSON.parse(cleaned);
      } catch (parseErr) {
        return {
          overallScore: null,
          summary: 'AI review completed but response could not be parsed.',
          findings: [],
        };
      }
    } catch (err) {
      if (err.status === 503 && attempt < 3) {
        await sleep(2000 * attempt);
        continue;
      }
      break;
    }
  }

  return {
    overallScore: null,
    summary: 'AI review temporarily unavailable (Gemini service overloaded).',
    findings: [],
  };
};

const buildDiffReviewPrompt = (fileName, snippet, language, guidance) => {
  return `You are a senior code reviewer doing a pull-request-style review. You are shown ONLY the changed/added lines from a diff — not the whole file. Focus your review strictly on these changed lines. Respond ONLY in valid JSON, no markdown, no extra text, in this exact format:
{
  "fileName": "${fileName}",
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence summary of the change quality>",
  "findings": [
    {
      "severity": "error" | "warning" | "info",
      "issue": "<short issue title>",
      "explanation": "<what's wrong>",
      "suggestedFix": "<how to fix it>",
      "lineNumber": <the line number from the snippet, if applicable, else null>
    }
  ]
}
${guidance}
Changed lines (format is "lineNumber: code"):
${snippet}`;
};

const runDiffAwareReview = async (fileName, snippet, language = 'javascript') => {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

  const normalizedLang = language.toLowerCase();
  const guidance = LANGUAGE_GUIDANCE[normalizedLang] || '';

  const prompt = buildDiffReviewPrompt(fileName, snippet, language, guidance);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json|```/g, '').trim();

      try {
        return JSON.parse(cleaned);
      } catch (parseErr) {
        return {
          fileName,
          overallScore: null,
          summary: 'AI review completed but response could not be parsed.',
          findings: [],
        };
      }
    } catch (err) {
      if (err.status === 503 && attempt < 3) {
        await sleep(2000 * attempt);
        continue;
      }
      break;
    }
  }

  return {
    fileName,
    overallScore: null,
    summary: 'AI review temporarily unavailable (Gemini service overloaded).',
    findings: [],
  };
};

const runDiffAwareReviewBatch = async (fileSnippets, language = 'javascript') => {
  const results = [];

  for (const file of fileSnippets) {
    if (!file.snippet || file.snippet.trim() === '') continue;
    const review = await runDiffAwareReview(file.fileName, file.snippet, language);
    results.push({ ...review, changeSummary: file.changeSummary });
  }

  const totalFindings = results.reduce((sum, r) => sum + (r.findings?.length || 0), 0);
  const scoredResults = results.filter((r) => typeof r.overallScore === 'number');
  const overallScore =
    scoredResults.length > 0
      ? Math.round(scoredResults.reduce((sum, r) => sum + r.overallScore, 0) / scoredResults.length)
      : null;

  return {
    overallScore,
    totalFindings,
    fileReviews: results,
  };
};

module.exports = { runAIReview, runDiffAwareReview, runDiffAwareReviewBatch };