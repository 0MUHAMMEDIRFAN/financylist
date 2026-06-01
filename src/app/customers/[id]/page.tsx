import { CustomerTransactionsPage } from '@/components/customer-transactions-page';

export default function CustomerDetailsPage({ params }: { params: { id: string } }) {
  return <CustomerTransactionsPage customerId={params.id} />;
}
