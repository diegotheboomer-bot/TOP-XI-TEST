'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { createCampaign } from '@/actions/brand';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';
import { Field, Input, Select } from '../ui/field';
import type { PayoutModel } from '@/lib/types';

const help: Record<PayoutModel, string> = {
  hybrid: 'A guaranteed base fee plus CPM on verified views.',
  pure_cpm: 'Creators earn only on verified views.',
  cps_performance: 'Creators earn a commission on attributed sales.',
};

export function CampaignForm() {
  const [state, action] = useFormState(createCampaign, undefined);
  const [model, setModel] = useState<PayoutModel>('hybrid');
  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Campaign title" className="sm:col-span-2">
          <Input name="title" required minLength={3} placeholder="Spring Cold Brew Launch" />
        </Field>
        <Field label="Payout model" hint={help[model]} className="sm:col-span-2">
          <Select name="payout_model" value={model} onChange={(e) => setModel(e.target.value as PayoutModel)}>
            <option value="hybrid">Hybrid — base + CPM</option>
            <option value="pure_cpm">Pure CPM</option>
            <option value="cps_performance">Cost per sale</option>
          </Select>
        </Field>
        <Field label="Base payout ($)" hint={model === 'hybrid' ? 'Paid once approved.' : 'Not used by this model.'}>
          <Input name="base_payout" type="number" min="0" step="0.01" defaultValue="0" disabled={model !== 'hybrid'} />
        </Field>
        <Field label="CPM rate ($ per 1,000 views)">
          <Input name="cpm_rate" type="number" min="0" step="0.01" defaultValue="0" disabled={model === 'cps_performance'} />
        </Field>
        <Field label="Sales commission (%)">
          <Input name="cps_commission_pct" type="number" min="0" max="100" step="0.1" defaultValue="0" disabled={model !== 'cps_performance'} />
        </Field>
        <Field label="Cap per creator ($)" hint="The most any one creator can earn.">
          <Input name="cpm_cap" type="number" min="1" step="0.01" required placeholder="400" />
        </Field>
        <Field label="Discount code prefix" hint="Each creator gets PREFIX + 4 characters.">
          <Input name="code_prefix" required pattern="[A-Za-z0-9]{2,12}" placeholder="BREW" className="uppercase" />
        </Field>
        <Field label="Brief & raw footage link" hint="Optional — S3 or Drive folder.">
          <Input name="asset_folder_url" type="url" placeholder="https://…" />
        </Field>
      </div>
      {/* Disabled inputs are not submitted; send zero for unused terms. */}
      {model !== 'hybrid' && <input type="hidden" name="base_payout" value="0" />}
      {model === 'cps_performance' && <input type="hidden" name="cpm_rate" value="0" />}
      {model !== 'cps_performance' && <input type="hidden" name="cps_commission_pct" value="0" />}
      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pendingText="Creating…">Create draft campaign</SubmitButton>
      </div>
    </form>
  );
}
