const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// @desc  Generate documentation (JSDoc-style) for functions/classes in the given code
const runDocGeneration = async (sourceCode, language = 'javascript') => {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

  const prompt = `You are a documentation generator. Analyze the following ${language} code and generate documentation for every function and class found. Respond ONLY in valid JSON, no markdown, no extra text, in this exact format:
{
  "documentation": [
    {
      "name": "<function or class name>",
      "type": "function" | "class" | "method",
      "description": "<what it does, 1-2 sentences>",
      "params": [
        { "name": "<param name>", "type": "<inferred type>", "description": "<what it's for>" }
      ],
      "returns": "<description of return value, or null if none>",
      "docblock": "<a ready-to-paste JSDoc-style comment block as a single string with \\n for line breaks>"
    }
  ]
}

If there are no functions or classes, return { "documentation": [] }.

Code to document:
${sourceCode}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json|```/g, '').trim();

      try {
        return JSON.parse(cleaned);
      } catch (parseErr) {
        return { documentation: [] };
      }
    } catch (err) {
      if (err.status === 503 && attempt < 3) {
        await sleep(2000 * attempt);
        continue;
      }
      break;
    }
  }

  return { documentation: [] };
};

module.exports = { runDocGeneration };