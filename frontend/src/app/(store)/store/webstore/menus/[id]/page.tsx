import { MenuEditor } from "@/components/webstore/admin/MenuEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMenuPage({ params }: PageProps) {
  const { id } = await params;
  return <MenuEditor menuId={id} />;
}
