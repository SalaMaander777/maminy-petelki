import Link from "next/link";
import type { Settings } from "@/lib/api-types";
import { DEFAULT_SETTINGS } from "@/lib/site";

export function Hero({ settings = DEFAULT_SETTINGS }: { settings?: Settings }) {
  const { hero_title, hero_text, hero_cta, hero_photo } = settings;
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pt-10 sm:px-10 md:px-20" aria-label="Главная">
      <div className="relative flex h-[520px] flex-col items-start justify-end gap-3.5 overflow-hidden rounded-[28px] bg-pink-soft-2 p-4 sm:h-[700px] sm:flex-row sm:items-end sm:justify-between sm:gap-0 sm:p-12">
        {hero_photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero_photo}
            alt=""
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="anim-drift absolute inset-y-0 left-0 w-[calc(100%+100px)]"
            style={{ background: "repeating-linear-gradient(135deg,#F1D5DD 0 22px,#F6E3E8 22px 44px)" }}
          />
        )}
        <div className="anim-hero-card relative max-w-[520px] rounded-[20px] bg-bg px-[18px] py-4 sm:px-9 sm:py-7">
          <h1 className="m-0 mb-2.5 text-[26px] font-extrabold leading-[1.1] text-burgundy sm:text-[44px]">{hero_title}</h1>
          {hero_text && <p className="m-0 text-[15px] leading-normal text-muted sm:text-lg">{hero_text}</p>}
        </div>
        {hero_cta && (
          <Link
            href="/catalog"
            className="anim-hero-btn sweep sweep-b relative box-border inline-flex min-h-11 items-center rounded-full border-2 border-burgundy bg-bg px-9 py-4 text-base font-extrabold uppercase tracking-[0.06em] text-burgundy"
          >
            {hero_cta}
          </Link>
        )}
      </div>
    </section>
  );
}
