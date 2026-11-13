// src/utils/aiTells.ts
//
// Phrases that mark text as machine-written. Checked when an article is
// saved in Article Management, so AI-sounding wording is caught whatever
// its source: a drafting tool, "Suggest angles", or text pasted from
// elsewhere. It warns; the editor decides.
//
// KEEP IN STEP with AI_TELLS in supabase/functions/_shared/houseStyle.ts,
// which applies the same list to everything the AI tools produce.

const TELLS: RegExp[] = [
  /\ba practical (?:next )?step\b/i,
  /\b(?:the|a) (?:critical|crucial|key) (?:detail|point|difference) (?:lies|is found)\b/i,
  /\bsecond nature\b/i,
  /\bundertak(?:e|es|en|ing)\b/i,
  /\bnavigat(?:e|es|ed|ing)\b/i,
  /\blandscape\b/i,
  /\bcrucial\b/i,
  /\bplay(?:s|ed|ing)? an? (?:crucial|pivotal|vital|key|significant) role\b/i,
  /\b(?:a|serves as a) stark reminder\b/i,
  /\bin an era of\b/i,
  /\bin a world where\b/i,
  /\bwhen it comes to\b/i,
  /\b(?:the reality|the truth) is\b/i,
  /\bhere(?:'s| is) the thing\b/i,
  /\bnot only\b/i,
  /\bwhether you(?:'re| are)\b[^.]{0,80}\bor\b/i,
  /\btransition(?:s|ed|ing)? (?:between|from|into)\b/i,
  /\b(?:pull|dig|take) out your\b/i,
  /\b(?:delve[sd]?|delving|tapestry|testament|realm|embark(?:s|ed|ing)?|foster(?:s|ed|ing)?|myriad|plethora|holistic|synergy|paramount|pivotal)\b/i,
  /\b(?:utili[sz](?:e|es|ed|ing)|leverag(?:e|es|ed|ing)|seamless(?:ly)?|meticulous(?:ly)?|intricate|bolster(?:s|ed|ing)?|underscor(?:e|es|ed|ing)|showcas(?:e|es|ed|ing)|vibrant|nestled|boasts)\b/i,
  /\b(?:mandat(?:e|es|ed|ing)|subsequent(?:ly)?|commenc(?:e|es|ed|ing)|facilitat(?:e|es|ed|ing))\b/i,
  /\b(?:moreover|furthermore|additionally)\b/i,
  /\bit is (?:important|worth|crucial) (?:to note|noting)\b/i,
  /\bin conclusion\b/i,
  /\bin today's (?:fast-paced|digital|modern|ever-changing)\b/i,
  /\bin order to\b/i,
  /\b(?:is|are|was|were|isn't|aren't|wasn't|weren't)(?: not)? (?:just|merely|simply) (?:a|an|the|about)\b[^.]{0,80}[,;:—–-]\s*(?:it|they|this)(?:'s| is| are| was| were)\b/i,
  /\bmore than just\b/i,
  /\b(?:serves|served|stands|stood) as an? \b/i,
  /\b(?:beacon|unwavering|multifaceted|cutting-edge|game-changing)\b/i,
  /\bresonat(?:e|es|ed|ing)\b/i,
  /\brevolutioni[sz](?:e|es|ed|ing)\b/i,
  /\ba (?:wide|broad) (?:array|range|spectrum) of\b/i,
  /\bkey takeaways?\b/i,
  /\b(?:fast-paced|ever-changing|ever-evolving)\b/i,
];

/**
 * Returns each machine-sounding phrase found in an article body, quoted with
 * a few words either side so the editor can find it.
 */
export function findAiTells(html: string): string[] {
  // Quotations are someone's own words: never flagged.
  const text = (html || '')
    .replace(/<blockquote\b[\s\S]*?<\/blockquote>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/\u201c[^\u201d]*\u201d|"[^"]*"/g, ' ');
  const found: string[] = [];
  for (const re of TELLS) {
    const m = re.exec(text);
    if (!m) continue;
    const start = Math.max(0, m.index - 30);
    const end = Math.min(text.length, m.index + m[0].length + 30);
    found.push(`"${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}"`);
  }

  // The same kind of added section more than once is the clearest sign of
  // AI padding ("What this means for…" twice in one article).
  const heads = [...(html || '').matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, '').trim().toLowerCase());
  const whatThisMeans = heads.filter((h) => h.startsWith('what this means'));
  if (whatThisMeans.length > 1) found.push(`${whatThisMeans.length} sections headed "What this means…"`);

  return found;
}
