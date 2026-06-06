const TRAILING_JUNK_MARKERS = [
  '\nTAGS:',
  'TAGGED:',
  'Get real-time news updates from Tribune',
  'Join Daily Trust WhatsApp',
  '\nRecommended Stories',
  'Nigerians can now invest',
  'You must confirm your public display name',
  '\nUPDATE NEWS:',
  'Get breaking National news',
  'And of course, you can also follow TechRadar',
  '\nRead Also:',
  '\nREAD ALSO;',
  'Nomination Deadlines',
  'written permission from PUNCH',
  'updates from us on WhatsApp too',
  'delivered straight to your phone',
  'Do you employ househelps',
  'Join BusinessDay whatsapp Channel',
  'All rights reserved. This material',
  'Back to School, Back to Business A Fresh Start',
  'WATCH TOP VIDEOS FROM NIGERIAN TRIBUNE',
  '#EndSARS Dashboard',
  'Casino Utan Svensk Licens',
  'Join Our Whatsapp Channel',
  'Join LEADERSHIP NEWS on WhatsApp',
  '\nPT Insider',
  'got the edge. Get real-time reports',
  'Copy the link to this update',
  'Become a Vogue Business Member',
  'download now and never miss a beat',
  'Follow The Punch Newspaper on WhatsApp',
];

const INLINE_JUNK_PATTERNS = [
  /Sign up for breaking news, reviews, opinion, top tech deals, and more\./g,
  /Follow us\n\nNewsletter\n\n/g,
  /Save this storySave StorySave this story/g,
  /Save this story/g,
  /View this post on Instagram\s*/g,
];

const LEADING_BYLINE_PATTERN =
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\s+by\s[\s\S]*?\n\n/;

const LEADING_CAPTION_PATTERN = /^[^\n]*L-R:[\s\S]*?\n\n/;

const celebudReporters = [
  'Gbenga Ayandare',
  'Victoria Odunola',
  'Matthew Ayandare',
  'Chidinma Okafor',
  'Adebayo Ogundimu',
];
const celebudWhatsApp = '+14377888011';

function sanitizeContactNumbers(text: string): string {
  const contactBlockPattern = /(?:(?:whatsapp|call|text|contact|reach|send\s+(?:a\s+)?message)[\s:]*(?:on|at|via|through|@)?[\s:]*)([\w\s.''-]+?)(?:\s*(?:on|at|via|:))?\s*(\+?\d[\d\s.()-]{7,})/gi;
  const standaloneWhatsApp = /(whatsapp|wa\.me|wa\s*:\s*)[\s/]*(\+?\d[\d\s.()-]{7,})/gi;
  const nameBeforeNumberPattern = /(?:(?:by|from|contact|reporter|correspondent|editor|author|journalist|writer)[\s:]+)([\w\s.''-]{3,30})(?:\s*[-,;:]\s*|\s+)(\+?\d[\d\s.()-]{7,})/gi;

  const reporter = celebudReporters[Math.floor(Math.random() * celebudReporters.length)];
  let result = text;

  result = result.replace(contactBlockPattern, () => `${reporter} on ${celebudWhatsApp}`);
  result = result.replace(nameBeforeNumberPattern, () => `${reporter} - ${celebudWhatsApp}`);
  result = result.replace(standaloneWhatsApp, (_match, prefix) => `${prefix} ${celebudWhatsApp}`);

  const phoneInContactLine = /^(.*(?:whatsapp|call|text us|contact).*)(\+?\d[\d\s.()-]{7,})/gim;
  result = result.replace(phoneInContactLine, (_match, before) => `${before}${celebudWhatsApp}`);

  return result;
}

export function sanitizeArticleContent(content: string): string {
  let cleaned = content.replace(/\r/g, '');

  // Strip all HTML tags, converting block elements to line breaks
  cleaned = cleaned
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/&hellip;/g, '...');

  for (const pattern of INLINE_JUNK_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  let cutPosition = cleaned.length;
  for (const marker of TRAILING_JUNK_MARKERS) {
    const pos = cleaned.indexOf(marker);
    if (pos !== -1 && pos < cutPosition) {
      cutPosition = pos;
    }
  }
  cleaned = cleaned.substring(0, cutPosition);

  const timestampMatch = cleaned.match(
    /\n\n[^\n]+\n\n\s{10,}\d+\s+(?:hours?|minutes?)\s+ago/
  );
  if (timestampMatch && timestampMatch.index !== undefined) {
    cleaned = cleaned.substring(0, timestampMatch.index);
  }

  cleaned = cleaned.replace(LEADING_BYLINE_PATTERN, '');
  cleaned = cleaned.replace(LEADING_CAPTION_PATTERN, '');

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+\n/g, '\n');

  const lines = cleaned.split('\n');
  const lastLine = lines[lines.length - 1]?.trim();
  if (lastLine && /^\s*Tags:\s*$/.test(lastLine)) {
    lines.pop();
    cleaned = lines.join('\n');
  }

  cleaned = sanitizeContactNumbers(cleaned);

  return cleaned.trim();
}
