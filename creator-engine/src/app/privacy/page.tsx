import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: 'Privacy Policy · Atlas Clipping' };

export default function PrivacyPage() {
  const { companyName, contactEmail, effectiveDate, minimumAge } = LEGAL;
  return (
    <LegalPage title="Privacy Policy" updated={effectiveDate}>
      <section>
        <p>
          Atlas Clipping (atlasclipping.com) is run by {companyName} (“we”), the data controller. It lets streamers run clipping campaigns and pays clippers for the
          views their clips get. This policy explains what we collect, why, and your rights under the EU General Data Protection Regulation (GDPR). Questions or
          requests: {contactEmail}.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account:</strong> your email address and password (handled by Supabase, never stored in plain text), your display or channel name, and whether you stream or clip.</li>
          <li>
            <strong>Instagram, if you connect it:</strong> your Instagram account ID, username and follower count, your posts’ captions, like and comment counts and Reel views, and the access token Instagram gives us, which we store encrypted. We only read; we never post.</li>
          <li>
            <strong>TikTok, if you connect it:</strong> your TikTok account ID, display name and follower count, and the access tokens TikTok gives us, which we store
            encrypted. For videos you submit we read the view, like, comment and share counts, the caption and the cover image.
          </li>
          <li><strong>YouTube, if you connect it:</strong> your channel ID, name and subscriber count. For Shorts you submit, the video’s public statistics, title, description, publish date and thumbnail, through the YouTube API Services.</li>
          <li><strong>Video information:</strong> for every clip you submit, its link, platform, cover image, caption, publish date, and view, like, comment and share counts over time.</li>
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
        <p className="mt-3">
          Legal bases (GDPR): running the service you signed up for (contract); fraud prevention and keeping the service secure (legitimate interests); and tax,
          accounting and anti-money-laundering records (legal obligation).
        </p>
      </section>

      <section>
        <h2>Who can see what</h2>
        <ul>
          <li>Streamers see the display names, submitted clips, view counts and earnings of clippers in their campaigns.</li>
          <li>Clippers see campaign details, budgets and which moments are claimed.</li>
          <li>
            Service providers process data for us: Supabase (database and sign-in), Stripe (payments), PayPal (PayPal and Venmo payouts), our hosting provider, and TikTok, Meta (Instagram) and Google (YouTube) when we
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
          <li>Disconnect TikTok or Instagram any time in their settings, or reconnect a different account. We stop reading your videos, and you can ask us to delete the stored tokens.</li>
          <li>You have the right to access, correct, delete or export your data, and to object to or restrict how we use it. Email {contactEmail}; we reply within one month.</li>
          <li>You can complain to the Portuguese data protection authority (CNPD, cnpd.pt) or the authority in your own EU country.</li>
          <li>We keep your data while your account is open. After you delete it we remove it, except payment and payout records, which Portuguese law requires us to keep for up to 10 years.</li>
          <li>Some providers (Stripe, PayPal, Google, Meta, TikTok, our host) may process data outside the EU. They do so under the EU’s Standard Contractual Clauses or another legal safeguard.</li>
        </ul>
      </section>

      <section>
        <h2>Security</h2>
        <p>Connected-account tokens are encrypted at rest, database access is limited by role, and payments are handled by Stripe. No system is perfectly secure, so please keep your email account safe.</p>
      </section>

      <section>
        <h2>Age</h2>
        <p>Atlas Clipping is for people aged {minimumAge} and over. We don’t knowingly collect data from anyone younger.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>If we change this policy we’ll update the date above, and tell you by email when the change is significant.</p>
      </section>
    </LegalPage>
  );
}
