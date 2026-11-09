// supabase/functions/_shared/houseStyle.ts
//
// CelebUD house style for everything the AI drafts: article drafts, rewrites,
// Newsroom drafts (tributes, interviews, reader stories) and author bios.
//
// Two layers, because a prompt alone is not enough:
//   1. HOUSE_STYLE goes into every system prompt. It tells the model to write
//      like a native-speaking newsroom writer, in ONE variety of English, and
//      lists the words and patterns that mark text as machine-written.
//   2. polishText()/polishHtml() run on whatever comes back. Models still slip
//      ("delve", "tapestry", "In today's fast-paced world", "color" next to
//      "honour"), so the common offenders are fixed in code, every time.
//
// ENGLISH VARIETY: British English, with -ise spellings (organise, realise).
// It is what Nigerian readers, CelebUD's largest audience, read and write,
// and it sits close to Canadian usage. To switch the whole site to another
// variety, change HOUSE_STYLE and SPELLING below - nowhere else.
//
// The replacements only touch lower-case words, so names stay exactly as
// they are ("World Health Organization", "Pearl Harbor", "Labor Day").

export const HOUSE_STYLE = `HOUSE STYLE (follow strictly):
- Write as an experienced newspaper journalist whose first language is English: plain, confident, natural. Short and medium sentences, varied in rhythm. Concrete nouns and strong verbs. Say a thing once, clearly.
- Use BRITISH ENGLISH spelling and usage consistently, with -ise endings: colour, honour, favour, behaviour, labour, centre, theatre, defence, travelled, cancelled, organise, realise, recognise, analyse, programme (but "computer program"), jewellery, grey, enrol, fulfil. Never mix in American spellings. Keep official names exactly as their owners spell them (e.g. "World Health Organization").
- Dates as "9 November 2026". Use "per cent" in running text.
- Do NOT use these words or phrases: delve, tapestry, testament, navigate the complexities, in today's fast-paced world, in today's digital age, ever-evolving, landscape (meaning "situation"), realm, embark, unlock the potential, game-changer, elevate, seamless, leverage (as a verb), utilise, foster, bolster, myriad, plethora, meticulous, intricate, underscore, pivotal, paramount, vibrant, nestled, boasts, showcase, robust (except of physical things), holistic, synergy, "it is important to note", "it is worth noting", "in conclusion", "to sum up", "moreover", "furthermore", "additionally", "not only ... but also", "whether you are ... or ...", "let's dive in", "buckle up".
- No throat-clearing openings, no rhetorical questions to open sections, no lists of three for rhythm's sake, no exclamation marks, no emojis. Use em dashes sparingly - commas and full stops first.
- Write like a person who knows the subject and respects the reader's time.`;

// --- deterministic clean-up ------------------------------------------------

