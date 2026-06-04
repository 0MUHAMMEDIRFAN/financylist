import { AccountFormPage } from '@/components/account-form-page';

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AccountFormPage accountId={id} />;
}
