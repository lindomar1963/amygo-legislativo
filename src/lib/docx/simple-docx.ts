import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type ParagraphOptions = {
  align?: 'both' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
  uppercase?: boolean;
  spacingAfter?: number;
  border?: boolean;
};

const FORBIDDEN_EXPRESSIONS: Array<[RegExp, string]> = [
  [/aprova[cç][aã]o humana/gi, 'validação técnica da minuta'],
  [/gerado por ia/gi, 'versão consolidada'],
  [/gera[cç][aã]o por ia/gi, 'elaboração da justificativa'],
  [/primeira vers[aã]o de trabalho/gi, 'versão consolidada']
];

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function normalizeLegislativeText(value: string) {
  const normalized = value
    .normalize('NFC')
    .replace(/\bArt\. (\d+)o\b/g, 'Art. $1º')
    .replace(/\bArtigo (\d+)o\b/gi, 'Art. $1º')
    .replace(/N[\u00c2º°]?\s*o\b/g, 'Nº')
    .replace(/N\s*º/g, 'Nº');

  return FORBIDDEN_EXPRESSIONS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), normalized);
}

function runProperties({ bold, italic }: Pick<ParagraphOptions, 'bold' | 'italic'>) {
  return `<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/>${
    bold ? '<w:b/>' : ''
  }${italic ? '<w:i/>' : ''}</w:rPr>`;
}

function paragraph(value: string, options: ParagraphOptions = {}) {
  const normalizedValue = normalizeLegislativeText(value);
  const text = options.uppercase ? normalizedValue.toUpperCase() : normalizedValue;
  const align = options.align ?? 'both';
  const spacingAfter = options.spacingAfter ?? 160;
  const border = options.border
    ? '<w:pBdr><w:top w:val="single" w:sz="8" w:space="6" w:color="808080"/><w:bottom w:val="single" w:sz="8" w:space="6" w:color="808080"/></w:pBdr>'
    : '';

  return `<w:p>
    <w:pPr>
      <w:jc w:val="${align}"/>
      <w:spacing w:after="${spacingAfter}" w:line="360" w:lineRule="auto"/>
      ${border}
    </w:pPr>
    <w:r>${runProperties(options)}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>
  </w:p>`;
}

function blankParagraph() {
  return paragraph('', { spacingAfter: 80 });
}

function sectionTitle(value: string) {
  return paragraph(value, { align: 'center', bold: true, uppercase: true, spacingAfter: 240 });
}

function ementaBlock(value: string) {
  return [
    paragraph('EMENTA', { align: 'right', bold: true, spacingAfter: 80 }),
    paragraph(value, { align: 'both', italic: true, spacingAfter: 320, border: true })
  ].join('');
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    (Math.floor(date.getSeconds() / 2) & 0x1f);
  const dosDate =
    (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f);

  return { dosDate, time };
}

function zip(entries: { name: string; content: string }[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { dosDate, time } = dosDateTime();

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const content = Buffer.from(entry.content, 'utf8');
    const crc = crc32(content);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, content);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function readStoredZipEntries(buffer: Buffer) {
  const result = new Map<string, string>();
  let offset = 0;

  while (offset < buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.slice(offset + 30, offset + 30 + nameLength).toString('utf8');
    const contentStart = offset + 30 + nameLength + extraLength;
    const content = buffer.slice(contentStart, contentStart + compressedSize);

    if (method === 0) {
      result.set(name, content.toString('utf8'));
    }

    offset = contentStart + compressedSize;
  }

  return result;
}

function readInstitutionalTemplate() {
  const templatePath = join(process.cwd(), 'templates', 'template_pl_ordinaria_base.docx');

  if (!existsSync(templatePath)) {
    return null;
  }

  return readStoredZipEntries(readFileSync(templatePath));
}

function documentParagraphs(lines: string[]) {
  return lines.map((line) => (line.trim() ? paragraph(line.trim()) : blankParagraph())).join('');
}

export function createSimpleDocx({
  titulo,
  ementa,
  minuta,
  justificativa,
  autor,
  cargoAutor,
  localData,
  casaLegislativa
}: {
  titulo: string;
  ementa: string | null;
  minuta: string;
  justificativa: string;
  autor: string;
  cargoAutor: string;
  localData: string;
  casaLegislativa: string;
}) {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraph('PROJETO DE LEI Nº ____ / ______', { align: 'center', bold: true, uppercase: true, spacingAfter: 240 })}
    ${ementaBlock(ementa ?? titulo)}
    ${paragraph(`${casaLegislativa.toUpperCase()} DECRETA:`, { align: 'center', bold: true, spacingAfter: 320 })}
    ${documentParagraphs(minuta.split(/\r?\n/))}
    ${blankParagraph()}
    ${sectionTitle('Justificativa')}
    ${documentParagraphs(justificativa.split(/\r?\n/))}
    ${blankParagraph()}
    ${paragraph(`${casaLegislativa.toUpperCase()}, em ${localData}.`, { align: 'center', spacingAfter: 560 })}
    ${paragraph(autor, { align: 'center', bold: true, uppercase: true, spacingAfter: 80 })}
    ${paragraph(cargoAutor, { align: 'center', spacingAfter: 480 })}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1701" w:right="1134" w:bottom="1134" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto"/></w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`;
  const template = readInstitutionalTemplate();

  return zip([
    {
      name: '[Content_Types].xml',
      content:
        template?.get('[Content_Types].xml') ??
        `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
    },
    {
      name: '_rels/.rels',
      content:
        template?.get('_rels/.rels') ??
        `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    },
    {
      name: 'word/_rels/document.xml.rels',
      content:
        template?.get('word/_rels/document.xml.rels') ??
        `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    },
    { name: 'word/document.xml', content: documentXml },
    { name: 'word/styles.xml', content: template?.get('word/styles.xml') ?? stylesXml }
  ]);
}
