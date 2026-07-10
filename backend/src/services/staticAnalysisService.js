const { ESLint } = require('eslint');
const fs = require('fs');
const path = require('path');
const os = require('os');

const runStaticAnalysis = async (sourceCode, fileName = 'submitted.js') => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-'));
  const tempFilePath = path.join(tempDir, fileName.endsWith('.js') || fileName.endsWith('.ts') ? fileName : `${fileName}.js`);

  fs.writeFileSync(tempFilePath, sourceCode);

  const eslint = new ESLint({
    useEslintrc: false,
    overrideConfigFile: path.join(process.cwd(), '.eslintrc.json'),
  });

  const results = await eslint.lintFiles([tempFilePath]);

  fs.rmSync(tempDir, { recursive: true, force: true });

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