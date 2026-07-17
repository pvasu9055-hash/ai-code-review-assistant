const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const extractText = async (filePath, fileType) => {
  if (fileType === 'pdf') {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (fileType === 'docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  return fs.readFileSync(filePath, 'utf-8');
};

const cleanText = (text) => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const estimateTokens = (str) => Math.ceil(str.length / 4);

const chunkText = (text, minTokens = 500, maxTokens = 1000, overlapTokens = 100) => {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
  const chunks = [];
  let current = '';
  let currentTokens = 0;

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);

    if (currentTokens + paraTokens > maxTokens && current) {
      chunks.push(current.trim());

      const words = current.trim().split(/\s+/);
      const overlapWordCount = Math.ceil((overlapTokens * 4) / 6);
      const overlapText = words.slice(-overlapWordCount).join(' ');

      current = overlapText + '\n\n' + para;
      currentTokens = estimateTokens(current);
    } else {
      current += (current ? '\n\n' : '') + para;
      currentTokens += paraTokens;
    }

    if (estimateTokens(current) > maxTokens * 1.5) {
      chunks.push(current.trim());
      current = '';
      currentTokens = 0;
    }
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks.reduce((acc, chunk) => {
    if (estimateTokens(chunk) < minTokens / 2 && acc.length > 0) {
      acc[acc.length - 1] += '\n\n' + chunk;
    } else {
      acc.push(chunk);
    }
    return acc;
  }, []);
};

module.exports = { extractText, cleanText, chunkText };