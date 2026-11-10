import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';
import { LEGAL } from '@/lib/legal';
import { noServiceFee, platformFeePercent } from '@/lib/stripe';

export const metadata: Metadata = { title: 'Terms of Service · Atlas Clipping' };

export default function TermsPage() {
  const { companyName, contactEmail, effectiveDate, governingLaw, minimumAge } = LEGAL;
  const fee = platformFeePercent();
  return (
    <LegalPage title="Terms of Service" updated={effectiveDate}>
      <section>
        <p>
          These terms are an agreement between you and {companyName} (“we”) for using Atlas Clipping (atlasclipping.com, also called Atlas Clips). By creating an
          account you accept them. If you don’t agree, don’t use the service.
        </p>
      </section>

      <section>
        <h2>Accounts</h2>
        <ul>
          <li>You must be at least {minimumAge} and able to enter a contract.</li>
          <li>Keep your email and password secure. You’re responsible for what happens on your account.</li>
          <li>One person or business per account. Don’t create accounts to get around limits or bans.</li>
        </ul>
      </section>

      <section>
        <h2>For streamers</h2>
        <ul>
          <li>You fund a campaign before it goes live. {noServiceFee() ? 'You pay the budget plus Stripe’s card processing cost, shown before you pay. There is currently no service fee; the whole budget is for clippers.' : `You pay the budget plus a ${fee}% service fee, shown before you pay. The fee covers card processing and payouts; the whole budget is for clippers.`}</li>
          <li>Clippers are paid for views their clips get, at your rate and up to your cap, from the campaign budget.</li>
          <li>You can review clips. Clean clips are approved automatically after the review window you set.</li>
          <li>You give clippers in your campaign permission to use your stream footage to make clips for that campaign.</li>
          <li>
            Refunds are partial. If you cancel a campaign, or it ends with budget left, the unspent budget is refunded to your original payment method. The service fee
            is not refunded, because it pays for card processing (Stripe doesn’t return its fees on refunds) and payouts. Money clippers have already earned is not
            refunded: it is paid to them.
          </li>
          <li>
            The service starts as soon as your campaign is funded and live. If you are a consumer in the EU, you ask us to start right away and accept that you lose
            your right of withdrawal for the part already provided; you can still cancel at any time as described above.
          </li>
        </ul>
      </section>

      <section>
        <h2>For clippers</h2>
        <ul>
          <li>Post your own edits, follow each campaign’s rules, and only submit clips from accounts you control.</li>
          <li>You’re responsible for following advertising law and each platform’s rules on disclosing paid content (for example TikTok’s content disclosure setting).</li>
          <li>Earnings are based on views reported by TikTok, YouTube or Instagram. Screenshots and self-reported numbers aren’t accepted. Once a clip has been approved for 3 days you can cash out its earnings whenever you like: one cash-out every 7 days is free, extra ones cost $1 each, taken from the amount sent (you need at least $10 ready; anything left when a campaign ends is sent automatically), and the streamer can’t withdraw money you’ve earned.</li>
          <li>We don’t charge clippers a fee. Payouts go to a bank account or debit card through Stripe, or to PayPal or Venmo through PayPal; that provider’s own terms apply to your account there. Keep your payout details correct: a payout PayPal can’t deliver, or that isn’t claimed within 30 days, comes back to the campaign until you update them.</li>
          <li>You’re responsible for taxes on what you earn.</li>
          <li>We don’t promise any level of views or income. Examples on the site are illustrations only; most clips earn little or nothing.</li>
        </ul>
      </section>

      <section>
        <h2>Not allowed</h2>
        <ul>
          <li>Buying views, using bots, or re-uploading someone else’s clip.</li>
          <li>Paying to promote or boost a clip (for example TikTok Promote, Spark Ads or YouTube ads). Only organic views earn.</li>
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
        <p>
          Payments are processed by Stripe; payouts by Stripe or PayPal. Card payments can be disputed; if a funding payment is reversed, we may hold payouts from that
          campaign. Streamers can cancel a campaign at any time: unspent budget is refunded to the original payment method, the service fee is not, and money clippers
          have already earned is still paid to them.
        </p>
      </section>

      <section>
        <h2>The service</h2>
        <p>
          We work to keep Atlas Clipping running and accurate, but it’s provided “as is” and “as available”. View counts come from TikTok, YouTube and Instagram,
          and payments from Stripe and PayPal; we aren’t responsible for their errors, outages or decisions. To the extent the law allows, we aren’t liable for
          indirect or consequential losses or lost profits, and our total liability to you is limited to the fees you paid us in the 12 months before the claim (for
          clippers, which pay no fees, €100). Nothing in these terms limits liability that can’t be limited by law, or your rights as a consumer.
        </p>
      </section>

      <section>
        <h2>Ending your account</h2>
        <p>You can stop using Atlas Clipping at any time. We may suspend or close accounts that break these terms. Earned, valid payouts are still paid.</p>
      </section>

      <section>
        <h2>Your responsibility</h2>
        <p>
          You’re responsible for the content you post and for following the law and each platform’s rules. If a claim is made against us because of your content or
          because you broke these terms, you agree to cover the reasonable costs it causes us, to the extent the law allows.
        </p>
      </section>

      <section>
        <h2>Law and changes</h2>
        <p>
          These terms are governed by the laws of {governingLaw}, and disputes go to the Portuguese courts, without taking away any protection the law of your own
          country gives you as a consumer. EU consumers can also use the EU’s online dispute resolution platform. We may update these terms; we’ll change the date
          above and tell you about significant changes. Questions: {contactEmail}.
        </p>
      </section>
    </LegalPage>
  );
}
