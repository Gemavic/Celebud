// src/pages/TrustPages.tsx
// Trust & transparency pages required for Google News Publisher approval
// and general reader trust: About Us, Contact, and Editorial Standards.
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { ArrowLeft, Mail, MapPin, MessageCircle, Newspaper, Shield, Users } from 'lucide-react';

function TrustShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-28 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
          </Link>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-500 mb-8">{subtitle}</p>
            <div className="prose prose-gray max-w-none space-y-5 text-gray-700 leading-relaxed">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <TrustShell title="About CelebUD" subtitle="Who we are and what we stand for">
      <p>
        <strong>CelebUD</strong> is a digital magazine covering celebrity news, entertainment,
        politics, society, lifestyle, business, and financial education for readers in Africa,
        North America, and beyond. We publish around the clock — combining original reporting
        from our editorial team with curated coverage of the stories shaping our readers' world.
      </p>
      <p>
        CelebUD is operated by <strong>Gemavic Media</strong>, based in Ontario, Canada, with a
        reporting network across Nigeria and the diaspora. Our newsroom is led by our
        Editor-in-Chief and staffed by named, accountable reporters — every article on CelebUD
        carries a byline you can click to see who wrote or curated it.
      </p>
      <h2 className="text-xl font-bold text-gray-900 pt-2">What we cover</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>News &amp; Politics</strong> — Nigeria, Canada, and world affairs</li>
        <li><strong>Entertainment &amp; Society</strong> — celebrity culture, film, music, and events</li>
        <li><strong>Fin-Advisor</strong> — our dedicated financial &amp; insurance education hub with free planning calculators</li>
        <li><strong>Lifestyle &amp; Videos</strong> — original creator content from our Content Studio</li>
      </ul>
      <p>
        Want to join our reporting team? <Link to="/reporters/apply" className="text-red-600 font-medium">Apply here</Link>.
        For everything else, see our <Link to="/contact" className="text-red-600 font-medium">Contact page</Link> or
        read our <Link to="/editorial-standards" className="text-red-600 font-medium">Editorial Standards</Link>.
      </p>
    </TrustShell>
  );
}

export function ContactPage() {
  return (
    <TrustShell title="Contact Us" subtitle="We read everything — questions, tips, corrections, and partnerships">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose">
        {[
          { icon: Mail, title: 'Editorial & General', body: 'histogm@gmail.com', href: 'mailto:histogm@gmail.com' },
          { icon: MessageCircle, title: 'SMS / WhatsApp', body: '+1 (437) 788-8011', href: 'tel:+14377888011' },
          { icon: Newspaper, title: 'News tips & corrections', body: 'Send story tips or request a correction', href: 'mailto:histogm@gmail.com?subject=News%20tip%20or%20correction' },
          { icon: MapPin, title: 'Location', body: 'Ontario, Canada', href: undefined },
        ].map((c) => (
          <div key={c.title} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <c.icon className="w-5 h-5 text-red-600 mb-2" />
            <p className="font-semibold text-gray-900">{c.title}</p>
            {c.href ? (
              <a href={c.href} className="text-sm text-red-600 hover:text-red-700 break-all">{c.body}</a>
            ) : (
              <p className="text-sm text-gray-600">{c.body}</p>
            )}
          </div>
        ))}
      </div>
      <p className="pt-4">
        <strong>Corrections:</strong> if we got something wrong, tell us. Verified corrections are
        made promptly and noted on the article. See our{' '}
        <Link to="/editorial-standards" className="text-red-600 font-medium">Editorial Standards</Link> for
        how we handle accuracy.
      </p>
      <p>
        <strong>Advertising &amp; partnerships:</strong> reach a fast-growing audience across
        Africa and North America — email us with "Advertising" in the subject line.
      </p>
    </TrustShell>
  );
}

export function EditorialStandardsPage() {
  return (
    <TrustShell title="Editorial Standards" subtitle="How CelebUD reports, curates, attributes, and corrects">
      <div className="not-prose flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4 mb-2">
        <Shield className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        <p className="text-sm text-gray-700">
          Our credibility is our product. These standards apply to every story published on CelebUD,
          whether originally reported or curated from other outlets.
        </p>
      </div>
      <h2 className="text-xl font-bold text-gray-900">Accuracy &amp; verification</h2>
      <p>
        We verify facts before publishing. Where a story is developing, we say so plainly and
        update it as facts emerge. Headlines must reflect the substance of the story.
      </p>
      <h2 className="text-xl font-bold text-gray-900">Attribution &amp; curation</h2>
      <p>
        Some CelebUD stories are curated from other news organizations. Curated stories always
        identify the original publisher, and the CelebUD staff member shown on such stories is
        credited as the <em>curator</em>, not the original author. Original reporting is bylined
        by the reporter who wrote it.
      </p>
      <h2 className="text-xl font-bold text-gray-900">Corrections</h2>
      <p>
        When we publish an error, we correct the article promptly. Material corrections are noted
        within the article. To request a correction, use our{' '}
        <Link to="/contact" className="text-red-600 font-medium">Contact page</Link>.
      </p>
      <h2 className="text-xl font-bold text-gray-900">Independence &amp; sponsored content</h2>
      <p>
        Advertising never dictates editorial coverage. Sponsored or affiliate content is labeled
        as such wherever it appears.
      </p>
      <h2 className="text-xl font-bold text-gray-900">Our team</h2>
      <p className="not-prose flex items-center gap-2 text-gray-700">
        <Users className="w-4 h-4 text-red-600" />
        Every byline links to an author profile listing that reporter's coverage. Reporters join
        through a vetted <Link to="/reporters/apply" className="text-red-600 font-medium">application process</Link> reviewed
        by our Editor-in-Chief.
      </p>
    </TrustShell>
  );
}
