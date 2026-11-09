import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';
import { LEGAL } from '@/lib/legal';
import { platformFeePercent } from '@/lib/stripe';

export const metadata: Metadata = { title: 'Terms of Service · Creator Engine' };

export default function TermsPage() {
  const { companyName, contactEmail, effectiveDate, governingLaw, minimumAge } = LEGAL;
  const fee = platformFeePercent();
  return (
    <LegalPage title="Terms of Service" updated={effectiveDate}>
      <section>
        <p>
          These terms are an agreement between you and {companyName} for using Creator Engine. By creating an account you accept them. If you don’t agree,
          don’t use the service.
        </p>
      </section>

      <section>
        <h2>Accounts</h2>
        <ul>
          <li>You must be at least {minimumAge} and able to enter a contract.</li>
          <li>Keep your sign-in email secure. You’re responsible for what happens on your account.</li>
          <li>One person or business per account. Don’t create accounts to get around limits or bans.</li>
        </ul>
      </section>

      <section>
        <h2>For streamers</h2>
        <ul>
          <li>You fund a campaign before it goes live. You pay the budget plus a {fee}% platform fee, shown before you pay. The whole budget is for clippers.</li>
          <li>Clippers are paid for views their clips get, at your rate and up to your cap, from the campaign budget.</li>
          <li>You can review clips. Clean clips that carry #ad are approved automatically after the review window you set.</li>
          <li>You give clippers in your campaign permission to use your stream footage to make clips for that campaign.</li>
          <li>Leftover budget when a campaign ends: [describe your refund policy].</li>
        </ul>
      </section>

      <section>
        <h2>For clippers</h2>
        <ul>
          <li>Post your own edits, follow each campaign’s rules, and only submit clips from accounts you control.</li>
          <li>Mark sponsored clips clearly, for example with #ad, as advertising law requires.</li>
          <li>Earnings are based on views reported by TikTok or YouTube. Screenshots and self-reported numbers aren’t accepted.</li>
          <li>We don’t charge clippers a fee. Payouts go through Stripe, and Stripe’s own terms apply to your payout account.</li>
          <li>You’re responsible for taxes on what you earn.</li>
        </ul>
      </section>

      <section>
        <h2>Not allowed</h2>
        <ul>
          <li>Buying views, using bots, or re-uploading someone else’s clip.</li>
          <li>Content that is illegal, hateful, sexual involving minors, or that infringes someone else’s rights.</li>
          <li>Breaking TikTok’s, YouTube’s or Instagram’s rules when you post.</li>
          <li>Interfering with the service or other users’ accounts.</li>
        </ul>
        <p className="mt-3">We can hold or cancel earnings tied to these, flag or remove clips, and suspend accounts.</p>
      </section>

      <section>
        <h2>Content</h2>
        <p>
          You keep ownership of what you create. You let us display it in the service so campaigns can run. Streamers keep ownership of their streams; clippers keep
          ownership of their edits.
        </p>
      </section>

      <section>
        <h2>Payments</h2>
        <p>Payments and payouts are processed by Stripe. Card payments can be disputed; if a funding payment is reversed, we may hold payouts from that campaign.</p>
      </section>

      <section>
        <h2>The service</h2>
        <p>
          We work to keep Creator Engine running and accurate, but it’s provided as it is. To the extent the law allows, we aren’t liable for indirect losses or for
          errors in data supplied by TikTok, YouTube or Stripe.
        </p>
      </section>

      <section>
        <h2>Ending your account</h2>
        <p>You can stop using Creator Engine at any time. We may suspend or close accounts that break these terms. Earned, valid payouts are still paid.</p>
      </section>

      <section>
        <h2>Law and changes</h2>
        <p>
          These terms are governed by the laws of {governingLaw}. We may update them; we’ll change the date above and tell you about significant changes. Questions:{' '}
          {contactEmail}.
        </p>
      </section>
    </LegalPage>
  );
}
