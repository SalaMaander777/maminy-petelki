import { notFound } from "next/navigation";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { isCollectionName } from "@/lib/admin-collections";

export default async function Page({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  if (!isCollectionName(collection)) notFound();
  return <CollectionForm collection={collection} />;
}
