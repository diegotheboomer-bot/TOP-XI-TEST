// Shown instantly while the next page loads, so taps feel immediate.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-lg bg-zinc-200/70" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-zinc-200/60" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-zinc-200/50" />
    </div>
  );
}
