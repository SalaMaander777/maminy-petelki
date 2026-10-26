import type { Promo } from "@/lib/api-types";
import { formatDate } from "@/lib/format";
import { Photo } from "./Photo";
import { stagger } from "./PageHeading";

export function PromoCard({ item, index = 0 }: { item: Promo; index?: number }) {
  const until = formatDate(item.valid_until);
  return (
    <article className="card anim-rise-item flex flex-col gap-[18px]" style={stagger(index)}>
      <div className="frame relative aspect-[4/3] overflow-hidden rounded-[20px] bg-[#F1E4D0]">
        <Photo src={item.photo} alt={item.photo ? item.title : ""} index={index} />
        {item.badge && (
          <span className="absolute left-3.5 top-3.5 rounded-full bg-burgundy px-4 py-1.5 text-lg font-extrabold text-bg">
            {item.badge}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        <h2 className="m-0 text-[22px] font-extrabold text-ink">{item.title}</h2>
        {item.description && <p className="m-0 text-[15px] leading-normal text-muted">{item.description}</p>}
        {until && (
          <p className="m-0 border-t border-line pt-3 text-sm font-extrabold text-burgundy">
            Действует до <time dateTime={item.valid_until ?? undefined}>{until}</time>
          </p>
        )}
      </div>
    </article>
  );
}
