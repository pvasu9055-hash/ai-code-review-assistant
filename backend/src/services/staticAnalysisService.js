const { ESLint } = require('eslint');
const fs = require('fs');
const path = require('path');
const os = require('os');

const JS_TS_LANGUAGES = ['javascript', 'typescript'];

const runStaticAnalysis = async (sourceCode, fileName = 'submitted.js', language = 'javascript') => {
  if (!JS_TS_LANGUAGES.includes(language)) {
    return [
      {
        severity: 'info',
        issue: 'Static analysis not applicable',
        explanation: `ESLint-based static analysis only supports JavaScript and TypeScript. Skipped for ${language}.`,
        suggestedFix: null,
        fileName,
        lineNumber: null,
      },
    ];
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  const ext = language === 'typescript' ? '.ts' : '.js';
  const tempFilePath = path.join(
    tempDir,
    fileName.endsWith('.js') || fileName.endsWith('.ts') ? fileName : `${fileName}${ext}`
  );

  fs.writeFileSync(tempFilePath, sourceCode);

  const eslint = new ESLint({
    useEslintrc: false,
    overrideConfigFile: path.join(process.cwd(), '.eslintrc.json'),
  });

  let results;
  try {
    results = await eslint.lintFiles([tempFilePath]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const findings = [];
  results.forEach((result) => {
    result.messages.forEach((msg) => {
      findings.push({
        severity: msg.severity === 2 ? 'error' : 'warning',
        issue: msg.ruleId || 'unknown-rule',
        explanation: msg.message,
        suggestedFix: null,
        fileName,
        lineNumber: msg.line,
      });
    });
  });

  return findings;
};

module.exports = { runStaticAnalysis };