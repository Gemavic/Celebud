// /admin/newsroom — tools for producing CelebUD's own journalism.
//
// Each tab turns something only CelebUD has (its readers, its contacts, the
// families it writes about, its editor's judgement) into publishable work,
// with AI doing the clerical part. Nothing here publishes anything: every
// tool ends in a hidden draft that an editor reviews and saves in Article
// Management.
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { StoryRadar } from '../components/newsroom/StoryRadar';
import { VoiceNotes } from '../components/newsroom/VoiceNotes';
import { ReaderQuestions } from '../components/newsroom/ReaderQuestions';
import { TributeInbox } from '../components/newsroom/TributeInbox';
import { WeeklyDigest } from '../components/newsroom/WeeklyDigest';
import { LivingGuides } from '../components/newsroom/LivingGuides';
import { TrackersAdmin } from '../components/newsroom/TrackersAdmin';
import { ElectionAdmin } from '../components/newsroom/ElectionAdmin';
import { PartnersAdmin } from '../components/newsroom/PartnersAdmin';

const TABS = [
  { id: 'election', label: 'Election 2027', el: ElectionAdmin },
  { id: 'radar', label: 'Story Radar', el: StoryRadar },
  { id: 'voice', label: 'Voice Notes', el: VoiceNotes },
  { id: 'ask', label: 'Reader Questions', el: ReaderQuestions },
  { id: 'tributes', label: 'Tributes', el: TributeInbox },
  { id: 'digest', label: 'Weekly Digest', el: WeeklyDigest },
  { id: 'guides', label: 'Living Guides', el: LivingGuides },
  { id: 'trackers', label: 'Trackers', el: TrackersAdmin },
  { id: 'partners', label: 'Partners', el: PartnersAdmin },
] as const;

export function NewsroomPage() {
  const [params, setParams] = useSearchParams();
  const initial = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'election';
  const [tab, setTab] = useState<string>(initial);
  const Active = TABS.find((t) => t.id === tab)!.el;

  return (
    <AdminLayout title="Newsroom" subtitle="Original stories from your readers, contacts and families — AI does the clerical work, you add the judgement.">
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button key={t.id}
            onClick={() => { setTab(t.id); setParams({ tab: t.id }, { replace: true }); }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border ${tab === t.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <Active />
    </AdminLayout>
  );
}
