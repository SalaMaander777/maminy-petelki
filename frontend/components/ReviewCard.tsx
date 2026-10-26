import type { Review } from "@/lib/api-types";
import { Photo } from "./Photo";
import { stagger } from "./PageHeading";

export function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div role="img" aria-label={`Оценка: ${r} из 5`} className="flex gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill={i < r ? "#7B2346" : "none"} stroke="#7B2346" strokeWidth="1.8" strokeLinejoin="round">
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
      ))}
    </div>
  );
}

export function ReviewCard({ item, index = 0 }: { item: Review; index?: number }) {
  return (
    <figure className="card anim-rise-item m-0 flex h-full flex-col gap-4 rounded-[20px] bg-pink-soft p-6 sm:p-7" style={stagger(index)}>
      {item.rating != null && <Stars rating={item.rating} />}
      <blockquote className="m-0 flex-1 text-base leading-relaxed text-ink">
        <p className="m-0 whitespace-pre-line">«{item.text}»</p>
      </blockquote>
      <figcaption className="flex items-center gap-3">
        {item.photo && (
          <span className="relative size-14 shrink-0 overflow-hidden rounded-full bg-[#F1E4D0]">
            <Photo src={item.photo} alt={`Фото: ${item.author}`} index={index} />
          </span>
        )}
        <span className="text-lg font-extrabold text-burgundy">{item.author}</span>
      </figcaption>
    </figure>
  );
}
