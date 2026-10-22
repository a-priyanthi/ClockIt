const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { db } = require('./db');

const PDF_FILES = [
  'Aero.pdf',
  'Auto.pdf',
  'CSE.pdf',
  'ECE.pdf',
  'EI.pdf',
  'IT.pdf',
  'Prod.pdf',
  'RPT.pdf'
];

const cacheDir = path.join(__dirname, '..', '..', 'cache_pdf');

function cleanText(t) {
  if (!t) return '';
  return t
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
    .replace(/\b\d+\s+of\s+\d+\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSyllabusChunk(rawText, code, name) {
  let ltpc = '3 0 0 3';
  const ltpcMatch = rawText.match(/L\s+T\s+P\s+C\s*[\n\r]+([\d\s\.]{5,15})/i);
  if (ltpcMatch) ltpc = ltpcMatch[1].replace(/\s+/g, ' ').trim();

  let totalPeriods = '45 PERIODS';
  const totMatch = rawText.match(/TOTAL\s*:\s*([^\n\r]+)/i);
  if (totMatch) totalPeriods = totMatch[1].trim();

  let objectives = [];
  const objMatch = rawText.match(/COURSE OBJECTIVES\s*:?([\s\S]*?)(?=UNIT\s+I\b|$)/i);
  if (objMatch) {
    objectives = objMatch[1]
      .split(/[\n\r]+/)
      .map(s => s.replace(/^[•\-\*\d\.\)\s]+/, '').trim())
      .filter(s => s.length > 5 && !s.includes('of 263') && !s.includes('of 200'));
  }

  const units = [];
  const unitRegex = /(UNIT\s+[IVX]+)\s+([^\n\r\d]+?)(?:\s+(\d+))?[\n\r]+([\s\S]*?)(?=(?:UNIT\s+[IVX]+|TOTAL\s*:|COURSE OUTCOMES|LEARNING OUTCOMES|REFERENCES|TEXTBOOKS|$))/gi;
  let um;
  while ((um = unitRegex.exec(rawText)) !== null) {
    const unitTag = um[1].toUpperCase();
    const unitTitle = cleanText(um[2]);
    const periods = um[3] ? (um[3].trim() + ' Periods') : '9 Periods';
    let body = um[4].trim();

    let practicals = [];
    const labMatch = body.match(/(?:LAB ACTIVITY|PRACTICALS|LAB EXPERIMENTS|LIST OF EXPERIMENTS)\s*:?\s*([\s\S]*)$/i);
    let topics = body;
    if (labMatch) {
      topics = body.slice(0, labMatch.index).trim();
      practicals = labMatch[1]
        .split(/[\n\r;]+/)
        .map(p => cleanText(p.replace(/^[•\-\*\d\.\)\s]+/, '')))
        .filter(p => p.length > 5 && !p.toLowerCase().includes('of 263') && !p.toLowerCase().includes('of 300'));
    }
    topics = cleanText(topics);

    units.push({
      unit: unitTag,
      title: unitTitle,
      periods: periods,
      topics: topics,
      practicals: practicals
    });
  }

  let outcomes = [];
  const outMatch = rawText.match(/(?:COURSE OUTCOMES|LEARNING OUTCOMES)\s*:?([\s\S]*?)(?=(?:REFERENCES|TEXTBOOKS|CO - PO|MAPPING|$))/i);
  if (outMatch) {
    outcomes = outMatch[1]
      .split(/[\n\r]+/)
      .map(s => cleanText(s.replace(/^[•\-\*\d\.\)\s]+/, '')))
      .filter(s => s.length > 8 && !s.toLowerCase().startsWith('by the end') && !s.toLowerCase().startsWith('at the end') && !s.includes('of 263'));
  }

  let references = [];
  const refMatch = rawText.match(/(?:REFERENCES|TEXTBOOKS)\s*:?([\s\S]*?)(?=(?:CO - PO|MAPPING|$))/i);
  if (refMatch) {
    references = refMatch[1]
      .split(/[\n\r]+/)
      .map(s => cleanText(s.replace(/^[•\-\*\d\.\)\s]+/, '')))
      .filter(s => s.length > 8 && !s.includes('of 263') && !s.includes('of 200'));
  }

  return {
    courseCode: code,
    courseTitle: name,
    ltpc,
    totalPeriods,
    objectives: objectives.slice(0, 5),
    units: units.slice(0, 5),
    courseOutcomes: outcomes.slice(0, 6),
    references: references.slice(0, 5)
  };
}

async function extractAllDetailedSyllabi() {
  console.log('[Syllabus Extractor] Starting verbatim syllabus extraction from official Anna University PDFs...');
  const syllabusMap = new Map();

  for (const f of PDF_FILES) {
    const filePath = path.join(cacheDir, f);
    if (!fs.existsSync(filePath)) {
      console.warn(`[Syllabus Extractor] Skipping ${f} (not found in cache_pdf)`);
      continue;
    }

    try {
      console.log(`[Syllabus Extractor] Reading ${f}...`);
      const buf = fs.readFileSync(filePath);
      const parser = new PDFParse(new Uint8Array(buf));
      await parser.load();
      const textRes = await parser.getText();
      const text = typeof textRes === 'string' ? textRes : (textRes.text || '');

      const courseRegex = /([A-Z]{2}\d{2}[A-Z0-9]{2,3})\s+([A-Z\s\(\)\/\-\&]{4,80})\s+L\s+T\s+P\s+C/g;
      let matches = [];
      let m;
      while ((m = courseRegex.exec(text)) !== null) {
        matches.push({
          code: m[1],
          name: cleanText(m[2]),
          index: m.index
        });
      }

      console.log(`[Syllabus Extractor] Found ${matches.length} syllabus sections in ${f}`);

      for (let i = 0; i < matches.length; i++) {
        const cur = matches[i];
        if (syllabusMap.has(cur.code)) continue; // Already extracted with full details

        const startIdx = cur.index;
        const endIdx = (i + 1 < matches.length) ? matches[i + 1].index : (startIdx + 7000);
        const chunk = text.slice(startIdx, endIdx);

        const syl = parseSyllabusChunk(chunk, cur.code, cur.name);
        if (syl.units.length > 0) {
          syllabusMap.set(cur.code, syl);
        }
      }
    } catch (err) {
      console.error(`[Syllabus Extractor] Error reading ${f}:`, err.message);
    }
  }

  console.log(`[Syllabus Extractor] Total authentic course syllabi extracted: ${syllabusMap.size}`);

  // Now update database tables: official_curriculum and academic_subjects
  db.exec('BEGIN');
  const updateCurriculum = db.prepare('UPDATE official_curriculum SET syllabus_json = ? WHERE course_code = ?');
  const updateSubjects = db.prepare('UPDATE academic_subjects SET syllabus_json = ? WHERE code = ?');

  let updatedCurriculumCount = 0;
  for (const [code, syl] of syllabusMap.entries()) {
    const jsonStr = JSON.stringify(syl);
    const res1 = updateCurriculum.run(jsonStr, code);
    if (res1.changes > 0) updatedCurriculumCount += res1.changes;
    updateSubjects.run(jsonStr, code);
  }
  db.exec('COMMIT');

  console.log(`[Syllabus Extractor] Successfully updated ${updatedCurriculumCount} curriculum entries with verbatim syllabus!`);
  return syllabusMap.size;
}

module.exports = { extractAllDetailedSyllabi };

if (require.main === module) {
  extractAllDetailedSyllabi().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
