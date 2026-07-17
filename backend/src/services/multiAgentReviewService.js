const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Each agent gets a narrow, specialized focus so it doesn't overlap with the others
const AGENT_CONFIG = {
  bug: {
    label: 'Bug Detection',
    focus:
      'Focus ONLY on functional bugs: logic errors, off-by-one errors, incorrect conditionals, null/undefined handling, race conditions, and edge cases that would cause incorrect behavior. Do NOT comment on security, performance, or style.',
  },
  security: {
    label: 'Security Review',
    focus:
      'Focus ONLY on security vulnerabilities: injection risks (SQL/NoSQL/command), XSS, insecure deserialization, hardcoded secrets, missing input validation, broken auth/access control, and unsafe use of eval or similar. Do NOT comment on bugs unrelated to security, performance, or style.',
  },
  performance: {
    label: 'Performance Review',
    focus:
      'Focus ONLY on performance issues: unnecessary loops/re-renders, N+1 queries, blocking synchronous calls, memory leaks, inefficient data structures, and missing memoization/caching where clearly needed. Do NOT comment on security, correctness bugs, or style.',
  },
  quality: {
    label: 'Code Quality',
    focus:
      'Focus ONLY on code quality: readability, naming, duplication, function length/complexity, adherence to language conventions, and maintainability. Do NOT comment on bugs, security, or performance.',
  },
};

const LANGUAGE_GUIDANCE = {
  javascript: 'Pay attention to var vs let/const, missing semicolons, == vs ===, unhandled promises, and callback error handling.',
  typescript: 'Pay attention to any usage, missing type annotations, unsafe type assertions, and improper null/undefined handling.',
  python: 'Pay attention to PEP8 style, mutable default arguments, bare except clauses, and missing type hints.',
  java: 'Pay attention to null pointer risks, resource leaks (unclosed streams), improper exception handling, and access modifier misuse.',
};

const buildAgentPrompt = (agentType, code, language, guidance) => {
  const config = AGENT_CONFIG[agentType];
  return `You are a specialized ${config.label} agent, one of several agents reviewing this ${language} code in parallel. ${config.focus}

Respond ONLY in valid JSON, no markdown, no extra text, in this exact format:
{
  "agentScore": <number 0-100, how well the code does in YOUR specific focus area only>,
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

const callGemini = async (prompt, fallbackShape) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json|```/g, '').trim();

      try {
        return JSON.parse(cleaned);
      } catch (parseErr) {
        return fallbackShape('AI review completed but response could not be parsed.');
      }
    } catch (err) {
      if (err.status === 503 && attempt < 3) {
        await sleep(2000 * attempt);
        continue;
      }
      break;
    }
  }

  return fallbackShape('AI review temporarily unavailable (Gemini service overloaded).');
};

const runSingleAgent = async (agentType, code, language) => {
  const normalizedLang = language.toLowerCase();
  const guidance = LANGUAGE_GUIDANCE[normalizedLang] || '';
  const prompt = buildAgentPrompt(agentType, code, language, guidance);

  const result = await callGemini(prompt, (message) => ({
    agentScore: null,
    findings: [],
    error: message,
  }));

  return {
    agentType,
    label: AGENT_CONFIG[agentType].label,
    agentScore: result.agentScore ?? null,
    findings: (result.findings || []).map((f) => ({ ...f, agent: agentType })),
  };
};

// Coordinator: runs all 4 specialist agents in parallel
const runMultiAgentReview = async (code, language = 'javascript') => {
  const agentTypes = Object.keys(AGENT_CONFIG); // ['bug', 'security', 'performance', 'quality']

  const agentResults = await Promise.all(
    agentTypes.map((agentType) => runSingleAgent(agentType, code, language))
  );

  const summary = await runSummaryAgent(agentResults, language);

  const allFindings = agentResults.flatMap((r) => r.findings);
  const scoredAgents = agentResults.filter((r) => typeof r.agentScore === 'number');
  const overallScore =
    scoredAgents.length > 0
      ? Math.round(scoredAgents.reduce((sum, r) => sum + r.agentScore, 0) / scoredAgents.length)
      : null;

  return {
    overallScore,
    summary: summary.summary,
    agentReports: agentResults.map((r) => ({
      agentType: r.agentType,
      label: r.label,
      agentScore: r.agentScore,
      findingsCount: r.findings.length,
      findings: r.findings,
    })),
    findings: allFindings,
    totalFindings: allFindings.length,
  };
};

// Summary agent: takes all 4 agent reports and writes one cohesive human-readable summary
const runSummaryAgent = async (agentResults, language) => {
  const reportsText = agentResults
    .map((r) => {
      const findingsText =
        r.findings.length > 0
          ? r.findings.map((f) => `  - [${f.severity}] ${f.issue}: ${f.explanation}`).join('\n')
          : '  - No issues found';
      return `${r.label} (score: ${r.agentScore ?? 'N/A'}):\n${findingsText}`;
    })
    .join('\n\n');

  const prompt = `You are a lead engineer combining reports from 4 specialist review agents (Bug Detection, Security, Performance, Code Quality) into one final summary for a ${language} code submission. Respond ONLY in valid JSON, no markdown, no extra text, in this exact format:
{
  "summary": "<3-5 sentence overview combining the most important findings across all agents, written for a developer reading a PR review>"
}

Agent reports:
${reportsText}`;

  const result = await callGemini(prompt, (message) => ({ summary: message }));
  return { summary: result.summary || 'Summary unavailable.' };
};

module.exports = { runMultiAgentReview };