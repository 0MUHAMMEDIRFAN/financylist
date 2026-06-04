"use client";

import { useEffect, useState } from 'react';
import { useApp } from '@/hooks/use-app';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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
import { 
  Calendar, 
  Tag, 
  Clock, 
  ArrowRight,
  Sparkles,
  Link as LinkIcon,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import type { Transaction } from '@/lib/types';

type TransactionDetailDialogProps = {
  transactionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (txn: Transaction) => void;
};

export function TransactionDetailDialog({
  transactionId,
  isOpen,
  onClose,
  onEdit,
}: TransactionDetailDialogProps) {
  const { transactions, getAccountById, deleteTransaction } = useApp();
  const [currentId, setCurrentId] = useState<string | null>(transactionId);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentId(transactionId);
  }, [transactionId]);

  if (!currentId) return null;

  const txn = transactions.find((t) => t.id === currentId);
  if (!txn) return null;

  const account = getAccountById(txn.accountId);

  // Find linked refund or original
  const linkedOriginal = txn.refundOfTransactionId 
    ? transactions.find(t => t.id === txn.refundOfTransactionId)
    : null;
    
  const linkedRefund = txn.refundedByTransactionId
    ? transactions.find(t => t.id === txn.refundedByTransactionId)
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Transaction Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Main summary */}
          <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-xl border border-muted/50 text-center">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
              {txn.isGot ? "You Got" : "You Gave"}
            </span>
            <span className={cn(
              "text-3xl font-extrabold tracking-tight",
              txn.isGot ? "text-positive" : "text-destructive"
            )}>
              {formatCurrency(txn.amount)}
            </span>
            {account && (
              <span className="text-sm font-medium mt-2 text-muted-foreground">
                {txn.isGot ? "from" : "to"} <strong className="text-foreground">{account.name}</strong>
              </span>
            )}
          </div>

          {/* Details list */}
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                ID:
              </span>
              <span className="text-xs text-muted-foreground font-mono select-all">
                {txn.id}
              </span>
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-foreground">
                  {format(new Date(txn.date), 'dd MMMM yyyy')}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(txn.date), 'hh:mm a')}
                </p>
              </div>
            </div>

            {/* Description */}
            {txn.description && (
              <div className="flex gap-3">
                <Sparkles className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Note / Description
                  </p>
                  <p className="text-foreground mt-0.5 leading-relaxed">
                    {txn.description}
                  </p>
                </div>
              </div>
            )}

            {/* Tags */}
            {txn.tags.length > 0 && (
              <div className="flex items-start gap-3">
                <Tag className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                <div className="flex flex-wrap gap-1.5">
                  {txn.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="rounded-full">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Refund Status & Links */}
            {(txn.isRefund || linkedOriginal || linkedRefund) && (
              <div className="pt-4 border-t border-muted space-y-2">
                {txn.isRefund && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    Refund Transaction
                  </Badge>
                )}
                
                {linkedOriginal && (
                  <div 
                    onClick={() => setCurrentId(linkedOriginal.id)}
                    className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors mt-2"
                  >
                    <div className="flex gap-2.5 items-center">
                      <LinkIcon className="h-4 w-4 text-primary shrink-0" />
                      <div className="text-xs">
                        <p className="font-semibold text-primary">Linked Original Transaction</p>
                        <p className="text-muted-foreground">
                          {format(new Date(linkedOriginal.date), 'dd MMM yyyy')} • {formatCurrency(linkedOriginal.amount)}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                )}

                {linkedRefund && (
                  <div 
                    onClick={() => setCurrentId(linkedRefund.id)}
                    className="flex items-center justify-between p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 cursor-pointer hover:bg-blue-500/10 transition-colors mt-2"
                  >
                    <div className="flex gap-2.5 items-center">
                      <LinkIcon className="h-4 w-4 text-blue-500 shrink-0" />
                      <div className="text-xs">
                        <p className="font-semibold text-blue-500">Linked Refund Transaction</p>
                        <p className="text-muted-foreground">
                          {format(new Date(linkedRefund.date), 'dd MMM yyyy')} • {formatCurrency(linkedRefund.amount)}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-blue-500" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="default" className="flex items-center gap-1">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
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
                <AlertDialogAction onClick={() => {
                  deleteTransaction(txn.id);
                  toast({
                    title: "Transaction Deleted",
                    description: "The transaction has been marked as deleted.",
                    variant: "destructive"
                  });
                  onClose();
                }}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={() => {
                onEdit(txn);
                onClose();
              }}
            >
              Edit Transaction
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
