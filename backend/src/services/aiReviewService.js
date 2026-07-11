const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runAIReview = async (sourceCode, language = 'javascript') => {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

  const prompt = `You are a senior code reviewer. Review the following ${language} code and respond ONLY in valid JSON, no markdown, no extra text, in this exact format:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence summary of code quality>",
  "findings": [
    {
      "severity": "error" | "warning" | "info",
      "issue": "<short issue title>",
      "explanation": "<what's wrong>",
      "suggestedFix": "<how to fix it>"
    }
  ]
}

Code to review:
${sourceCode}`;

  let lastError;

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
      lastError = err;
      if (err.status === 503 && attempt < 3) {
        await sleep(2000 * attempt);
        continue;
      }
      break;
    }
  }

  return {
    overallScore: null,
    summary: 'AI review temporarily unavailable (Gemini service overloaded). Static analysis results are still shown below.',
    findings: [],
  };
};

module.exports = { runAIReview };