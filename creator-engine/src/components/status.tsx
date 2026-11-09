import { Badge, type Tone } from './ui/badge';
import type { CampaignStatus, SubmissionStatus } from '@/lib/types';

const submission: Record<SubmissionStatus, [Tone, string]> = {
  pending_review: ['amber', 'In review'],
  live_tracking: ['green', 'Live'],
  flagged: ['red', 'Flagged'],
  paid: ['blue', 'Paid'],
};
const campaign: Record<CampaignStatus, [Tone, string]> = {
  draft: ['neutral', 'Draft'],
  active: ['green', 'Active'],
  paused: ['amber', 'Paused'],
  completed: ['blue', 'Ended'],
};

export const SubmissionBadge = ({ status }: { status: SubmissionStatus }) => (
  <Badge tone={submission[status][0]} dot>
    {submission[status][1]}
  </Badge>
);

export const CampaignBadge = ({ status }: { status: CampaignStatus }) => (
  <Badge tone={campaign[status][0]} dot>
    {campaign[status][1]}
  </Badge>
);

export function FraudBadge({ score }: { score: number }) {
  const tone: Tone = score >= 70 ? 'red' : score >= 30 ? 'amber' : 'neutral';
  return <Badge tone={tone}>Risk {score}</Badge>;
}
