import { notFound } from "next/navigation";
import { CollectionList } from "@/components/admin/CollectionList";
import { isCollectionName } from "@/lib/admin-collections";

export default async function Page({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  if (!isCollectionName(collection)) notFound();
  return <CollectionList collection={collection} />;
}
