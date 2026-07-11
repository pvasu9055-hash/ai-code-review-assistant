const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Answers a user's question about a specific code review,
 * using the original code + findings as context.
 */
const runChatQuery = async ({ code, language, findings, complexityMetrics, chatHistory, userMessage }) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

  const findingsSummary = (findings || [])
    .map((f, i) => `${i + 1}. [${f.source}/${f.severity}] ${f.issue}: ${f.explanation}`)
    .join('\n');

  const historyText = (chatHistory || [])
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = `You are a senior code reviewer having a conversation with a developer about a specific code review you already completed. Answer clearly and concisely, referencing the actual code and findings when relevant. Do not repeat the full code back unless asked. Respond in plain text (no JSON, no markdown headers).

Language: ${language}

Code being reviewed:
${code}

Findings from the review:
${findingsSummary || 'No findings.'}

Complexity metrics: ${complexityMetrics ? JSON.stringify(complexityMetrics) : 'N/A'}

Conversation so far:
${historyText || '(none yet)'}

User's new question: ${userMessage}

Your answer:`;

  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return { reply: text.trim() };
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
    reply: 'Sorry, the AI assistant is temporarily unavailable (Gemini service overloaded). Please try again in a moment.',
  };
};

module.exports = { runChatQuery };