import type { Product } from "@/lib/api-types";
import { formatPrice } from "@/lib/format";
import { FavoriteButton } from "./FavoriteButton";
import { Photo } from "./Photo";
import { stagger } from "./PageHeading";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const rows: [string, string][] = [
    ["Размер", product.size],
    ["Материалы", product.materials],
    ["Срок", product.lead_time],
  ];
  const shown = rows.filter(([, v]) => v && v.trim());
  const price = formatPrice(product.price);
  return (
    <article className="card anim-rise-item flex flex-col gap-[18px]" style={stagger(index)}>
      <div className="frame relative aspect-[4/5] overflow-hidden rounded-[20px] bg-[#F1E4D0]">
        <Photo src={product.photo} alt={product.photo ? product.name : ""} index={index} />
        <FavoriteButton id={String(product.id)} name={product.name} />
        <div className="hint absolute bottom-3.5 left-3.5 rounded-full bg-bg px-4 py-2 text-[13px] font-extrabold text-burgundy">
          Вяжем на заказ
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        <h2 className="m-0 text-[22px] font-extrabold text-ink">{product.name}</h2>
        {product.description && <p className="m-0 text-[15px] leading-normal text-muted">{product.description}</p>}
        {shown.length > 0 && (
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-sm text-muted">
            {shown.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-extrabold text-burgundy">{k}</dt>
                <dd className="m-0">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="flex items-center justify-between border-t border-line pt-3">
          <span className="text-2xl font-extrabold text-burgundy">{price || "По запросу"}</span>
          <a
            href="#contacts"
            className="sweep sweep-b box-border flex min-h-11 items-center rounded-full border-2 border-burgundy px-[22px] py-[9px] text-sm font-extrabold text-burgundy"
          >
            Заказать
          </a>
        </div>
      </div>
    </article>
  );
}
