'use client';

import { usePathname } from 'next/navigation';
import { viewAsCreator } from '@/actions/creator';
import { Select } from './ui/field';

export function CreatorSwitcher({ creators, current }: { creators: { id: string; name: string }[]; current: string }) {
  const path = usePathname();
  return (
    <form action={viewAsCreator} className="flex items-center gap-2">
      <input type="hidden" name="back" value={path} />
      <label htmlFor="as" className="shrink-0 text-sm text-zinc-500">
        Viewing as
      </label>
      <Select id="as" name="creatorId" defaultValue={current} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="h-10 w-44">
        {creators.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </form>
  );
}
