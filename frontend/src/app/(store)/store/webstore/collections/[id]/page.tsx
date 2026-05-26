import { CollectionEditor } from "@/components/webstore/admin/CollectionEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCollectionPage({ params }: PageProps) {
  const { id } = await params;
  return <CollectionEditor collectionId={id} />;
}
