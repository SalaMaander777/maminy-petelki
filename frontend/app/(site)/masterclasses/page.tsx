import { EmptyState } from "@/components/EmptyState";
import { MasterClassCard } from "@/components/MasterClassCard";
import { GRID, PageHeading, PageMain } from "@/components/PageHeading";
import { getMasterClasses, getSite } from "@/lib/api";
import { sortPastLast } from "@/lib/format";
import { pageMetadata } from "@/lib/page-meta";
import { pageOf } from "@/lib/site";

export const generateMetadata = () => pageMetadata("masterclasses");

export default async function MasterClassesPage() {
  const [{ pages }, raw] = await Promise.all([getSite(), getMasterClasses()]);
  const page = pageOf(pages, "masterclasses");
  const items = sortPastLast(raw);
  return (
    <PageMain>
      <PageHeading title={page.title} subtitle={page.subtitle} />
      {items.length === 0 ? (
        <EmptyState message="Скоро здесь появятся мастер-классы — загляните позже" />
      ) : (
        <div className={GRID}>
          {items.map((item, i) => (
            <MasterClassCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </PageMain>
  );
}
