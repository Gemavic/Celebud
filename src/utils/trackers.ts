// Tracker definitions shared by the public /trackers page and the admin
// Newsroom tab where editors record new figures.

export type TrackerId = 'ngn-cad' | 'ngn-usd' | 'express-entry' | 'fuel-price';

export interface TrackerDef {
  id: TrackerId;
  name: string;
  blurb: string;
  valueLabel: string;
  /** How the value is shown, e.g. "₦1,020" */
  format: (v: number) => string;
  labelName: string;
  labelExamples: string[];
  extraLabel?: string;
  sourceHint: string;
}

const naira = (v: number) => `₦${v.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

export const TRACKERS: TrackerDef[] = [
  {
    id: 'ngn-cad',
    name: 'Naira to Canadian dollar',
    blurb: 'What one Canadian dollar buys in naira — the number behind every transfer home.',
    valueLabel: 'Naira per C$1',
    format: naira,
    labelName: 'Market',
    labelExamples: ['Official (CBN)', 'Parallel market'],
    sourceHint: 'CBN website for the official rate; note where a parallel-market figure came from.',
  },
  {
    id: 'ngn-usd',
    name: 'Naira to US dollar',
    blurb: 'The naira against the dollar, official and parallel market.',
    valueLabel: 'Naira per US$1',
    format: naira,
    labelName: 'Market',
    labelExamples: ['Official (CBN)', 'Parallel market'],
    sourceHint: 'CBN website for the official rate.',
  },
  {
    id: 'express-entry',
    name: 'Express Entry draws',
    blurb: 'Every Canadian Express Entry draw: the minimum CRS score and how many people were invited.',
    valueLabel: 'Minimum CRS score',
    format: (v) => v.toLocaleString(),
    labelName: 'Draw type',
    labelExamples: ['General', 'Canadian Experience Class', 'French-language', 'Healthcare', 'Provincial Nominee Program'],
    extraLabel: 'Invitations issued',
    sourceHint: 'IRCC "Express Entry rounds of invitations" page.',
  },
  {
    id: 'fuel-price',
    name: 'Petrol pump price',
    blurb: 'What a litre of petrol costs at the pump in Nigerian cities.',
    valueLabel: 'Naira per litre',
    format: naira,
    labelName: 'City',
    labelExamples: ['Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Kano'],
    sourceHint: 'NBS price watch, or a pump price you or a contact saw (say which in the note).',
  },
];

export const trackerById = (id: string) => TRACKERS.find((t) => t.id === id);

export interface TrackerEntry {
  id: string;
  tracker: TrackerId;
  observed_on: string;
  value: number;
  label: string | null;
  extra: number | null;
  source_url: string | null;
  note: string | null;
}
