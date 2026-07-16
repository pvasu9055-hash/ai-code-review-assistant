const parseDiff = require("parse-diff");

/**
 * Parses a unified diff string (like what GitHub PR API returns)
 * into a structured format: per-file changed lines only.
 */
function parseUnifiedDiff(diffText) {
  const files = parseDiff(diffText);

  return files.map((file) => {
    const addedLines = [];
    const removedLines = [];

    file.chunks.forEach((chunk) => {
      chunk.changes.forEach((change) => {
        if (change.type === "add") {
          addedLines.push({
            lineNumber: change.ln,
            content: change.content.slice(1), // strip leading '+'
          });
        } else if (change.type === "del") {
          removedLines.push({
            lineNumber: change.ln,
            content: change.content.slice(1), // strip leading '-'
          });
        }
      });
    });

    return {
      fileName: file.to || file.from,
      isNew: file.new,
      isDeleted: file.deleted,
      addedLines,
      removedLines,
      addedLineCount: addedLines.length,
      removedLineCount: removedLines.length,
    };
  });
}

/**
 * Builds a compact "review-ready" snippet per file:
 * only the changed lines, with surrounding line numbers,
 * so the AI reviews deltas instead of the whole file.
 */
function buildReviewSnippets(parsedFiles) {
  return parsedFiles.map((file) => {
    const snippet = file.addedLines
      .map((l) => `${l.lineNumber}: ${l.content}`)
      .join("\n");

    return {
      fileName: file.fileName,
      changeSummary: `+${file.addedLineCount} / -${file.removedLineCount}`,
      snippet,
    };
  });
}

module.exports = { parseUnifiedDiff, buildReviewSnippets };