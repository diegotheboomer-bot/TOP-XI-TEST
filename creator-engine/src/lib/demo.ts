// Server-side demo mode (no Supabase keys): one in-memory store per server process.
// Resets on restart or via "Reset" in the header. Logic lives in demo-core.ts.
//
// Streamers, clippers and every number are invented. Campaign photos are CC0
// (public/demo/thumbs/credits.json).
import { cookies } from 'next/headers';
import * as core from './demo-core';
import { platformFeePercent } from './stripe';
import type { ActionState } from '@/actions/result';
import type { Campaign } from './types';

export { DEMO_BRAND_ID } from './demo-core';

const CREATOR_COOKIE = 'demo_creator';

const g = globalThis as unknown as { __creatorEngineDemo?: core.DemoState };
const db = () => (g.__creatorEngineDemo ??= core.seedDemo(platformFeePercent(), '/demo/thumbs/'));

export function resetDemo() {
  g.__creatorEngineDemo = core.seedDemo(platformFeePercent(), '/demo/thumbs/');
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
export const cancelCampaign = (id: string) => core.cancelCampaign(db(), id);
export const connectStore = (id: string, domain: string) => core.connectStore(db(), id, domain);
export const reviewSubmission = (id: string, d: 'approve' | 'flag') => core.reviewSubmission(db(), id, d);
export const releasePayout = (id: string) => core.releasePayout(db(), id);
export const simulateSync = (id: string) => core.simulateSync(db(), id);
export const simulateSale = (id: string) => core.simulateSale(db(), id);
export const joinCampaign = (campaignId: string) => core.joinCampaign(db(), currentCreatorId(), campaignId);
export const submitVideo = (campaignId: string, url: string) => core.submitVideo(db(), currentCreatorId(), campaignId, url);
export const connectTikTok = () => core.connectTikTok(db(), currentCreatorId());
export const enablePayouts = () => core.enablePayouts(db(), currentCreatorId());
export const addMoment = (campaignId: string, input: Parameters<typeof core.addMoment>[2]) => core.addMoment(db(), campaignId, input);
export const claimMoment = (momentId: string) => core.claimMoment(db(), currentCreatorId(), momentId);
