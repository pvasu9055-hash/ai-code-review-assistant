const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Extra guidance appended to the prompt depending on language, so the model
// focuses on what actually matters for that language instead of generic advice.
const LANGUAGE_GUIDANCE = {
  sql: `
Since this is SQL, focus specifically on:
- SQL injection risk (string concatenation instead of parameterized queries/prepared statements)
- Missing or incorrect indexes on columns used in WHERE/JOIN/ORDER BY
- Normalization issues (redundant data, missing foreign keys, poor schema design)
- Dangerous DDL/DML run without safeguards (DROP, TRUNCATE, DELETE/UPDATE without WHERE)
- Transaction handling and isolation level concerns
- N+1 query patterns if multiple queries are shown`,
  python: `
Since this is Python, focus specifically on:
- Type hints and their absence
- Mutable default arguments
- Exception handling (bare except, swallowing errors)
- PEP 8 style issues worth flagging
- Use of eval/exec, pickle on untrusted data, or shell=True in subprocess calls`,
  java: `
Since this is Java, focus specifically on:
- Null pointer risks and missing Optional usage
- Resource leaks (unclosed streams/connections not using try-with-resources)
- Exception handling anti-patterns (catching generic Exception, swallowing exceptions)
- Thread safety issues in shared state`,
  go: `
Since this is Go, focus specifically on:
- Unchecked errors (ignoring returned error values)
- Goroutine leaks and missing context cancellation
- Improper use of defer in loops
- Race conditions on shared state`,
  rust: `
Since this is Rust, focus specifically on:
- Unnecessary use of unwrap()/expect() that could panic in production
- Unsafe blocks and whether they're justified
- Ownership/borrowing patterns that could be simplified
- Error handling via Result vs panics`,
  c: `
Since this is C, focus specifically on:
- Buffer overflows and unchecked array bounds
- Memory management (missing free, use-after-free, double free)
- Null pointer dereference risks
- Unsafe string functions (strcpy, gets, sprintf without bounds)`,
  cpp: `
Since this is C++, focus specifically on:
- Memory management (raw new/delete vs smart pointers)
- Resource management (RAII violations)
- Undefined behavior risks
- Const-correctness`,
  csharp: `
Since this is C#, focus specifically on:
- IDisposable usage and missing using statements
- Null reference risks (nullable reference types)
- LINQ performance issues
- Async/await misuse (blocking on async code)`,
  php: `
Since this is PHP, focus specifically on:
- SQL injection and XSS risks
- Unsafe use of eval, include/require with user input
- Type juggling issues
- Deprecated function usage`,
  ruby: `
Since this is Ruby, focus specifically on:
- Mass assignment / unsafe parameter handling
- N+1 query patterns (if ActiveRecord-like code)
- Metaprogramming risks
- Exception handling anti-patterns`,
};

const runAIReview = async (sourceCode, language = 'javascript') => {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

  const normalizedLang = language.toLowerCase();
  const guidance = LANGUAGE_GUIDANCE[normalizedLang] || '';

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
${guidance}
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