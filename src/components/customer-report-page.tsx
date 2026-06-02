"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/hooks/use-app';
import { calculateBalance, formatCurrency, cn } from '@/lib/utils';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Download, FileSpreadsheet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function CustomerReportPage({ customerId }: { customerId: string }) {
  const { getCustomerById, getTransactionsByCustomerId, loading } = useApp();
  
  const customer = getCustomerById(customerId);
  const transactions = getTransactionsByCustomerId(customerId);

  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      let matchesDate = true;
      const tDate = new Date(t.date);
      if (startDate) matchesDate = matchesDate && tDate >= new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && tDate <= end;
      }
      
      let matchesSearch = true;
      if (searchTerm) {
        matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      }
      
      return matchesDate && matchesSearch;
    });
  }, [transactions, startDate, endDate, searchTerm]);

  const netBalance = calculateBalance(filteredTransactions);
  const totalGave = filteredTransactions.filter(t => t.type === 'GAVE').reduce((sum, t) => sum + t.amount, 0);
  const totalGot = filteredTransactions.filter(t => t.type === 'GOT').reduce((sum, t) => sum + t.amount, 0);

  const exportExcel = () => {
    if (!customer) return;
    const data = filteredTransactions.map((t) => ({
      Date: format(new Date(t.date), 'dd/MM/yyyy HH:mm'),
      Description: t.description,
      Tags: t.tags.join(', '),
      Type: t.type,
      Amount: t.amount,
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `${customer.name}_Report.xlsx`);
  };

  const exportPDF = () => {
    if (!customer) return;
    const doc = new jsPDF();
    doc.text(`Transaction Report: ${customer.name}`, 14, 15);
    
    const tableData = filteredTransactions.map((t) => [
      format(new Date(t.date), 'dd/MM/yyyy HH:mm'),
      t.description,
      t.type,
      formatCurrency(t.amount)
    ]);

    autoTable(doc, {
      head: [['Date', 'Description', 'Type', 'Amount']],
      body: tableData,
      startY: 20,
    });
    
    doc.save(`${customer.name}_Report.pdf`);
  };

  if (loading && !customer) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-xl text-muted-foreground">Customer not found.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/">Go Back to Customers</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header
        title={`Report - ${customer.name}`}
        leftNode={
          <Button asChild variant="outline" size="icon">
            <Link href={`/customers/${customerId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:px-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-muted/30">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-medium text-muted-foreground mb-1">Net Balance</p>
                <p className={cn("text-xl font-bold", netBalance > 0 ? "text-destructive" : netBalance < 0 ? "text-positive" : "")}>
                  {netBalance === 0 ? "Settled Up" : netBalance > 0 ? `You will give ${formatCurrency(netBalance)}` : `You will get ${formatCurrency(Math.abs(netBalance))}`}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-destructive/10 border-destructive/20 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-medium text-destructive mb-1">Total Gave</p>
                <p className="text-xl font-bold text-destructive">{formatCurrency(totalGave)}</p>
              </CardContent>
            </Card>
            <Card className="bg-positive/10 border-positive/20 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-medium text-positive mb-1">Total Got</p>
                <p className="text-xl font-bold text-positive">{formatCurrency(totalGot)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex-1 space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>Search Description</Label>
                <Input placeholder="Filter by keyword..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button onClick={exportExcel} variant="outline" className="flex-1 md:flex-none">
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                </Button>
                <Button onClick={exportPDF} className="flex-1 md:flex-none">
                  <Download className="w-4 h-4 mr-2" /> PDF
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Entry Details</th>
                  <th className="px-4 py-3 font-medium text-right text-positive">Get</th>
                  <th className="px-4 py-3 font-medium text-right text-destructive">Give</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No transactions found for this period.</td>
                  </tr>
                ) : (
                  filteredTransactions.map(t => (
                    <tr key={t.id} className="border-t">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'dd MMM yyyy, hh:mm a')}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.type === 'GOT' ? (
                          <span className="font-medium text-positive">{formatCurrency(t.amount)}</span>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.type === 'GAVE' ? (
                          <span className="font-medium text-destructive">{formatCurrency(t.amount)}</span>
                        ) : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}
