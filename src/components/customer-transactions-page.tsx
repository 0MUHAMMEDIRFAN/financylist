"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/hooks/use-app';
import { calculateBalance, formatCurrency, cn } from '@/lib/utils';
import { Header } from '@/components/header';
import { Balance } from '@/components/balance';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, MoreVertical, Edit, Trash2, FileText } from 'lucide-react';
import { AddTransactionSheet } from './add-transaction-sheet';
import { ReportDialog } from './report-dialog';
import { Transaction, TransactionType } from '@/lib/types';
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';

export function CustomerTransactionsPage({ customerId }: { customerId: string }) {
  const { getCustomerById, getTransactionsByCustomerId, deleteTransaction, loading } = useApp();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('GAVE');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const customer = getCustomerById(customerId);
  const transactions = getTransactionsByCustomerId(customerId);
  const balance = calculateBalance(transactions);
  const { toast } = useToast();

  const handleAddTransaction = (type: TransactionType) => {
    setTransactionType(type);
    setEditingTransaction(null);
    setSheetOpen(true);
  };
  
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setSheetOpen(true);
  };
  
  const handleDeleteTransaction = (transactionId: string) => {
    deleteTransaction(transactionId);
    toast({
        title: "Transaction Deleted",
        description: "The transaction has been marked as deleted.",
        variant: "destructive"
    })
  };

  const groupedTransactions = useMemo(() => {
    return transactions.reduce((acc, t) => {
      const date = new Date(t.date).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(t);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [transactions]);

  if (loading && !customer) {
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
        title={customer.name}
        leftNode={
          <Button asChild variant="outline" size="icon">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      >
        <Button asChild variant="outline" size="sm">
          <Link href={`/customers/${customerId}/report`}>
            <FileText className="mr-2 h-4 w-4" /> Report
          </Link>
        </Button>
      </Header>
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:px-6">
          <div className="flex flex-col gap-2 mb-6 border-b pb-6">
            <Balance balance={balance} label="Net Balance" isLarge={true} />
          </div>

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
          ) : transactions.length === 0 ? (
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-20 text-center">
              <h3 className="text-xl font-semibold text-muted-foreground">No Transactions Yet</h3>
              <p className="text-muted-foreground mt-2">Use the buttons above to add a new transaction.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTransactions).map(([date, txns]) => (
                  <div key={date}>
                      <h2 className="mb-2 text-sm font-semibold text-muted-foreground tracking-wider uppercase">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
                      <div className="space-y-2">
                      {txns.map(t => (
                          <Card key={t.id}>
                              <CardContent className="p-4 flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", t.type === 'GAVE' ? 'bg-destructive/10' : 'bg-positive/10')}>
                                          {t.type === 'GAVE' ? <ArrowUpRight className="h-5 w-5 text-destructive" /> : <ArrowDownLeft className="h-5 w-5 text-positive" />}
                                      </div>
                                      <div>
                                          <p className="font-semibold">{t.description}</p>
                                          <p className="text-sm text-muted-foreground">{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <p className={cn("font-bold text-lg", t.type === 'GAVE' ? 'text-destructive' : 'text-positive')}>
                                          {formatCurrency(t.amount)}
                                      </p>
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
                              </CardContent>
                          </Card>
                      ))}
                      </div>
                  </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 pb-6 mt-auto shadow-[0_-4px_10px_-10px_rgba(0,0,0,0.2)]">
        <div className="container mx-auto grid grid-cols-2 gap-4 max-w-md">
            <Button size="default" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => handleAddTransaction('GAVE')}>
              <ArrowUpRight className="mr-2 h-5 w-5" /> You Gave
            </Button>
            <Button size="default" className="bg-positive hover:bg-positive/90 text-positive-foreground" onClick={() => handleAddTransaction('GOT')}>
              <ArrowDownLeft className="mr-2 h-5 w-5" /> You Got
            </Button>
        </div>
      </div>
      <AddTransactionSheet
        isOpen={sheetOpen}
        setIsOpen={setSheetOpen}
        customerId={customerId}
        transactionType={transactionType}
        transactionToEdit={editingTransaction}
      />
    </div>
  );
}
