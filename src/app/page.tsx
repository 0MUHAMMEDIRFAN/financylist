import { Suspense } from 'react';
import { AccountListPage } from '@/components/account-list-page';

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccountListPage />
    </Suspense>
  );
}
