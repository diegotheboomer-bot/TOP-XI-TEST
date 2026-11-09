// Server-side demo mode (no Supabase keys): one in-memory store per server process.
// Resets on restart or via "Reset" in the header. Logic lives in demo-core.ts.
//
// The local demo uses well-known streamers as example creators, only in ordinary,
// positive rows. Fraud examples use made-up handles. Brands and numbers are invented.
import { cookies } from 'next/headers';
import * as core from './demo-core';
import { platformFeePercent } from './stripe';
import type { ActionState } from '@/actions/result';
import type { Campaign } from './types';

export { DEMO_BRAND_ID } from './demo-core';

const ROSTER: core.CreatorSeed[] = [
  { handle: 'kaicenat', displayName: 'Kai Cenat', followers: 14_200_000 },
  { handle: 'ishowspeed', displayName: 'IShowSpeed', followers: 31_500_000 },
  { handle: 'pokimane', displayName: 'Pokimane', followers: 7_900_000 },
  { handle: 'ludwig', displayName: 'Ludwig', followers: 2_400_000 },
  { handle: 'valkyrae', displayName: 'Valkyrae', followers: 5_100_000 },
  { handle: 'xqc', displayName: 'xQc', followers: 3_300_000 },
  { handle: 'sykkuno', displayName: 'Sykkuno', followers: 2_800_000 },
];
const CREATOR_COOKIE = 'demo_creator';

const g = globalThis as unknown as { __creatorEngineDemo?: core.DemoState };
const db = () => (g.__creatorEngineDemo ??= core.seedDemo(ROSTER, platformFeePercent()));

export function resetDemo() {
  g.__creatorEngineDemo = core.seedDemo(ROSTER, platformFeePercent());
}

export function currentCreatorId(): string {
  const id = cookies().get(CREATOR_COOKIE)?.value;
  return id && core.hasCreator(db(), id) ? id : core.defaultCreatorId(db());
}
export function setCurrentCreator(id: string) {
  if (core.hasCreator(db(), id)) cookies().set(CREATOR_COOKIE, id, { path: '/', sameSite: 'lax' });
}
export const demoCreators = () => core.demoCreators(db());

export const brandDashboard = () => core.brandDashboard(db());
export const campaignDetail = (id: string) => core.campaignDetail(db(), id);
export const creatorDashboard = () => core.creatorDashboard(db(), currentCreatorId());
export const creatorCampaign = (id: string) => core.creatorCampaign(db(), currentCreatorId(), id);

export const createCampaign = (input: Parameters<typeof core.createCampaign>[1]) => core.createCampaign(db(), input);
export const setCampaignStatus = (id: string, status: Campaign['status']): ActionState => core.setCampaignStatus(db(), id, status);
export const fundEscrow = (id: string, amount: number) => core.fundEscrow(db(), id, amount);
export const connectStore = (id: string, domain: string) => core.connectStore(db(), id, domain);
export const reviewSubmission = (id: string, d: 'approve' | 'flag') => core.reviewSubmission(db(), id, d);
export const releasePayout = (id: string) => core.releasePayout(db(), id);
export const simulateSync = (id: string) => core.simulateSync(db(), id);
export const simulateSale = (id: string) => core.simulateSale(db(), id);
export const joinCampaign = (campaignId: string) => core.joinCampaign(db(), currentCreatorId(), campaignId);
export const submitVideo = (campaignId: string, url: string) => core.submitVideo(db(), currentCreatorId(), campaignId, url);
export const connectTikTok = () => core.connectTikTok(db(), currentCreatorId());
export const enablePayouts = () => core.enablePayouts(db(), currentCreatorId());
