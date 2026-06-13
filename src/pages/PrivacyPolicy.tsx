import { Header } from '../components/Header';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const EFFECTIVE_DATE = 'June 13, 2026';
const SITE_NAME = 'CelebUD';
const SITE_URL = 'https://www.celebud.com';
const CONTACT_EMAIL = 'privacy@celebud.com';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">{title}</h2>
      <div className="space-y-3 text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-44 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Back link */}
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
                <p className="text-sm text-gray-500 mt-0.5">Effective date: {EFFECTIVE_DATE}</p>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed">
              This Privacy Policy explains how <strong>{SITE_NAME}</strong> ("{SITE_URL}") collects, uses,
              and shares information about you when you visit our website. By using {SITE_NAME}, you
              agree to the collection and use of information in accordance with this policy.
            </p>
          </div>

          {/* Policy Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-0">

            <Section title="1. Information We Collect">
              <p>We collect several types of information in connection with the operation of our site:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Account information:</strong> When you register, we collect your email address and a username of your choosing.</li>
                <li><strong>Usage data:</strong> We automatically collect information about how you interact with the site, including pages visited, articles read, time spent on pages, and referring URLs.</li>
                <li><strong>Device information:</strong> Browser type, operating system, IP address, and device identifiers are logged as part of standard web server operation.</li>
                <li><strong>Comments and submissions:</strong> Any content you voluntarily submit — comments, creator applications, newsletter sign-ups — is collected and stored.</li>
                <li><strong>Cookies:</strong> We and our advertising partners use cookies and similar tracking technologies (see Section 5 below).</li>
              </ul>
            </Section>

            <Section title="2. How We Use Your Information">
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Provide, maintain, and improve the {SITE_NAME} website and its features</li>
                <li>Authenticate users and manage accounts</li>
                <li>Send newsletters and editorial updates you have subscribed to</li>
                <li>Analyze traffic and usage patterns to understand and improve our content</li>
                <li>Display relevant advertising through Google AdSense and other ad networks</li>
                <li>Comply with legal obligations and enforce our terms</li>
              </ul>
            </Section>

            <Section title="3. Google AdSense and Third-Party Advertising">
              <p>
                {SITE_NAME} uses <strong>Google AdSense</strong> to display advertisements. Google AdSense
                uses cookies to serve ads based on your prior visits to this website and other websites on
                the internet. Google's use of advertising cookies enables it and its partners to serve ads to
                you based on your visit to our site and/or other sites on the Internet.
              </p>
              <p>
                You may opt out of personalised advertising by visiting{' '}
                <a
                  href="https://www.google.com/settings/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-700 underline"
                >
                  Google Ads Settings
                </a>{' '}
                or{' '}
                <a
                  href="https://www.aboutads.info/choices/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-700 underline"
                >
                  www.aboutads.info/choices
                </a>.
              </p>
              <p>
                Third-party vendors, including Google, use cookies to serve ads based on a user's prior
                visits to our website or other websites. Google's use of advertising cookies enables it and
                its partners to serve ads based on your visit to our site and/or other websites. For more
                information on how Google uses data when you use our site, visit{' '}
                <a
                  href="https://policies.google.com/technologies/partner-sites"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-700 underline"
                >
                  Google's Privacy &amp; Terms
                </a>.
              </p>
            </Section>

            <Section title="4. Analytics">
              <p>
                We may use analytics services (such as Google Analytics) to collect and analyze traffic
                data. These services use cookies and similar technologies to collect information about your
                use of the site and report website trends without identifying individual visitors.
                You can opt out of Google Analytics by installing the{' '}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-700 underline"
                >
                  Google Analytics opt-out browser add-on
                </a>.
              </p>
            </Section>

            <Section title="5. Cookies">
              <p>
                Cookies are small text files stored on your device when you visit a website. We use cookies to:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Keep you signed in to your account</li>
                <li>Remember your preferences</li>
                <li>Understand how you navigate the site</li>
                <li>Deliver and measure personalised advertisements via Google AdSense</li>
              </ul>
              <p>
                You can instruct your browser to refuse all cookies or to indicate when a cookie is being
                sent. However, if you do not accept cookies, some portions of our service may not function
                properly.
              </p>
            </Section>

            <Section title="6. Sharing of Information">
              <p>We do not sell your personal information. We may share information with:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Service providers:</strong> Supabase (database and authentication), Vercel (hosting), Stripe (payments), and Google (advertising and analytics) as necessary to operate the site.</li>
                <li><strong>Legal requirements:</strong> We may disclose information if required by law, court order, or governmental authority.</li>
                <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction.</li>
              </ul>
            </Section>

            <Section title="7. Data Retention">
              <p>
                We retain your account information for as long as your account is active or as needed to
                provide services. You may request deletion of your account and associated personal data
                at any time by contacting us at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-red-600 hover:text-red-700 underline">
                  {CONTACT_EMAIL}
                </a>.
              </p>
              <p>
                Certain data may be retained longer where required by law or for legitimate business
                purposes such as fraud prevention or dispute resolution.
              </p>
            </Section>

            <Section title="8. Children's Privacy">
              <p>
                {SITE_NAME} is not directed at children under the age of 13. We do not knowingly collect
                personal information from children under 13. If you are a parent or guardian and you believe
                your child has provided us with personal information, please contact us so that we can take
                the necessary actions.
              </p>
            </Section>

            <Section title="9. Your Rights">
              <p>Depending on your jurisdiction, you may have the right to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your personal data</li>
                <li>Object to or restrict certain processing of your data</li>
                <li>Data portability</li>
              </ul>
              <p>
                To exercise any of these rights, contact us at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-red-600 hover:text-red-700 underline">
                  {CONTACT_EMAIL}
                </a>.
              </p>
            </Section>

            <Section title="10. External Links">
              <p>
                Our website contains links to external websites. This Privacy Policy applies only to{' '}
                {SITE_NAME}. We are not responsible for the privacy practices or content of external
                sites and encourage you to review their privacy policies before providing any personal
                information.
              </p>
            </Section>

            <Section title="11. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes
                by posting the new policy on this page with an updated effective date. We encourage you
                to review this page periodically for any changes.
              </p>
            </Section>

            <Section title="12. Contact Us">
              <p>If you have any questions about this Privacy Policy, please contact us:</p>
              <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm">
                <p className="font-semibold text-gray-900">{SITE_NAME}</p>
                <p>
                  Email:{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-red-600 hover:text-red-700 underline">
                    {CONTACT_EMAIL}
                  </a>
                </p>
                <p>Website: <a href={SITE_URL} className="text-red-600 hover:text-red-700 underline">{SITE_URL}</a></p>
              </div>
            </Section>

          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            Last updated: {EFFECTIVE_DATE} &mdash; &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
