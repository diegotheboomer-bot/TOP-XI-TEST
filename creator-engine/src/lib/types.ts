export type PayoutModel = 'hybrid' | 'pure_cpm' | 'cps_performance';
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
  flag_reason: string | null;
  phash: string | null;
  last_synced_at: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  campaign_id: string;
  creator_id: string;
  ref_param: string;
  discount_code: string;
}
