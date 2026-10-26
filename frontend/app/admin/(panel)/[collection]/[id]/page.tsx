import { notFound } from "next/navigation";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { isCollectionName } from "@/lib/admin-collections";

export default async function Page({ params }: { params: Promise<{ collection: string; id: string }> }) {
  const { collection, id } = await params;
  if (!isCollectionName(collection) || !/^\d+$/.test(id)) notFound();
  return <CollectionForm collection={collection} id={Number(id)} />;
}
