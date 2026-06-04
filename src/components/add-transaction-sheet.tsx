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
import { cn, formatCurrency } from '@/lib/utils';
import { Calendar as CalendarIcon, Loader2, Wand2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/lib/types';
import { suggestTransactionDetails } from '@/ai/flows/suggest-transaction-details';

const transactionSchema = z.object({
  selectedAccountId: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be positive.'),
  description: z.string().optional(),
  tags: z.string().optional(),
  date: z.date(),
  isRefund: z.boolean(),
  refundOfTransactionId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.isRefund && !data.refundOfTransactionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Original transaction link is required for refunds.',
      path: ['refundOfTransactionId'],
    });
  }
});

type AddTransactionSheetProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  accountId?: string;
  isGot: boolean;
  transactionToEdit?: Transaction | null;
  preselectedTag?: string;
};

export function AddTransactionSheet({
  isOpen,
  setIsOpen,
  accountId,
  isGot,
  transactionToEdit,
  preselectedTag,
}: AddTransactionSheetProps) {
  const { addTransaction, updateTransaction, getTransactionsByAccountId, getAccountById, tags, addTag, accounts } = useApp();
  
  const activeAccountId = accountId || (transactionToEdit?.accountId);
  const account = activeAccountId ? getAccountById(activeAccountId) : null;

  const [isAiPending, startAiTransition] = useTransition();
  const [newTag, setNewTag] = useState('');
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
        selectedAccountId: transactionToEdit.accountId,
        amount: transactionToEdit.amount,
        description: transactionToEdit.description,
        tags: transactionToEdit.tags.join(', '),
        date: new Date(transactionToEdit.date),
        isRefund: transactionToEdit.isRefund,
        refundOfTransactionId: transactionToEdit.refundOfTransactionId,
      });
    } else {
      form.reset({
        selectedAccountId: accountId || '',
        amount: undefined,
        description: '',
        tags: preselectedTag || '',
        date: new Date(),
        isRefund: false,
        refundOfTransactionId: undefined,
      });
    }
  }, [transactionToEdit, isOpen, form, accountId, preselectedTag]);
  
  const isRefund = form.watch('isRefund');
  const amountValue = form.watch('amount');
  const selectedAccountIdValue = form.watch('selectedAccountId');
  
  const finalAccountId = accountId || selectedAccountIdValue;

  const targetIsGot = transactionToEdit ? !transactionToEdit.isGot : !isGot;
  
  // Filter refundable transactions:
  // - Same account
  // - Opposite transaction type
  // - Matching amount
  // - Not already refunded (except if it is the one currently linked to this editing transaction)
  const refundableTransactions = finalAccountId
    ? getTransactionsByAccountId(finalAccountId).filter(
        (t) => t.isGot === targetIsGot && 
               amountValue !== undefined && 
               Number(t.amount) === Number(amountValue) &&
               (!t.refundedByTransactionId || t.refundedByTransactionId === transactionToEdit?.id)
      )
    : [];

  async function onSubmit(values: z.infer<typeof transactionSchema>) {
    const submitAccountId = accountId || values.selectedAccountId;
    if (!submitAccountId) {
      form.setError('selectedAccountId', { type: 'manual', message: 'Please select an account.' });
      return;
    }

    if (values.isRefund && values.refundOfTransactionId) {
      const originalTxn = getTransactionsByAccountId(submitAccountId).find(t => t.id === values.refundOfTransactionId);
      if (!originalTxn) {
        form.setError('refundOfTransactionId', { type: 'manual', message: 'Original transaction not found.' });
        return;
      }
      if (Number(originalTxn.amount) !== Number(values.amount)) {
        form.setError('refundOfTransactionId', { type: 'manual', message: `Refund amount must match the original transaction amount of ${formatCurrency(originalTxn.amount)}.` });
        return;
      }
    }

    const transactionData = {
      accountId: submitAccountId,
      isGot: transactionToEdit?.isGot !== undefined ? transactionToEdit.isGot : isGot,
      amount: values.amount,
      description: values.description || "",
      tags: values.tags?.split(',').map((tag) => tag.trim()).filter(Boolean) || [],
      date: values.date.toISOString(),
      isRefund: values.isRefund,
      ...(values.refundOfTransactionId ? { refundOfTransactionId: values.refundOfTransactionId } : {}),
    };
    
    try {
        if (transactionToEdit) {
            await updateTransaction({ ...transactionToEdit, ...transactionData });
            toast({ title: 'Transaction Updated', description: 'Your transaction has been successfully updated.' });
        } else {
            await addTransaction(transactionData);
            toast({ title: 'Transaction Added', description: 'A new transaction has been added.' });
        }
        setIsOpen(false);
    } catch (error) {
        console.error("Error saving transaction:", error);
        toast({ title: 'Error', description: 'Failed to save transaction.', variant: 'destructive' });
    }
  }

  const handleAiSuggest = () => {
    const amount = form.getValues('amount');
    const suggestCustomer = account || (selectedAccountIdValue ? getAccountById(selectedAccountIdValue) : null);
    if (!amount || !suggestCustomer) return;

    startAiTransition(async () => {
        try {
            const result = await suggestTransactionDetails({
                amount: amount,
                customerName: suggestCustomer.name,
                customerMobile: suggestCustomer.mobile
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

  // Dynamic Wording calculation:
  // - If accountId is provided, use "You will get from Ramesh" or "You will give to Ramesh"
  // - If accountId is NOT provided (generic/tag context), use "You spend" / "You spent" (GAVE) or "You got" / "You received" (GOT)
  const isGotVal = transactionToEdit ? transactionToEdit.isGot : isGot;
  const targetAccount = account || (selectedAccountIdValue ? getAccountById(selectedAccountIdValue) : null);

  const getDynamicTitle = () => {
    if (!targetAccount) {
      return isGotVal ? "You Added" : "You Spent";
    }
    const type = targetAccount.type;
    const name = targetAccount.name;
    if (type === 'BANK') {
      return isGotVal ? `Withdraw from ${name}` : `Deposit to ${name}`;
    } else if (type === 'CUSTOMER') {
      return isGotVal ? `You Added to ${name}` : `You Gave to ${name}`;
    } else if (type === 'SUPPLIER') {
      return isGotVal ? `You Got from ${name}` : `You Gave to ${name}`;
    } else { // PERSONAL
      return isGotVal ? `You Got from ${name}` : `You Gave to ${name}`;
    }
  };
  const title = getDynamicTitle();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
            
            {/* Account Selector if launched from generic/tag view */}
            {!accountId && (
              <FormField
                control={form.control}
                name="selectedAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick an account..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({acc.type.toLowerCase()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => {
                const isSuggestDisabled = isAiPending || !form.watch('amount') || (!accountId && !selectedAccountIdValue);
                return (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Description</FormLabel>
                      <Button type="button" variant="outline" size="sm" onClick={handleAiSuggest} disabled={isSuggestDisabled}>
                        {isAiPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Suggest
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea placeholder="e.g. Paid for lunch" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="flex flex-row gap-4 items-end">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        className="w-full" 
                        {...field} 
                        value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} 
                        onChange={(e) => field.onChange(new Date(e.target.value))} 
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker();
                          } catch (err) {
                            console.log("showPicker not supported", err);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isRefund"
                render={({ field }) => (
                  <FormItem className="flex flex-1 flex-row items-center justify-between rounded-lg border p-3 shadow-sm h-10 space-y-0">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Refund?</FormLabel>
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
            </div>

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
                        {refundableTransactions.length === 0 ? (
                          <SelectItem value="_empty" disabled>
                            -- No matching unrefunded transactions found --
                          </SelectItem>
                        ) : (
                          refundableTransactions.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {format(new Date(t.date), 'dd MMM yyyy')} - {t.description || ""} ({formatCurrency(t.amount)})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => {
                const currentTags = field.value ? field.value.split(',').map(t => t.trim()).filter(Boolean) : [];
                return (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <div className="flex flex-wrap gap-2 items-center">
                      {tags.map((tag) => {
                        const isSelected = currentTags.includes(tag);
                        return (
                          <Button
                            key={tag}
                            type="button"
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            className={cn("rounded-full h-8", isSelected && "bg-primary text-primary-foreground")}
                            onClick={() => {
                              if (isSelected) {
                                field.onChange(currentTags.filter(t => t !== tag).join(', '));
                              } else {
                                field.onChange([...currentTags, tag].join(', '));
                              }
                            }}
                          >
                            {tag}
                          </Button>
                        );
                      })}
                      
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full shadow-sm border-dashed">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="start">
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm">Add Tag</h4>
                            <div className="flex items-center gap-2 pt-2">
                              <Input
                                placeholder="New tag name..."
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                className="h-8 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newTag.trim()) {
                                      const tagToAdd = newTag.trim();
                                      addTag(tagToAdd);
                                      if (!currentTags.includes(tagToAdd)) {
                                        field.onChange([...currentTags, tagToAdd].join(', '));
                                      }
                                      setNewTag('');
                                    }
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                size="sm"
                                className="h-8"
                                onClick={() => {
                                  if (newTag.trim()) {
                                    const tagToAdd = newTag.trim();
                                    addTag(tagToAdd);
                                    if (!currentTags.includes(tagToAdd)) {
                                      field.onChange([...currentTags, tagToAdd].join(', '));
                                    }
                                    setNewTag('');
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <SheetFooter>
              <Button type="submit" isLoading={form.formState.isSubmitting}>Save Transaction</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
