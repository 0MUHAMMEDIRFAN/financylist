import { CustomerReportPage } from '@/components/customer-report-page';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerReportPage customerId={id} />;
}
