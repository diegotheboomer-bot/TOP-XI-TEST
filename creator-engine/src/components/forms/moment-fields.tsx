import { Input, Select } from '../ui/field';

/** Inputs for pinning a moment; shared by the app and the standalone demo. */
export function MomentFields({ idPrefix, submit }: { idPrefix: string; submit: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)_6.5rem_auto]">
      <Input id={`${idPrefix}-ts`} name="timestamp_label" placeholder="1:42:07" aria-label="Timestamp" className="font-mono" />
      <Input id={`${idPrefix}-title`} name="title" placeholder="What happens" aria-label="What happens" />
      <Select id={`${idPrefix}-max`} name="max_claims" defaultValue="3" aria-label="Clipper slots">
        {[1, 2, 3, 5, 10].map((n) => (
          <option key={n} value={n}>
            {n} {n === 1 ? 'slot' : 'slots'}
          </option>
        ))}
      </Select>
      <div className="col-span-2 flex justify-end sm:col-span-1">{submit}</div>
    </div>
  );
}
