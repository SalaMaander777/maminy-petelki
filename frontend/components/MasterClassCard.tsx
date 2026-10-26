import type { MasterClass } from "@/lib/api-types";
import { formatDateTime, formatPrice, isPast, seatsLabel } from "@/lib/format";
import { Photo } from "./Photo";
import { stagger } from "./PageHeading";

export function MasterClassCard({ item, index = 0, now }: { item: MasterClass; index?: number; now?: Date }) {
  const past = isPast(item.starts_at, now);
  const when = formatDateTime(item.starts_at);
  const price = formatPrice(item.price);
  const facts = [item.duration, price, item.seats != null ? seatsLabel(item.seats) : null].filter(Boolean) as string[];
  const href = item.signup_url?.trim() || "#contacts";
  const external = href.startsWith("http");
  return (
    <article className={`card anim-rise-item flex flex-col gap-[18px] ${past ? "past" : ""}`} style={stagger(index)}>
      <div className="frame relative aspect-[4/3] overflow-hidden rounded-[20px] bg-[#F1E4D0]">
        <Photo src={item.photo} alt={item.photo ? item.title : ""} index={index} />
        {past && (
          <span className="absolute left-3.5 top-3.5 rounded-full bg-ink px-4 py-1.5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-bg">
            Прошёл
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        {when && (
          <time dateTime={item.starts_at ?? undefined} className="text-base font-extrabold text-burgundy">
            {when}
          </time>
        )}
        <h2 className="m-0 text-[22px] font-extrabold text-ink">{item.title}</h2>
        {facts.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0 text-sm font-semibold text-muted">
            {facts.map((f) => (
              <li key={f} className="rounded-full bg-pink-soft px-3 py-1">{f}</li>
            ))}
          </ul>
        )}
        {item.description && <p className="m-0 text-[15px] leading-normal text-muted">{item.description}</p>}
        {!past && (
          <div className="border-t border-line pt-3">
            <a
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="sweep sweep-b box-border inline-flex min-h-11 items-center rounded-full border-2 border-burgundy px-[26px] py-[9px] text-sm font-extrabold uppercase tracking-[0.06em] text-burgundy"
            >
              Записаться
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
