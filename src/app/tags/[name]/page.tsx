import { TagTransactionsPage } from '@/components/tag-transactions-page';

export default async function TagDetailsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return <TagTransactionsPage tagName={name} />;
}
