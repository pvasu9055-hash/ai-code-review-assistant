const acorn = require('acorn');
const walk = require('acorn-walk');

/**
 * Computes cyclomatic complexity, function/class counts, and LOC
 * for a given piece of JS/TS code using acorn AST parsing.
 * For non-JS/TS languages, returns basic LOC only with an info finding.
 */

const JS_TS_LANGUAGES = ['javascript', 'typescript'];

function countLinesOfCode(code) {
  const lines = code.split('\n');
  let loc = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith('//')) continue;
    if (trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;
    loc++;
  }
  return loc;
}

function getComplexityRating(score) {
  if (score <= 5) return 'low';
  if (score <= 10) return 'moderate';
  if (score <= 20) return 'high';
  return 'very-high';
}

function analyzeFunctionComplexity(node) {
  let complexity = 1; // base complexity

  walk.simple(node, {
    IfStatement() { complexity++; },
    ForStatement() { complexity++; },
    ForInStatement() { complexity++; },
    ForOfStatement() { complexity++; },
    WhileStatement() { complexity++; },
    DoWhileStatement() { complexity++; },
    CatchClause() { complexity++; },
    ConditionalExpression() { complexity++; },
    LogicalExpression(n) {
      if (n.operator === '&&' || n.operator === '||') complexity++;
    },
    SwitchCase(n) {
      if (n.test !== null) complexity++;
    },
  });

  return complexity;
}

function getFunctionName(node, index) {
  if (node.id && node.id.name) return node.id.name;
  if (node.key && node.key.name) return node.key.name;
  return `anonymous_${index}`;
}

async function runComplexityAnalysis(code, fileName = 'submitted.js', language = 'javascript') {
  const loc = countLinesOfCode(code);

  if (!JS_TS_LANGUAGES.includes(language)) {
    return {
      loc,
      functionCount: 0,
      classCount: 0,
      fileComplexity: 0,
      fileComplexityRating: 'unknown',
      findings: [
        {
          severity: 'info',
          issue: 'Complexity analysis not applicable',
          explanation: `AST-based complexity analysis only supports JavaScript and TypeScript. Skipped for ${language}. Line count is still shown above.`,
          suggestedFix: null,
          fileName,
          lineNumber: null,
        },
      ],
    };
  }

  const findings = [];
  let functionCount = 0;
  let classCount = 0;
  let functions = [];

  let ast;
  try {
    ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
      allowReturnOutsideFunction: true,
      allowImportExportEverywhere: true,
    });
  } catch (err) {
    return {
      loc,
      functionCount: 0,
      classCount: 0,
      fileComplexity: 0,
      fileComplexityRating: 'unknown',
      findings: [
        {
          severity: 'info',
          issue: 'Complexity analysis skipped',
          explanation: `Could not parse file for complexity metrics: ${err.message}`,
          suggestedFix: null,
          fileName,
          lineNumber: null,
        },
      ],
    };
  }

  let totalComplexity = 0;
  let fnIndex = 0;

  walk.simple(ast, {
    FunctionDeclaration(node) {
      fnIndex++;
      functionCount++;
      const complexity = analyzeFunctionComplexity(node);
      totalComplexity += complexity;
      functions.push({ name: getFunctionName(node, fnIndex), complexity, line: node.loc ? node.loc.start.line : null });
    },
    FunctionExpression(node) {
      fnIndex++;
      functionCount++;
      const complexity = analyzeFunctionComplexity(node);
      totalComplexity += complexity;
      functions.push({ name: getFunctionName(node, fnIndex), complexity, line: node.loc ? node.loc.start.line : null });
    },
    ArrowFunctionExpression(node) {
      fnIndex++;
      functionCount++;
      const complexity = analyzeFunctionComplexity(node);
      totalComplexity += complexity;
      functions.push({ name: getFunctionName(node, fnIndex), complexity, line: node.loc ? node.loc.start.line : null });
    },
    ClassDeclaration() {
      classCount++;
    },
    ClassExpression() {
      classCount++;
    },
  });

  const fileComplexity = totalComplexity;
  const fileComplexityRating = getComplexityRating(fileComplexity);

  for (const fn of functions) {
    if (fn.complexity > 10) {
      findings.push({
        severity: fn.complexity > 20 ? 'error' : 'warning',
        issue: `High cyclomatic complexity in function "${fn.name}" (${fn.complexity})`,
        explanation: `This function has a cyclomatic complexity of ${fn.complexity}, which makes it harder to test and maintain. Consider breaking it into smaller functions.`,
        suggestedFix: 'Extract nested conditionals/loops into separate helper functions to reduce branching.',
        fileName,
        lineNumber: fn.line,
      });
    }
  }

  if (fileComplexityRating === 'high' || fileComplexityRating === 'very-high') {
    findings.push({
      severity: fileComplexityRating === 'very-high' ? 'error' : 'warning',
      issue: `Overall file complexity is ${fileComplexityRating} (score: ${fileComplexity})`,
      explanation: 'The file has a high combined cyclomatic complexity across its functions, indicating it may be doing too much.',
      suggestedFix: 'Consider splitting this file into smaller, focused modules.',
      fileName,
      lineNumber: null,
    });
  }

  if (loc > 300) {
    findings.push({
      severity: 'warning',
      issue: `File is large (${loc} lines of code)`,
      explanation: 'Large files are harder to navigate and maintain.',
      suggestedFix: 'Split unrelated logic into separate files/modules.',
      fileName,
      lineNumber: null,
    });
  }

  return {
    loc,
    functionCount,
    classCount,
    fileComplexity,
    fileComplexityRating,
    findings,
  };
}

module.exports = { runComplexityAnalysis };