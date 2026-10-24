// Shared data and helpers for the Election 2027 hub.
import type { Json } from '../lib/database.types';

export const POLL_SLUG = 'president-2027';
/** INEC timetable after the Electoral Act 2026 (as reported Sep 2026). */
export const PRESIDENTIAL_DAY = '2027-01-16';
export const GOVERNORSHIP_DAY = '2027-02-06';

export interface Candidate {
  id: string;
  ballot_order: number;
  slug: string;
  name: string;
  party_abbr: string;
  party_name: string | null;
  running_mate: string | null;
  photo_url: string | null;
  bio: string | null;
  past_offices: string | null;
  promises: Json;
  sources: Json;
  search_terms: string[];
  updated_at: string;
}

export interface Promise_ { text: string; date?: string; source_url?: string }
export interface Source { title: string; url: string }

export const asPromises = (j: Json): Promise_[] =>
  Array.isArray(j) ? (j as unknown as Promise_[]).filter((p) => p && typeof p.text === 'string') : [];
export const asSources = (j: Json): Source[] =>
  Array.isArray(j) ? (j as unknown as Source[]).filter((s) => s && typeof s.url === 'string') : [];

export interface VoterStat {
  kind: 'total' | 'zone' | 'state' | 'age' | 'gender' | 'pwd';
  label: string;
  zone: string | null;
  value: number;
  sort: number;
  as_of: string;
  source_title: string | null;
  source_url: string | null;
}

export interface PollResults {
  blackout: boolean;
  polling_day: string;
  is_open?: boolean;
  total?: number;
  by_candidate?: { candidate_id: string | null; undecided: boolean; votes: number }[];
  by_zone?: { zone: string; candidate_id: string | null; undecided: boolean; votes: number }[];
  by_age?: { age_band: string; candidate_id: string | null; undecided: boolean; votes: number }[];
}

export const ZONES = ['North-West', 'North-East', 'North-Central', 'South-West', 'South-East', 'South-South'] as const;

export const STATE_ZONE: Record<string, string> = {
  Jigawa: 'North-West', Kaduna: 'North-West', Kano: 'North-West', Katsina: 'North-West', Kebbi: 'North-West', Sokoto: 'North-West', Zamfara: 'North-West',
  Adamawa: 'North-East', Bauchi: 'North-East', Borno: 'North-East', Gombe: 'North-East', Taraba: 'North-East', Yobe: 'North-East',
  Benue: 'North-Central', Kogi: 'North-Central', Kwara: 'North-Central', Nasarawa: 'North-Central', Niger: 'North-Central', Plateau: 'North-Central', FCT: 'North-Central',
  Ekiti: 'South-West', Lagos: 'South-West', Ogun: 'South-West', Ondo: 'South-West', Osun: 'South-West', Oyo: 'South-West',
  Abia: 'South-East', Anambra: 'South-East', Ebonyi: 'South-East', Enugu: 'South-East', Imo: 'South-East',
  'Akwa Ibom': 'South-South', Bayelsa: 'South-South', 'Cross River': 'South-South', Delta: 'South-South', Edo: 'South-South', Rivers: 'South-South',
};
export const STATES = Object.keys(STATE_ZONE).sort();

export const AGE_BANDS = ['18-34', '35-49', '50-69', '70+'] as const;

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export const daysUntil = (isoDate: string) =>
  Math.max(0, Math.ceil((new Date(`${isoDate}T08:00:00+01:00`).getTime() - Date.now()) / 86400000));

export const fmtNum = (n: number) => n.toLocaleString('en-NG');
export const pct = (part: number, whole: number, dp = 1) => (whole > 0 ? `${((part / whole) * 100).toFixed(dp)}%` : '–');

export function getDeviceId(): string {
  const KEY = 'celebud_device_id';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(KEY, id); }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export const votedKey = (slug: string) => `celebud_voted_${slug}`;
export function hasVoted(slug: string) { try { return localStorage.getItem(votedKey(slug)) === '1'; } catch { return false; } }
export function markVoted(slug: string) { try { localStorage.setItem(votedKey(slug), '1'); } catch { /* private mode */ } }

export const SITE = 'https://celebud.com';
export const pollShareText = () =>
  `If Nigeria voted today, who gets your vote for President in 2027? Take the CelebUD reader poll and see how every zone and age group is voting:\n${SITE}/election-2027/poll`;
