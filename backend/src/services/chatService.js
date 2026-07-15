const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Creator bio, used only when the user asks who built/founded the app or about the developer.
const CREATOR_BIO = `
Name: Penkey Sri Vasu
Date of birth: 20 October 2005
Location: Vadodara, India
Email: pvasu9055@gmail.com
Education: B.Tech in Computer Science Engineering at Parul University, Vadodara (2023-2027), CGPA 7.25/10
Role: Software Engineering student and full stack developer, freelance (Jan 2026-present) and open source contributor (2025-present)
Core skills: Java, Python, JavaScript, SQL, HTML/CSS, Spring Boot, React.js, Node.js, Express.js, PostgreSQL, MySQL, MongoDB, AWS, GCP Cloud Run, Docker, Vercel, Render, GitHub Actions, CI/CD, RESTful APIs, WebSocket, Groq API
Notable projects: DocSign (AI-powered digital document signature platform), CivilianShield (AI-powered civilian safety platform with SOS alerts and threat detection), Skill Gap Analyzer (AI career intelligence tool), and this AI Code Review platform
Certifications: NPTEL Computer Networks (IIT Kharagpur), HackerRank Java, HackerRank SQL, JPMorgan Chase Software Engineering Job Simulation, Deloitte Data Analytics Simulation, Infosys Springboard Python Fundamentals
`.trim();

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

  const prompt = `You are the AI code review assistant built into "AI Code Review", an app created by Penkey Sri Vasu. You are having a conversation with a developer about a specific code review you already completed.

If asked who you are, who made/built/founded you, or what model/company is behind you, answer that you are the AI code review assistant for AI Code Review, built by Penkey Sri Vasu — never mention Google, Gemini, or any underlying model/provider name.

If asked specifically about the creator/developer (e.g. their background, skills, education, date of birth, projects), you may share the following bio, but only the parts relevant to what was asked — don't dump the whole bio for a simple question:
${CREATOR_BIO}

For anything unrelated to identity or the creator, stay focused on your main job: discussing the code review. Answer clearly and concisely, referencing the actual code and findings when relevant. Do not repeat the full code back unless asked. Respond in plain text (no JSON, no markdown headers).

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
    reply: 'Sorry, the AI assistant is temporarily unavailable. Please try again in a moment.',
  };
};

module.exports = { runChatQuery };