"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/hooks/use-app';
import { calculateBalance, formatCurrency, cn } from '@/lib/utils';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, FileSpreadsheet, Download, Search, SlidersHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function AccountReportPage({ accountId }: { accountId: string }) {
  const { getAccountById, getTransactionsByAccountId, tags: availableTags, loading } = useApp();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showRefunded, setShowRefunded] = useState<boolean>(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const account = getAccountById(accountId);
  const transactions = getTransactionsByAccountId(accountId);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Exclude deleted transactions
      if (t.isDeleted) return false;

      // Exclude refund transactions and their linked originals if showRefunded is off
      if (!showRefunded && (t.isRefund || t.refundedByTransactionId)) {
        return false;
      }

      // Filter by selected tags
      if (selectedTags.length > 0) {
        const hasMatchingTag = t.tags.some(tag => selectedTags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Filter by date range
      const tDate = new Date(t.date);
      let matchesDate = true;
      if (startDate) matchesDate = matchesDate && tDate >= new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && tDate <= end;
      }
      
      // Filter by search text
      let matchesSearch = true;
      if (searchTerm) {
        matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      }
      
      return matchesDate && matchesSearch;
    });
  }, [transactions, startDate, endDate, searchTerm, showRefunded, selectedTags]);

  const netBalance = calculateBalance(filteredTransactions);
  const totalGave = filteredTransactions.filter(t => !t.isGot).reduce((sum, t) => sum + t.amount, 0);
  const totalGot = filteredTransactions.filter(t => t.isGot).reduce((sum, t) => sum + t.amount, 0);

  const exportExcel = () => {
    if (!account) return;
    const data = filteredTransactions.map((t) => ({
      Date: format(new Date(t.date), 'dd/MM/yyyy HH:mm'),
      Description: t.description,
      Tags: t.tags.join(', '),
      Type: t.isGot ? 'GOT' : 'GAVE',
      Amount: t.amount,
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `${account.name}_Report.xlsx`);
  };

  const exportPDF = () => {
    if (!account) return;
    const doc = new jsPDF();
    doc.text(`Transaction Report: ${account.name}`, 14, 15);
    
    const tableData = filteredTransactions.map((t) => [
      format(new Date(t.date), 'dd/MM/yyyy HH:mm'),
      t.description,
      t.isGot ? 'GOT' : 'GAVE',
      formatCurrency(t.amount)
    ]);

    autoTable(doc, {
      head: [['Date', 'Description', 'Type', 'Amount']],
      body: tableData,
      startY: 20,
    });
    
    doc.save(`${account.name}_Report.pdf`);
  };

  if (loading && !account) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!account) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <h2 className="text-xl font-bold">Account not found</h2>
        <Button asChild className="mt-4">
          <Link href="/">Go Back</Link>
        </Button>
      </div>
    );
  }

  const activeFilterCount = selectedTags.length + (showRefunded ? 1 : 0);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  let reportBalanceLabel = "Settled Balance";
  let reportBalanceColor = "text-muted-foreground";

  if (netBalance > 0) {
    if (account.type === 'BANK') {
      reportBalanceLabel = "You will give";
      reportBalanceColor = "text-positive";
    } else if (account.isAsset !== false) {
      reportBalanceLabel = "You got";
      reportBalanceColor = "text-positive";
    } else {
      reportBalanceLabel = "You will give";
      reportBalanceColor = "text-positive";
    }
  } else if (netBalance < 0) {
    if (account.type === 'SUPPLIER') {
      reportBalanceLabel = "You gave";
      reportBalanceColor = "text-destructive";
    } else {
      reportBalanceLabel = "You will get";
      reportBalanceColor = "text-destructive";
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header
        title={account.name}
        leftNode={
          <Button asChild variant="outline" size="icon">
            <Link href={`/accounts/${accountId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 md:px-6">
          <Card className="w-full mb-6">
            <CardContent className="flex justify-between items-center py-4 px-4">
              <span className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">
                {reportBalanceLabel}
              </span>
              <span className={cn(
                "text-xl font-bold",
                reportBalanceColor
              )}>
                {formatCurrency(Math.abs(netBalance))}
              </span>
            </CardContent>
          </Card>

          <div className="space-y-4 mb-8">
            <div className="flex">
              <div className="flex-1 space-y-2">
                <Label>From</Label>
                <Input 
                  type="date" 
                  className='rounded-tr-none rounded-br-none' 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label>To</Label>
                <Input 
                  type="date" 
                  className='rounded-tl-none rounded-bl-none' 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
                />
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search Entries..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="relative h-10 w-10">
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeFilterCount > 0 && (
                      <Badge className="absolute -top-1.5 -right-1.5 px-1.5 min-w-[18px] h-5 rounded-full" variant="secondary">
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
                        <Label htmlFor="show-refunded">Show Refunded</Label>
                        <p className="text-xs text-muted-foreground">Include refunded transactions in calculations</p>
                      </div>
                      <Switch 
                        id="show-refunded" 
                        checked={showRefunded} 
                        onCheckedChange={setShowRefunded} 
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Entries</th>
                  <th className="px-4 py-3 text-right font-medium">Got (IN)</th>
                  <th className="px-4 py-3 text-right font-medium">Gave (OUT)</th>
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
                        <p className="font-medium text-foreground">{t.description || ""}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'dd MMM yyyy, hh:mm a')}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.isGot ? (
                          <span className="font-medium text-positive">{formatCurrency(t.amount)}</span>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!t.isGot ? (
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
