const TINTS = [
  "repeating-linear-gradient(135deg,#F1D5DD 0 18px,#F6E3E8 18px 36px)",
  "repeating-linear-gradient(135deg,#F3E6C8 0 18px,#F8EFDB 18px 36px)",
  "repeating-linear-gradient(135deg,#EBCBD5 0 18px,#F3DDE3 18px 36px)",
];

/** Заполняет родителя (relative + aspect-ratio): фото либо розовая заглушка с узором. */
export function Photo({ src, alt, index = 0, className = "" }: { src: string | null; alt: string; index?: number; className?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`ph absolute inset-0 h-full w-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`ph absolute inset-0 ${className}`}
      style={{ background: TINTS[index % 3] }}
    />
  );
}
