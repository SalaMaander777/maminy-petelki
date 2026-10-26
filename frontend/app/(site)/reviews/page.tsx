import { EmptyState } from "@/components/EmptyState";
import { ReviewCard } from "@/components/ReviewCard";
import { GRID, PageHeading, PageMain } from "@/components/PageHeading";
import { getReviews, getSite } from "@/lib/api";
import { pageMetadata } from "@/lib/page-meta";
import { pageOf } from "@/lib/site";

export const generateMetadata = () => pageMetadata("reviews");

export default async function Page() {
  const [{ pages }, items] = await Promise.all([getSite(), getReviews()]);
  const page = pageOf(pages, "reviews");
  return (
    <PageMain>
      <PageHeading title={page.title} subtitle={page.subtitle} />
      {items.length === 0 ? (
        <EmptyState message="Скоро здесь появятся отзывы — загляните позже" />
      ) : (
        <div className={GRID}>
          {items.map((item, i) => (
            <ReviewCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </PageMain>
  );
}
