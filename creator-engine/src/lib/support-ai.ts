// The support assistant: Gemini answers from what Atlas actually does, and offers next steps.
// It never promises refunds or money moves; those go to a human through a ticket.
import { FAQ } from '@/components/faq';
import { TIERS, TIER_LABEL, TIER_PERKS, TIER_RULES, holdLabel } from './tiers';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}
export interface AssistantReply {
  answer: string;
  /** Short follow-up buttons the person can tap. */
  options: string[];
  /** The assistant thinks a person should look at this. */
  suggestHuman: boolean;
}

const tiers = TIERS.map((t) => {
  const r = TIER_RULES[t];
  const p = TIER_PERKS[t];
  return `${TIER_LABEL[t]}: needs ${r.views} views, ${r.approved} approved clips, ${Math.round(r.approvalRate * 100)}% approval${r.noFraud ? ', no fraud flags in 90 days' : ''}; ${p.feePct}% payout fee, paid ${holdLabel(p.holdHours)} after approval, ${p.cashoutsPerWeek === Infinity ? 'unlimited' : p.cashoutsPerWeek} cash-outs a week.`;
}).join('\n');

const SYSTEM = `You are the support assistant for Atlas Clipping (atlasclipping.com), a marketplace where streamers, brands, musicians, studios and agencies fund clip campaigns and clippers post short videos on TikTok, YouTube Shorts and Instagram Reels and get paid per 1,000 verified views.

Facts you can rely on:
- Campaign owners set a pay model (per 1K views, per approved clip, or a pool split by views), add a budget (held for clippers), and approve every clip by hand. Only views reported by TikTok, YouTube or Instagram count; screenshots don't.
- After approval there's a hold, then the clip is paid automatically or the clipper cashes out from Earnings. The streamer can flag a clip during the hold.
- Clipper tiers:
${tiers}
- Payouts go to a bank account (IBAN) through Stripe; debit card only where Stripe supports it. First payout to a new account can take up to about 7 days, then usually 2-3 business days. No separate Stripe account is needed; the payout form creates one.
- Unspent budget is refunded to the original card when a campaign is cancelled; card processing fees are not refundable.
- Clips are checked against the clipper's own connected account and must be posted after joining the campaign. Bot-like views or duplicates are flagged.
- FAQ:
${FAQ.map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n')}

Rules:
- Be short, friendly and concrete. Plain words, no jargon. 2-5 sentences.
- Never invent policies, amounts or timelines beyond the facts above. If you don't know, say so and suggest talking to a person.
- You can't see accounts, move money, approve, unflag or refund anything. For disputes between a clipper and a campaign owner, missing money, refunds, bans or anything account-specific, set suggestHuman to true.
- Reply ONLY with JSON: {"answer": string, "options": string[] (2-4 short follow-up questions the person might tap, under 40 characters each), "suggestHuman": boolean}.`;

/** Asks Gemini. Returns a safe fallback if it isn't configured or fails. */
export async function askAssistant(history: ChatTurn[]): Promise<AssistantReply> {
  const key = process.env.GEMINI_API_KEY?.trim();
  const fallback: AssistantReply = {
    answer: 'I can’t answer right now. You can open a ticket and the Atlas team will reply by email.',
    options: [],
    suggestHuman: true,
  };
  if (!key) return fallback;
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: history.slice(-12).map((t) => ({ role: t.role === 'user' ? 'user' : 'model', parts: [{ text: t.text.slice(0, 2000) }] })),
        generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: 600 },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    const parsed = JSON.parse(raw) as Partial<AssistantReply>;
    return {
      answer: String(parsed.answer ?? '').slice(0, 1500) || fallback.answer,
      options: Array.isArray(parsed.options) ? parsed.options.map(String).slice(0, 4) : [],
      suggestHuman: !!parsed.suggestHuman,
    };
  } catch {
    return fallback;
  }
}
