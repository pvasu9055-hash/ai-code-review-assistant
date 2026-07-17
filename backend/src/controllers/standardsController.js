const fs = require('fs');
const prisma = require('../config/db');
const { extractText, cleanText, chunkText } = require('../services/standardsService');
const { generateStandardEmbedding } = require('../services/embeddingService');

const uploadStandard = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const fileTypeMap = { pdf: 'pdf', docx: 'docx', txt: 'txt', md: 'txt' };
    const fileType = fileTypeMap[ext];

    if (!fileType) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Unsupported file type. Use PDF, DOCX, TXT, or MD.' });
    }

    const rawText = await extractText(req.file.path, fileType);
    const text = cleanText(rawText);

    if (!text || text.length < 20) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Could not extract meaningful text from the file' });
    }

    const chunks = chunkText(text);

    if (chunks.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'No chunks could be generated from this document' });
    }

    const standard = await prisma.codingStandard.create({
      data: {
        userId: req.user.id,
        fileName: req.file.originalname,
        fileType,
        title: req.body.title || req.file.originalname,
      },
    });

    let embeddedCount = 0;
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateStandardEmbedding(chunks[i]);
      if (!embedding) continue;

      const vectorLiteral = `[${embedding.join(',')}]`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "StandardChunk" (id, "standardId", content, "chunkIndex", embedding, "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4::vector, now())`,
        standard.id,
        chunks[i],
        i,
        vectorLiteral
      );
      embeddedCount++;
    }

    fs.unlinkSync(req.file.path);

    res.status(201).json({
      message: 'Coding standard uploaded and indexed successfully',
      standard,
      totalChunks: chunks.length,
      embeddedChunks: embeddedCount,
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: error.message });
  }
};

const getStandards = async (req, res) => {
  try {
    const standards = await prisma.codingStandard.findMany({
      where: { userId: req.user.id },
      include: { _count: { select: { chunks: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(standards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteStandard = async (req, res) => {
  try {
    const { id } = req.params;
    const standard = await prisma.codingStandard.findUnique({ where: { id } });

    if (!standard) return res.status(404).json({ message: 'Standard not found' });
    if (standard.userId !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    await prisma.codingStandard.delete({ where: { id } });

    res.json({ message: 'Standard deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { uploadStandard, getStandards, deleteStandard };