export type PayoutModel = 'hybrid' | 'pure_cpm' | 'cps_performance' | 'per_post' | 'pool';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type SubmissionStatus = 'pending_review' | 'live_tracking' | 'flagged' | 'paid';
export type Platform = 'tiktok' | 'instagram' | 'youtube';

export interface Campaign {
  id: string;
  brand_id: string;
  title: string;
  payout_model: PayoutModel;
  escrow_balance: number;
  base_payout: number;
  cpm_rate: number;
  cpm_cap: number;
  cps_commission_pct: number;
  code_prefix: string;
  pixel_id: string | null;
  asset_folder_url: string | null;
  status: CampaignStatus;
  created_at: string;
  /** Uploaded cover image (older campaigns); a designed cover is shown when null. */
  thumbnail_url: string | null;
  cover_color: string;
  brief: string | null;
  requirements: string[];
  /** Legacy: clips are now always approved by the streamer. */
  auto_approve_hours?: number;
  /** Links and uploaded images, videos or files for clippers. */
  reference_items?: import('./references').Reference[];
  /** Clips earning less than this aren't paid (Per 1K views). */
  min_payout?: number;
  /** Pinned stream moments for clippers to claim. */
  moments_enabled?: boolean;
  /** Rate per 1K views by platform; a missing platform uses cpm_rate. */
  platform_rates?: Partial<Record<Platform, number>>;
  /** Where clippers may post for this campaign. */
  platforms: Platform[];
  /** Kinds of video the streamer wants (clipping, faceless, …). */
  content_types?: string[];
  /** The streamer's niche (Gaming, IRL, …). */
  category?: string | null;
}

/** A moment the streamer pinned from a stream for clippers to cut. */
export interface Moment {
  id: string;
  campaign_id: string;
  title: string;
  timestamp_label: string;
  vod_url: string | null;
  max_claims: number;
  /** creator ids that claimed it */
  claimed_by: string[];
}

export interface Submission {
  id: string;
  campaign_id: string;
  creator_id: string;
  platform: Platform;
  video_url: string;
  social_platform_video_id: string;
  current_view_count: number;
  current_like_count: number;
  current_comment_count: number;
  current_conversions: number;
  payout_earned: number;
  payout_transferred: number;
  status: SubmissionStatus;
  fraud_score: number;
  /** The streamer approved it after a low-engagement hold; don't hold it again. */
  engagement_cleared: boolean;
  /** Cover image of the clip, refreshed by the sync. */
  cover_url?: string | null;
  flag_reason: string | null;
  phash: string | null;
  /** Caption carries an ad disclosure (#ad, #sponsored, …). */
  has_disclosure: boolean;
  last_synced_at: string | null;
  /** When the clip was approved (by the streamer or automatically); starts the payout hold. */
  approved_at: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  campaign_id: string;
  creator_id: string;
  ref_param: string;
  discount_code: string;
}
