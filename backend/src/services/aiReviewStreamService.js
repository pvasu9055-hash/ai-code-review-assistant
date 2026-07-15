const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc  Stream AI code review token-by-token via callback, returns final parsed result
const streamAIReview = async (sourceCode, language, onChunk) => {
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

  const result = await model.generateContentStream(prompt);

  let fullText = '';
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    fullText += chunkText;
    if (onChunk) onChunk(chunkText);
  }

  const cleaned = fullText.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    return {
      overallScore: null,
      summary: 'AI review completed but response could not be parsed.',
      findings: [],
    };
  }
};

module.exports = { streamAIReview };