import { AccountReportPage } from '@/components/account-report-page';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AccountReportPage accountId={id} />;
}
