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
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, FileSpreadsheet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function CustomerReportPage({ customerId }: { customerId: string }) {
  const { getCustomerById, getTransactionsByCustomerId, loading, tags: availableTags } = useApp();
  
  const customer = getCustomerById(customerId);
  const transactions = getTransactionsByCustomerId(customerId);

  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showRefunded, setShowRefunded] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const activeFilterCount = (showRefunded ? 1 : 0) + (selectedTags.length > 0 ? 1 : 0);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!showRefunded && t.isRefund) return false;

      if (selectedTags.length > 0) {
        if (!t.tags.some(tag => selectedTags.includes(tag))) return false;
      }
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
  }, [transactions, startDate, endDate, searchTerm, showRefunded, selectedTags]);

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
        <div className="container mx-auto px-4 py-4 md:px-6">
          
          <Card className="w-full mb-6 shadow-sm">
            <CardContent className="flex gap-6 items-center justify-between px-4 py-2">
              <span className={cn("text-lg font-medium", netBalance > 0 ? "text-destructive" : netBalance < 0 ? "text-positive" : "")}>
                {netBalance === 0 ? "Settled Up" : netBalance > 0 ? "You will give" : "You will get"}
              </span>
              <span className={cn("text-2xl font-bold", netBalance > 0 ? "text-destructive" : netBalance < 0 ? "text-positive" : "text-muted-foreground")}>
                {formatCurrency(Math.abs(netBalance))}
              </span>
            </CardContent>
          </Card>

          <div className="space-y-4 mb-8">
            <div className="flex">
              <div className="flex-1 space-y-2">
                <Label>From</Label>
                <Input type="date" className='rounded-tr-none rounded-br-none' value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex-1 space-y-2">
                <Label>To</Label>
                <Input type="date" className='rounded-tl-none rounded-bl-none' value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Input placeholder="Search Entries..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="mb-[2px] relative">
                    Filter
                    {activeFilterCount > 0 && (
                      <Badge className="ml-2 px-1.5 min-w-[20px] h-5" variant="secondary">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Tags</h4>
                      <p className="text-sm text-muted-foreground">Filter by specific tags.</p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {availableTags.length === 0 && <span className="text-xs text-muted-foreground">No tags found.</span>}
                        {availableTags.map(tag => (
                          <Badge 
                            key={tag} 
                            variant={selectedTags.includes(tag) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="border-t pt-4 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show Refunded</Label>
                        <p className="text-xs text-muted-foreground">Include refunded transactions.</p>
                      </div>
                      <Switch checked={showRefunded} onCheckedChange={setShowRefunded} />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Entry Details</th>
                  <th className="px-4 py-3 font-medium text-right text-positive">
                    Get <span className="block text-xs font-bold">{formatCurrency(totalGot)}</span>
                  </th>
                  <th className="px-4 py-3 font-medium text-right text-destructive">
                    Give <span className="block text-xs font-bold">{formatCurrency(totalGave)}</span>
                  </th>
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

      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 pb-6 mt-auto shadow-[0_-4px_10px_-10px_rgba(0,0,0,0.2)]">
        <div className="container mx-auto flex gap-4 max-w-md">
            <Button onClick={exportExcel} variant="outline" className="flex-1 h-12">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
            <Button onClick={exportPDF} className="flex-1 h-12">
              <Download className="w-4 h-4 mr-2" /> PDF
            </Button>
        </div>
      </div>
    </div>
  );
}
