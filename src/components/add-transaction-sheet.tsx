"use client";

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApp } from '@/hooks/use-app';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { Calendar as CalendarIcon, Loader2, Wand2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Transaction, TransactionType } from '@/lib/types';
import { suggestTransactionDetails } from '@/ai/flows/suggest-transaction-details';

const transactionSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive.'),
  description: z.string().min(1, 'Description is required.'),
  tags: z.string().optional(),
  date: z.date(),
  isRefund: z.boolean(),
  refundOfTransactionId: z.string().optional(),
});

type AddTransactionSheetProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  customerId: string;
  transactionType: TransactionType;
  transactionToEdit?: Transaction | null;
};

export function AddTransactionSheet({
  isOpen,
  setIsOpen,
  customerId,
  transactionType,
  transactionToEdit,
}: AddTransactionSheetProps) {
  const { addTransaction, updateTransaction, getTransactionsByCustomerId, getCustomerById } = useApp();
  const customer = getCustomerById(customerId);
  const [isAiPending, startAiTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      isRefund: false,
    },
  });

  useEffect(() => {
    if (transactionToEdit) {
      form.reset({
        amount: transactionToEdit.amount,
        description: transactionToEdit.description,
        tags: transactionToEdit.tags.join(', '),
        date: new Date(transactionToEdit.date),
        isRefund: transactionToEdit.isRefund,
        refundOfTransactionId: transactionToEdit.refundOfTransactionId,
      });
    } else {
      form.reset({
        amount: undefined,
        description: '',
        tags: '',
        date: new Date(),
        isRefund: false,
        refundOfTransactionId: undefined,
      });
    }
  }, [transactionToEdit, isOpen, form]);
  
  const isRefund = form.watch('isRefund');
  const typeForRefund = transactionToEdit ? (transactionToEdit.type === 'GAVE' ? 'GOT' : 'GAVE') : (transactionType === 'GAVE' ? 'GOT' : 'GAVE');
  const refundableTransactions = getTransactionsByCustomerId(customerId).filter(
    (t) => t.type === typeForRefund
  );

  async function onSubmit(values: z.infer<typeof transactionSchema>) {
    const transactionData = {
      customerId,
      type: transactionToEdit?.type || transactionType,
      amount: values.amount,
      description: values.description,
      tags: values.tags?.split(',').map((tag) => tag.trim()).filter(Boolean) || [],
      date: values.date.toISOString(),
      isRefund: values.isRefund,
      refundOfTransactionId: values.refundOfTransactionId,
    };
    
    if (transactionToEdit) {
        updateTransaction({ ...transactionToEdit, ...transactionData });
        toast({ title: 'Transaction Updated', description: 'Your transaction has been successfully updated.' });
    } else {
        addTransaction(transactionData);
        toast({ title: 'Transaction Added', description: 'A new transaction has been added.' });
    }

    setIsOpen(false);
  }

  const handleAiSuggest = () => {
    const amount = form.getValues('amount');
    if (!amount || !customer) return;

    startAiTransition(async () => {
        try {
            const result = await suggestTransactionDetails({
                amount: amount,
                customerName: customer.name,
                customerMobile: customer.mobile
            });
            if (result.description) form.setValue('description', result.description, { shouldValidate: true });
            if (result.tags) form.setValue('tags', result.tags.join(', '));
        } catch (error) {
            console.error('AI suggestion failed:', error);
            toast({
                title: 'AI Suggestion Failed',
                description: 'Could not generate suggestions at this time.',
                variant: 'destructive',
            });
        }
    });
  }

  const title = transactionToEdit ? 'Edit Transaction' : `Add "You ${transactionType === 'GAVE' ? 'Gave' : 'Got'}"`;
  const sheetDescription = transactionToEdit ? `Editing a transaction for ${customer?.name}.` : `Adding a new transaction for ${customer?.name}.`

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{sheetDescription}</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Description</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={handleAiSuggest} disabled={isAiPending || !form.watch('amount')}>
                      {isAiPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                      Suggest
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea placeholder="e.g. Paid for lunch" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. food, office" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="isRefund"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Is this a refund?</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {isRefund && (
              <FormField
                control={form.control}
                name="refundOfTransactionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Original Transaction</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a transaction to refund" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {refundableTransactions.map((t) => (
                           <SelectItem key={t.id} value={t.id}>
                             {format(new Date(t.date), 'dd MMM yyyy')} - {t.description} ({formatCurrency(t.amount)})
                           </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <SheetFooter>
              <Button type="submit">Save Transaction</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