// Phrase-level fixes first (longest first), then single words.
const PHRASES: Array<[RegExp, string]> = [
  [/\bin today's (?:fast-paced|ever-changing|ever-evolving|modern) world,?\s*/gi, ''],
  [/\bin today's digital (?:age|era),?\s*/gi, 'today, '],
  [/\bit is (?:important|worth|crucial) (?:to note|noting) that\s*/gi, ''],
  [/\bit's (?:important|worth) (?:to note|noting) that\s*/gi, ''],
  [/\bin conclusion,\s*/gi, ''],
  [/\bto sum up,\s*/gi, ''],
  [/\b(?:moreover|furthermore|additionally),\s*/gi, 'also, '],
  [/\bdelv(?:e|es|ed|ing) (?:deep )?into\b/gi, '__DELVE__'],
  [/\ba rich tapestry of\b/gi, 'a mix of'],
  [/\b(?:the |a )?tapestry of\b/gi, 'the mix of'],
  [/\b(?:stands|stand|stood) as (?:a )?testaments? to\b/gi, '__TESTAMENT__'],
  [/\b(?:is|are|was|were) (?:a )?testaments? to\b/gi, '__TESTAMENT__'],
  [/\bnavigat(?:e|es|ed|ing) the complexities of\b/gi, '__NAVIGATE__'],
  [/\bunlock(?:s|ed|ing)? the (?:full )?potential of\b/gi, 'make the most of'],
  [/\b(?:a|an) ever-evolving landscape\b/gi, 'a changing picture'],
  [/\bever-evolving landscape\b/gi, 'changing picture'],
  [/\bever-evolving\b/gi, 'changing'],
  [/\bin the realm of\b/gi, 'in'],
  [/\bthe realm of\s+/gi, ''],
  [/\ba (?:myriad|plethora) of\b/gi, 'many'],
  [/\b(?:myriad|plethora) of\b/gi, 'many'],
  [/\bgame-changer\b/gi, 'big change'],
  [/\blet's dive in\.?\s*/gi, ''],
];

// Verb forms that need the right tense kept.
const DELVE: Record<string, string> = { delve: 'look at', delves: 'looks at', delved: 'looked at', delving: 'looking at' };
const NAVIGATE: Record<string, string> = { navigate: 'deal with', navigates: 'deals with', navigated: 'dealt with', navigating: 'dealing with' };

const WORDS: Record<string, string> = {
  utilise: 'use', utilises: 'uses', utilised: 'used', utilising: 'using',
  utilize: 'use', utilizes: 'uses', utilized: 'used', utilizing: 'using',
  utilisation: 'use', utilization: 'use',
  leverage: 'use', leverages: 'uses', leveraged: 'used', leveraging: 'using',
  seamless: 'smooth', seamlessly: 'smoothly',
  meticulous: 'careful', meticulously: 'carefully',
  intricate: 'complex',
  pivotal: 'key',
  paramount: 'essential',
  vibrant: 'lively',
  bolster: 'strengthen', bolsters: 'strengthens', bolstered: 'strengthened', bolstering: 'strengthening',
  underscore: 'show', underscores: 'shows', underscored: 'showed', underscoring: 'showing',
  showcase: 'show', showcases: 'shows', showcased: 'showed', showcasing: 'showing',
  embark: 'set out', embarks: 'sets out', embarked: 'set out', embarking: 'setting out',
  boasts: 'has',
  nestled: 'set',
  synergy: 'cooperation',
};

// American -> British, lower-case only (capitalised forms are usually names).
const SPELLING: Record<string, string> = {
  color: 'colour', colors: 'colours', colored: 'coloured', colorful: 'colourful',
  favor: 'favour', favors: 'favours', favored: 'favoured', favorable: 'favourable', favorite: 'favourite', favorites: 'favourites',
  honor: 'honour', honors: 'honours', honored: 'honoured', honoring: 'honouring', honorable: 'honourable',
  labor: 'labour', laborers: 'labourers', laborer: 'labourer',
  neighbor: 'neighbour', neighbors: 'neighbours', neighborhood: 'neighbourhood', neighborhoods: 'neighbourhoods', neighboring: 'neighbouring',
  behavior: 'behaviour', behaviors: 'behaviours', behavioral: 'behavioural',
  humor: 'humour', rumor: 'rumour', rumors: 'rumours', vigor: 'vigour', harbor: 'harbour', endeavor: 'endeavour', endeavors: 'endeavours',
  center: 'centre', centers: 'centres', centered: 'centred',
  theater: 'theatre', theaters: 'theatres', liter: 'litre', liters: 'litres', fiber: 'fibre', somber: 'sombre',
  defense: 'defence', offense: 'offence',
  traveled: 'travelled', traveling: 'travelling', traveler: 'traveller', travelers: 'travellers',
  canceled: 'cancelled', canceling: 'cancelling', labeled: 'labelled', labeling: 'labelling',
  modeling: 'modelling', fueled: 'fuelled', fueling: 'fuelling', counseling: 'counselling', counselor: 'counsellor',
  jewelry: 'jewellery', gray: 'grey', aluminum: 'aluminium', aging: 'ageing', maneuver: 'manoeuvre',
  catalog: 'catalogue', dialog: 'dialogue', enroll: 'enrol', enrollment: 'enrolment', fulfill: 'fulfil', fulfillment: 'fulfilment',
  skillful: 'skilful', willful: 'wilful', pediatric: 'paediatric', pediatrician: 'paediatrician',
  organize: 'organise', organizes: 'organises', organized: 'organised', organizing: 'organising',
  organization: 'organisation', organizations: 'organisations', organizational: 'organisational',
  realize: 'realise', realizes: 'realises', realized: 'realised', realizing: 'realising',
  recognize: 'recognise', recognizes: 'recognises', recognized: 'recognised', recognizing: 'recognising',
  apologize: 'apologise', apologized: 'apologised',
  prioritize: 'prioritise', prioritizes: 'prioritises', prioritized: 'prioritised', prioritizing: 'prioritising',
  emphasize: 'emphasise', emphasizes: 'emphasises', emphasized: 'emphasised', emphasizing: 'emphasising',
  criticize: 'criticise', criticizes: 'criticises', criticized: 'criticised', criticizing: 'criticising',
  minimize: 'minimise', maximize: 'maximise', summarize: 'summarise', summarized: 'summarised',
  authorize: 'authorise', authorized: 'authorised', authorization: 'authorisation',
  mobilize: 'mobilise', mobilized: 'mobilised', mobilization: 'mobilisation',
  utilise: 'use',
  analyze: 'analyse', analyzes: 'analyses', analyzed: 'analysed', analyzing: 'analysing',
  paralyze: 'paralyse', paralyzed: 'paralysed',
  stabilize: 'stabilise', stabilized: 'stabilised', subsidize: 'subsidise', subsidized: 'subsidised',
  legalize: 'legalise', characterize: 'characterise', characterized: 'characterised',
  finalize: 'finalise', finalized: 'finalised', memorize: 'memorise', normalize: 'normalise',
  specialize: 'specialise', specialized: 'specialised', specializes: 'specialises',
  sympathize: 'sympathise', modernize: 'modernise', modernization: 'modernisation',
  hospitalized: 'hospitalised', urbanization: 'urbanisation', globalization: 'globalisation',
};

const CUT = '\u0001';

const keepCase = (match: string, replacement: string) =>
  match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
    : replacement;

/** Clean one run of plain text (no HTML tags inside). */
export function polishText(input: string): string {
  if (!input) return input;
  let s = input;

  for (const [re, rep] of PHRASES) {
    s = s.replace(re, (m) => {
      if (rep === '__DELVE__') {
        const verb = m.toLowerCase().split(/\s+/)[0];
        return keepCase(m, DELVE[verb] || 'look at');
      }
      if (rep === '__NAVIGATE__') {
        const verb = m.toLowerCase().split(/\s+/)[0];
        return keepCase(m, NAVIGATE[verb] || 'deal with');
      }
      if (rep === '__TESTAMENT__') {
        const verb = m.toLowerCase().split(/\s+/)[0];
        const past = verb === 'was' || verb === 'were' || verb === 'stood';
        const plural = verb === 'are' || verb === 'were' || verb === 'stand';
        return keepCase(m, past ? 'showed' : plural ? 'show' : 'shows');
      }
      // A removed opener leaves a marker so the next letter can be
      // capitalised if it now starts the sentence.
      return rep === '' ? CUT : keepCase(m, rep);
    });
  }

  // Single words: only whole, lower-case or sentence-capitalised words, and
  // only from the curated lists. Anything else is left exactly as written.
  s = s.replace(/\b[A-Za-z]+\b/g, (w, offset: number, whole: string) => {
    const lower = w.toLowerCase();
    const isLower = w === lower;
    const isSentenceCap = w === lower.charAt(0).toUpperCase() + lower.slice(1);
    if (WORDS[lower] && (isLower || isSentenceCap)) return keepCase(w, WORDS[lower]);
    if (SPELLING[lower]) {
      if (isLower) return SPELLING[lower];
      // A capitalised word is changed only when it merely starts a sentence
      // and the next word is ordinary lower-case ("Travelers said ..."). In
      // "Color Center" or "Pearl Harbor" it is part of a name: left alone.
      const before = whole.slice(0, offset);
      const after = whole.slice(offset + w.length);
      const startsSentence = before.trim() === '' || /[.!?]\s+$/.test(before);
      if (isSentenceCap && startsSentence && /^\s+[a-z]/.test(after)) return keepCase(w, SPELLING[lower]);
    }
    return w;
  });

  // Where an opener was cut at the start of a sentence, capitalise what now
  // begins it. Only at cut points - nowhere else is touched.
  s = s.replace(new RegExp(`(^|[.!?]\\s+)${CUT}\\s*([a-z])`, 'g'), (_m, pre: string, ch: string) => pre + ch.toUpperCase());
  s = s.split(CUT).join('');
  s = s.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.;:])/g, '$1');
  return s;
}

/** Clean HTML: only the text between tags is changed, never tags or links. */
export function polishHtml(html: string): string {
  if (!html) return html;
  const parts = html.split(/(<[^>]+>)/g);
  let out = '';
  for (const part of parts) {
    if (part.startsWith('<')) { out += part; continue; }
    out += polishText(part);
  }
  return out;
}
