import { inflateRawSync, inflateSync } from 'node:zlib';

const PDF_SCAN_ERROR = 'PDF escaneado não suportado nesta versão. Envie PDF com texto selecionável ou DOCX.';

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function cleanText(value: string) {
  return value
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function extractHtmlText(value: string) {
  return cleanText(
    decodeXml(
      value
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<\/(p|div|section|article|br|li|tr|h1|h2|h3|h4)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
    )
  );
}

function readZipEntries(buffer: Buffer) {
  const entries = new Map<string, Buffer>();
  let offset = 0;

  while (offset < buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.slice(offset + 30, offset + 30 + nameLength).toString('utf8');
    const contentStart = offset + 30 + nameLength + extraLength;
    const rawContent = buffer.slice(contentStart, contentStart + compressedSize);

    if (method === 0) {
      entries.set(name, rawContent);
    } else if (method === 8) {
      entries.set(name, inflateRawSync(rawContent));
    }

    offset = contentStart + compressedSize;
  }

  return entries;
}

function extractDocxText(buffer: Buffer) {
  const entries = readZipEntries(buffer);
  const documentXml = entries.get('word/document.xml')?.toString('utf8');

  if (!documentXml) {
    throw new Error('Não foi possível ler o conteúdo do DOCX.');
  }

  return cleanText(
    decodeXml(
      documentXml
        .replace(/<\/w:p>/g, '\n')
        .replace(/<w:tab\/>/g, '\t')
        .replace(/<w:br\/>/g, '\n')
        .replace(/<[^>]+>/g, '')
    )
  );
}

function decodePdfLiteral(value: string) {
  return value
    .replace(/\\([\\()])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));
}

function decodePdfHex(value: string) {
  const clean = value.replace(/\s+/g, '');
  const bytes = Buffer.from(clean.length % 2 === 0 ? clean : `${clean}0`, 'hex');

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const chars: string[] = [];
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      chars.push(String.fromCharCode(bytes.readUInt16BE(index)));
    }
    return chars.join('');
  }

  return bytes.toString('latin1');
}

function extractPdfStrings(content: string) {
  const parts: string[] = [];

  for (const match of content.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) {
    parts.push(decodePdfLiteral(match[0].replace(/\)\s*Tj$/, '').slice(1)));
  }

  for (const match of content.matchAll(/<([0-9a-fA-F\s]+)>\s*Tj/g)) {
    parts.push(decodePdfHex(match[1]));
  }

  for (const match of content.matchAll(/\[(.*?)\]\s*TJ/gs)) {
    const arrayText = match[1];
    for (const literal of arrayText.matchAll(/\((?:\\.|[^\\)])*\)/g)) {
      parts.push(decodePdfLiteral(literal[0].slice(1, -1)));
    }
    for (const hex of arrayText.matchAll(/<([0-9a-fA-F\s]+)>/g)) {
      parts.push(decodePdfHex(hex[1]));
    }
    parts.push('\n');
  }

  return parts.join(' ');
}

function extractPdfText(buffer: Buffer) {
  const source = buffer.toString('latin1');
  const streams: string[] = [];

  for (const match of source.matchAll(/<<(.*?)>>\s*stream\r?\n?([\s\S]*?)\r?\n?endstream/g)) {
    const dictionary = match[1];
    const rawStream = Buffer.from(match[2], 'latin1');

    try {
      if (/\/FlateDecode/.test(dictionary)) {
        streams.push(inflateSync(rawStream).toString('latin1'));
      } else {
        streams.push(rawStream.toString('latin1'));
      }
    } catch {
      streams.push(rawStream.toString('latin1'));
    }
  }

  const extracted = cleanText(streams.map(extractPdfStrings).join('\n'));

  if (extracted.length < 40) {
    throw new Error(PDF_SCAN_ERROR);
  }

  return extracted;
}

export function extractImportedText({
  buffer,
  contentType,
  filename
}: {
  buffer: Buffer;
  contentType?: string | null;
  filename?: string | null;
}) {
  const lowerName = filename?.toLowerCase() ?? '';
  const type = contentType?.toLowerCase() ?? '';

  if (type.includes('pdf') || lowerName.endsWith('.pdf')) {
    return extractPdfText(buffer);
  }

  if (
    type.includes('wordprocessingml.document') ||
    type.includes('msword') ||
    lowerName.endsWith('.docx')
  ) {
    return extractDocxText(buffer);
  }

  if (type.includes('html') || lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
    return extractHtmlText(buffer.toString('utf8'));
  }

  return cleanText(buffer.toString('utf8'));
}

export { PDF_SCAN_ERROR };
