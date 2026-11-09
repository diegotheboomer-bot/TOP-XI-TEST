import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: 'Privacy Policy · Atlas Clips' };

export default function PrivacyPage() {
  const { companyName, contactEmail, effectiveDate, minimumAge } = LEGAL;
  return (
    <LegalPage title="Privacy Policy" updated={effectiveDate}>
      <section>
        <p>
          Atlas Clips is operated by {companyName} (“we”). It lets streamers run clipping campaigns and pays clippers for the views their clips get.
          This policy explains what we collect, why, and the choices you have. Questions: {contactEmail}.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account:</strong> your email address (we sign you in with an emailed link), your display or channel name, and whether you stream or clip.</li>
          <li>
            <strong>TikTok, if you connect it:</strong> your TikTok account ID, display name and follower count, and the access tokens TikTok gives us, which we store
            encrypted. For videos you submit we read the view, like, comment and share counts, the caption and the cover image.
          </li>
          <li><strong>YouTube Shorts you submit:</strong> the video’s public statistics, title and description, through the YouTube API Services.</li>
          <li><strong>Clips:</strong> the links you submit, their view history, review status and earnings.</li>
          <li>
            <strong>Payments:</strong> handled by Stripe, and by PayPal for clippers who choose PayPal or Venmo. Card and bank details go to Stripe, not to us. We keep
            your Stripe account ID, whether payouts are set up, the PayPal email or Venmo mobile number you give us for payouts, and a record of deposits, refunds and
            payouts.
          </li>
          <li><strong>Merch orders (only if a streamer connects a store):</strong> the order number, total, currency and the clip code or link used. No customer names or addresses.</li>
          <li><strong>Cookies and storage:</strong> a cookie that keeps you signed in, and your light or dark mode choice saved in your browser.</li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To run campaigns: confirm a clip is yours, track its views, apply the campaign’s rules and calculate earnings.</li>
          <li>To prevent fraud: we compare a fingerprint of each clip’s cover image to catch re-uploads, and look for bot-like view spikes.</li>
          <li>To pay clippers and charge streamers, through Stripe or PayPal.</li>
          <li>To contact you about your account, and to meet legal obligations.</li>
        </ul>
        <p className="mt-3">We don’t sell your personal information and we don’t use it for advertising.</p>
      </section>

      <section>
        <h2>Who can see what</h2>
        <ul>
          <li>Streamers see the display names, submitted clips, view counts and earnings of clippers in their campaigns.</li>
          <li>Clippers see campaign details, budgets and which moments are claimed.</li>
          <li>
            Service providers process data for us: Supabase (database and sign-in), Stripe (payments), PayPal (PayPal and Venmo payouts), our hosting provider, and TikTok and Google (YouTube) when we
            read video statistics.
          </li>
        </ul>
      </section>

      <section>
        <h2>YouTube</h2>
        <p>
          We use YouTube API Services to read statistics for Shorts you submit. By submitting a YouTube video you agree to the{' '}
          <a href="https://www.youtube.com/t/terms">YouTube Terms of Service</a>. Google’s handling of data is covered by the{' '}
          <a href="https://policies.google.com/privacy">Google Privacy Policy</a>.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <ul>
          <li>Disconnect TikTok any time in your TikTok settings. We stop reading your videos, and you can ask us to delete the stored tokens.</li>
          <li>Ask for a copy of your data, a correction, or deletion of your account by emailing {contactEmail}.</li>
          <li>We keep payment and payout records as long as tax and accounting laws require, even after an account is deleted.</li>
        </ul>
      </section>

      <section>
        <h2>Security</h2>
        <p>Connected-account tokens are encrypted at rest, database access is limited by role, and payments are handled by Stripe. No system is perfectly secure, so please keep your email account safe.</p>
      </section>

      <section>
        <h2>Age</h2>
        <p>Atlas Clips is for people aged {minimumAge} and over.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>If we change this policy we’ll update the date above, and tell you by email when the change is significant.</p>
      </section>
    </LegalPage>
  );
}
