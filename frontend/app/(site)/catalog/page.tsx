import { EmptyState } from "@/components/EmptyState";
import { GRID, PageHeading, PageMain } from "@/components/PageHeading";
import { ProductCard } from "@/components/ProductCard";
import { getProducts, getSite } from "@/lib/api";
import { pageMetadata } from "@/lib/page-meta";
import { pageOf } from "@/lib/site";

export const generateMetadata = () => pageMetadata("catalog");

export default async function CatalogPage() {
  const [{ pages }, products] = await Promise.all([getSite(), getProducts()]);
  const page = pageOf(pages, "catalog");
  return (
    <PageMain>
      <PageHeading title={page.title} subtitle={page.subtitle} />
      {products.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={GRID}>
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </PageMain>
  );
}
