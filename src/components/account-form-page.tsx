"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useApp } from "@/hooks/use-app";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
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
import type { AccountType } from "@/lib/types";

const accountSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  mobile: z.string().optional(),
  type: z.string({
    required_error: "Please select an account type.",
  }).min(1),
});

export function AccountFormPage({ accountId }: { accountId?: string }) {
  const { addAccount, updateAccount, deleteAccount, getAccountById, accountTypes } = useApp();
  const { toast } = useToast();
  const router = useRouter();

  const accountToEdit = accountId ? getAccountById(accountId) : null;
  const isEditing = !!accountToEdit;

  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: accountToEdit?.name || "",
      mobile: accountToEdit?.mobile || "",
      type: accountToEdit?.type || "CUSTOMER",
    },
  });

  useEffect(() => {
    if (accountToEdit) {
      form.reset({
        name: accountToEdit.name,
        mobile: accountToEdit.mobile || "",
        type: accountToEdit.type,
      });
    }
  }, [accountToEdit, form]);

  const onSubmit = async (values: z.infer<typeof accountSchema>) => {
    try {
      if (isEditing && accountToEdit) {
        await updateAccount({ ...accountToEdit, ...values });
        toast({
          title: "Account Updated",
          description: `${values.name} has been updated successfully.`,
        });
        router.push(`/accounts/${accountToEdit.id}`);
      } else {
        await addAccount(values);
        toast({
          title: "Account Added",
          description: `${values.name} has been added successfully.`,
        });
        router.push("/");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!accountToEdit) return;
    try {
      await deleteAccount(accountToEdit.id);
      toast({
        title: "Account Deleted",
        description: `${accountToEdit.name} has been removed.`,
      });
      router.push("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account.",
        variant: "destructive",
      });
    }
  };

  const nameValue = form.watch("name");

  const getInitials = (name: string) => {
    if (!name || !name.trim()) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header
        title={isEditing ? "Edit Account" : "Add New Account"}
        leftNode={
          <Button asChild variant="outline" size="icon">
            <Link href={isEditing ? `/accounts/${accountId}` : "/"}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:px-6 max-w-md">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Dynamic initials avatar */}
              <div className="flex flex-col items-center justify-center py-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-3xl shadow-sm border border-primary/20 uppercase transition-all duration-300 hover:bg-primary/20">
                  {getInitials(nameValue)}
                </div>
                {nameValue && <span className="text-sm font-semibold mt-2 text-muted-foreground">{nameValue}</span>}
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accountTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number (Optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="e.g. 9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <Button type="submit" className="w-full" isLoading={form.formState.isSubmitting}>
                  {isEditing ? "Save Changes" : "Save Account"}
                </Button>
              </div>
            </form>
          </Form>

          {isEditing && (
            <div className="mt-8 pt-8 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the account from your list. Their transactions will be preserved in the database but hidden. This action cannot be easily undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
