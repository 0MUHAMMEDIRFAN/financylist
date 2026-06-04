import { AccountTransactionsPage } from '@/components/account-transactions-page';

export default async function AccountDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AccountTransactionsPage accountId={id} />;
}
