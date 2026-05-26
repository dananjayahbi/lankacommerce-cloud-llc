import { PageEditor } from "@/components/webstore/admin/PageEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWebstorePage({ params }: PageProps) {
  const { id } = await params;
  return <PageEditor pageId={id} />;
}
