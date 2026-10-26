export function Marquee({ words }: { words: string[] }) {
  const list = words.filter((w) => w.trim());
  if (list.length === 0) return null;
  // минимум 8 элементов в половине трека, чтобы строка не обрывалась на широких экранах
  const reps = Math.max(1, Math.ceil(8 / list.length));
  const half = Array.from({ length: reps }, () => list).flat();
  const items = [...half, ...half];
  return (
    <div aria-hidden="true" className="mt-6 overflow-hidden border-y border-line bg-cream py-4">
      <div className="marquee-track flex w-max">
        {items.map((t, i) => (
          <span
            key={i}
            className="flex items-center gap-9 whitespace-nowrap pr-9 text-lg font-extrabold uppercase tracking-[0.14em] text-burgundy"
          >
            {t}
            <span className="size-2.5 rounded-full bg-pink" />
          </span>
        ))}
      </div>
    </div>
  );
}
