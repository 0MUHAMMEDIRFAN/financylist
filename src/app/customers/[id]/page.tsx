import { CustomerTransactionsPage } from '@/components/customer-transactions-page';

export default async function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerTransactionsPage customerId={id} />;
}
