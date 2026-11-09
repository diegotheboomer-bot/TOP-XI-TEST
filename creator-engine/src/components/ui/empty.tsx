export function Empty({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-zinc-200 px-6 py-10 text-center">
      <span className="grid size-10 place-items-center rounded-lg bg-zinc-100 text-zinc-500 [&>svg]:size-5">{icon}</span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
