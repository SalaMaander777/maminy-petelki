import { EmptyState } from "@/components/EmptyState";
import { PromoCard } from "@/components/PromoCard";
import { GRID, PageHeading, PageMain } from "@/components/PageHeading";
import { getPromos, getSite } from "@/lib/api";
import { pageMetadata } from "@/lib/page-meta";
import { pageOf } from "@/lib/site";

export const generateMetadata = () => pageMetadata("sales");

export default async function Page() {
  const [{ pages }, items] = await Promise.all([getSite(), getPromos()]);
  const page = pageOf(pages, "sales");
  return (
    <PageMain>
      <PageHeading title={page.title} subtitle={page.subtitle} />
      {items.length === 0 ? (
        <EmptyState message="Сейчас действующих акций нет — загляните позже" />
      ) : (
        <div className={GRID}>
          {items.map((item, i) => (
            <PromoCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </PageMain>
  );
}
