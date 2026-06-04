"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/hooks/use-app';
import { calculateBalance, formatCurrency, cn } from '@/lib/utils';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  MoreVertical, 
  Edit, 
  Trash2, 
  SlidersHorizontal,
  Search,
  Folder
} from 'lucide-react';
import { AddTransactionSheet } from './add-transaction-sheet';
import { TransactionDetailDialog } from './transaction-detail-dialog';
import { Transaction } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function TagTransactionsPage({ tagName }: { tagName: string }) {
  const { transactions, getAccountById, deleteTransaction, loading } = useApp();
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isGotState, setIsGotState] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);

  // Filters state
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  };
  const getLastDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  };

  const [startDate, setStartDate] = useState<string>(format(getFirstDayOfMonth(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(getLastDayOfMonth(), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showRefunded, setShowRefunded] = useState<boolean>(false);
  const { toast } = useToast();

  const decodedTagName = decodeURIComponent(tagName);

  // Filter transactions belonging to this tag
  const tagTransactions = useMemo(() => {
    return transactions.filter(t => t.tags.includes(decodedTagName) && !t.isDeleted);
  }, [transactions, decodedTagName]);

  const filteredTransactions = useMemo(() => {
    return tagTransactions.filter((t) => {
      // Exclude refund transactions and their linked originals if showRefunded is off
      if (!showRefunded && (t.isRefund || t.refundedByTransactionId)) {
        return false;
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
  }, [tagTransactions, startDate, endDate, searchTerm, showRefunded]);

  // Calculate Net Spent vs. Net Got for this tag
  const totalSpent = filteredTransactions.reduce((sum, t) => {
    return sum + (!t.isGot ? t.amount : 0);
  }, 0);
  const totalGot = filteredTransactions.reduce((sum, t) => {
    return sum + (t.isGot ? t.amount : 0);
  }, 0);
  const netBalance = totalGot - totalSpent; // positive means net received, negative means net spent

  const handleAddTransaction = (isGot: boolean) => {
    setIsGotState(isGot);
    setEditingTransaction(null);
    setSheetOpen(true);
  };
  
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setSheetOpen(true);
  };

  const handleViewTransaction = (transactionId: string) => {
    setSelectedTxnId(transactionId);
    setDetailOpen(true);
  };
  
  const handleDeleteTransaction = (transactionId: string) => {
    deleteTransaction(transactionId);
    toast({
        title: "Transaction Deleted",
        description: "The transaction has been marked as deleted.",
        variant: "destructive"
    });
  };

  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      const date = new Date(t.date).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(t);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [filteredTransactions]);

  const activeFilterCount = (showRefunded ? 1 : 0);

  // Global showPicker date field click trigger
  const handleDateInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker();
    } catch (err) {
      console.log("showPicker not supported", err);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col pb-24 relative bg-muted/20">
      <Header
        title={`#${decodedTagName}`}
        leftNode={
          <Button asChild variant="outline" size="icon">
            <Link href="/?tab=tags">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-4 md:px-6">
          {/* Net balance card for Tag */}
          <Card className="w-full mb-6 shadow-sm">
            <CardContent className="flex gap-6 items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">
                {netBalance === 0 ? "Settled Balance" : netBalance > 0 ? "Net Added" : "Net Spent"}
              </span>
              <span className={cn(
                "text-2xl font-bold",
                netBalance > 0 ? "text-positive" : netBalance < 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                {formatCurrency(Math.abs(netBalance))}
              </span>
            </CardContent>
          </Card>

          {/* Filters layout */}
          <div className="space-y-4 mb-6">
            <div className="flex">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">From</Label>
                <Input 
                  type="date" 
                  className='rounded-tr-none rounded-br-none h-10' 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  onClick={handleDateInputClick}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">To</Label>
                <Input 
                  type="date" 
                  className='rounded-tl-none rounded-bl-none h-10' 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  onClick={handleDateInputClick}
                />
              </div>
            </div>
            
            <div className="flex gap-2 items-center justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search Tag Entries..." 
                  className="pl-9 h-10 bg-background" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
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
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="show-refunded">Show Refunded</Label>
                        <p className="text-[10px] text-muted-foreground">Include refunded entries</p>
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

          {/* Transactions List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
             <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-background/50 py-16 text-center">
              <h3 className="text-lg font-semibold text-muted-foreground">No Transactions Found</h3>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedTransactions).map(([date, txns]) => (
                  <div key={date}>
                      <h2 className="mb-1 text-[11px] font-bold text-muted-foreground tracking-wider uppercase">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
                      <div className="space-y-2">
                      {txns.map(t => {
                        const acc = getAccountById(t.accountId);
                        return (
                          <Card key={t.id} className="cursor-pointer hover:bg-muted/10 transition-colors border-muted-foreground/10" onClick={() => handleViewTransaction(t.id)}>
                              <CardContent className="p-4 flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", !t.isGot ? 'bg-destructive/10' : 'bg-positive/10')}>
                                          {!t.isGot ? <ArrowUpRight className="h-5 w-5 text-destructive" /> : <ArrowDownLeft className="h-5 w-5 text-positive" />}
                                      </div>
                                      <div>
                                          <p className="font-semibold text-sm">{t.description || "No description"}</p>
                                          <p className="text-xs text-muted-foreground">Account: <strong className="text-foreground">{acc?.name || "Unknown"}</strong></p>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <p className={cn("font-bold text-base", !t.isGot ? 'text-destructive' : 'text-positive')}>
                                          {formatCurrency(t.amount)}
                                      </p>
                                      <div onClick={(e) => e.stopPropagation()}>
                                          <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                                      <MoreVertical className="h-4 w-4" />
                                                  </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                  <DropdownMenuItem onClick={() => handleEditTransaction(t)}>
                                                      <Edit className="mr-2 h-4 w-4" />
                                                      Edit
                                                  </DropdownMenuItem>
                                                  <AlertDialog>
                                                      <AlertDialogTrigger asChild>
                                                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                              <Trash2 className="mr-2 h-4 w-4" />
                                                              Delete
                                                          </DropdownMenuItem>
                                                      </AlertDialogTrigger>
                                                      <AlertDialogContent>
                                                          <AlertDialogHeader>
                                                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                              <AlertDialogDescription>
                                                                  This action cannot be undone. This will mark the transaction as deleted.
                                                              </AlertDialogDescription>
                                                          </AlertDialogHeader>
                                                          <AlertDialogFooter>
                                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                              <AlertDialogAction onClick={() => handleDeleteTransaction(t.id)}>Delete</AlertDialogAction>
                                                          </AlertDialogFooter>
                                                      </AlertDialogContent>
                                                  </AlertDialog>
                                              </DropdownMenuContent>
                                          </DropdownMenu>
                                      </div>
                                  </div>
                              </CardContent>
                          </Card>
                        );
                      })}
                      </div>
                  </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* Floating Bottom Bar Actions */}
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 pb-6 mt-auto shadow-[0_-4px_10px_-10px_rgba(0,0,0,0.2)]">
        <div className="container mx-auto grid grid-cols-2 gap-4 max-w-md">
             <Button size="default" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-11" onClick={() => handleAddTransaction(false)}>
               <ArrowUpRight className="mr-2 h-5 w-5" /> You Spend
             </Button>
             <Button size="default" className="bg-positive hover:bg-positive/90 text-positive-foreground h-11" onClick={() => handleAddTransaction(true)}>
               <ArrowDownLeft className="mr-2 h-5 w-5" /> You Add
             </Button>
         </div>
       </div>
       
       <AddTransactionSheet
         isOpen={sheetOpen}
         setIsOpen={setSheetOpen}
         isGot={isGotState}
         transactionToEdit={editingTransaction}
         preselectedTag={decodedTagName}
       />
       <TransactionDetailDialog
         transactionId={selectedTxnId}
         isOpen={detailOpen}
         onClose={() => {
           setDetailOpen(false);
           setSelectedTxnId(null);
         }}
         onEdit={handleEditTransaction}
       />
    </div>
  );
}
