"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/hooks/use-app';
import { calculateBalance, formatCurrency, cn } from '@/lib/utils';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, MoreVertical, Edit, Trash2, FileText, SlidersHorizontal, Search } from 'lucide-react';
import { AddTransactionSheet } from './add-transaction-sheet';
import { TransactionDetailDialog } from './transaction-detail-dialog';
import { Transaction } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
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

export function AccountTransactionsPage({ accountId }: { accountId: string }) {
  const { getAccountById, getTransactionsByAccountId, deleteTransaction, loading } = useApp();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isGotState, setIsGotState] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);

  const [showRefunded, setShowRefunded] = useState<boolean>(false);
  
  const { toast } = useToast();

  const account = getAccountById(accountId);
  const transactions = getTransactionsByAccountId(accountId);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Exclude refund transactions and their linked originals if showRefunded is off
      if (!showRefunded && (t.isRefund || t.refundedByTransactionId)) {
        return false;
      }
      
      return true;
    });
  }, [transactions, showRefunded]);

  const balance = calculateBalance(filteredTransactions);

  const isAsset = account ? (account.isAsset !== false) : true;
  
  const getAccountTypeLabel = (type?: string) => {
    switch (type) {
      case "CUSTOMER": return "Customer";
      case "SUPPLIER": return "Supplier";
      case "BANK": return "Bank";
      case "PERSONAL": return "Personal";
      default: return type || "Settled Up";
    }
  };

  let balanceColor = "text-muted-foreground";
  let balanceLabel = account ? getAccountTypeLabel(account.type) : "Settled Up";

  if (balance > 0) {
    if (account.type === 'BANK') {
      balanceLabel = "You will give";
      balanceColor = "text-positive";
    } else if (isAsset) {
      balanceLabel = "You got";
      balanceColor = "text-positive";
    } else {
      balanceLabel = "You will give";
      balanceColor = "text-positive";
    }
  } else if (balance < 0) {
    if (account.type === 'SUPPLIER') {
      balanceLabel = "You gave";
      balanceColor = "text-destructive";
    } else {
      balanceLabel = "You will get";
      balanceColor = "text-destructive";
    }
  }

  const gaveLabel = "You Gave";
  const gotLabel = "You Got";

  const buttonStyles = {
    gaveColor: "bg-destructive hover:bg-destructive/90 text-destructive-foreground h-11",
    gaveIcon: <ArrowUpRight className="mr-2 h-5 w-5" />,
    gotColor: "bg-positive hover:bg-positive/90 text-positive-foreground h-11",
    gotIcon: <ArrowDownLeft className="mr-2 h-5 w-5" />,
  };

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

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
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

  if (loading && !account) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header
          leftNode={
            <Button asChild variant="outline" size="icon">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8">
               <Skeleton className="h-16 w-full" />
               <Skeleton className="h-16 w-full" />
            </div>
            <div className="space-y-4">
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
          </div>
        </main>
      </div>
    );
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

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header
        title={
          <Link href={`/accounts/${accountId}/edit`} className="hover:underline flex items-center gap-1">
            {account.name}
          </Link>
        }
        leftNode={
          <Button asChild variant="outline" size="icon">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      >
        <div className="flex gap-2">
          <Button asChild variant="outline" size="icon">
            <Link href={`/accounts/${accountId}/edit`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon">
            <Link href={`/accounts/${accountId}/report`}>
              <FileText className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Header>
      <main className="flex-1">
        <div className="container mx-auto px-4 py-4 md:px-6">
          <Card className="w-full mb-6 shadow-sm">
            <CardContent className="flex gap-6 items-center justify-between px-4 py-2">
              <span className={cn("text-lg font-medium", balanceColor)}>
                {balanceLabel}
              </span>
              <span className={cn("text-2xl font-bold", balanceColor)}>
                {formatCurrency(Math.abs(balance))}
              </span>
            </CardContent>
          </Card>



          {loading ? (
            <div className="space-y-4">
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
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-20 text-center">
              <h3 className="text-xl font-semibold text-muted-foreground">No Transactions Found</h3>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedTransactions).map(([date, txns]) => (
                  <div key={date}>
                      <h2 className="mb-1 text-sm font-semibold text-muted-foreground tracking-wider uppercase">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
                      <div className="space-y-2">
                       {txns.map(t => {
                         const showAsGot = account.type === 'BANK' ? !t.isGot : t.isGot;
                         return (
                            <Card key={t.id} className="cursor-pointer hover:bg-muted/10 transition-colors" onClick={() => handleViewTransaction(t.id)}>
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", !showAsGot ? 'bg-destructive/10' : 'bg-positive/10')}>
                                            {!showAsGot ? <ArrowUpRight className="h-5 w-5 text-destructive" /> : <ArrowDownLeft className="h-5 w-5 text-positive" />}
                                        </div>
                                        <div>
                                            <p className="font-semibold">{t.description || ""}</p>
                                            <p className="text-sm text-muted-foreground">{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className={cn("font-bold text-lg", !showAsGot ? 'text-destructive' : 'text-positive')}>
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
      
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 pb-6 mt-auto shadow-[0_-4px_10px_-10px_rgba(0,0,0,0.2)]">
        <div className="container mx-auto grid grid-cols-2 gap-4 max-w-md">
             <Button size="default" className={buttonStyles.gaveColor} onClick={() => handleAddTransaction(false)}>
               {buttonStyles.gaveIcon} {gaveLabel}
             </Button>
             <Button size="default" className={buttonStyles.gotColor} onClick={() => handleAddTransaction(true)}>
               {buttonStyles.gotIcon} {gotLabel}
             </Button>
          </div>
        </div>
       <AddTransactionSheet
         isOpen={sheetOpen}
         setIsOpen={setSheetOpen}
         accountId={accountId}
         isGot={isGotState}
         transactionToEdit={editingTransaction}
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
