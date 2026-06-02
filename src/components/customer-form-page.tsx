"use client";

import { useState } from "react";
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

const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  mobile: z.string().optional(),
});

export function CustomerFormPage({ customerId }: { customerId?: string }) {
  const { addCustomer, updateCustomer, deleteCustomer, getCustomerById } = useApp();
  const { toast } = useToast();
  const router = useRouter();

  const customerToEdit = customerId ? getCustomerById(customerId) : null;
  const isEditing = !!customerToEdit;

  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customerToEdit?.name || "",
      mobile: customerToEdit?.mobile || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof customerSchema>) => {
    try {
      if (isEditing && customerToEdit) {
        await updateCustomer({ ...customerToEdit, ...values });
        toast({
          title: "Customer Updated",
          description: `${values.name} has been updated successfully.`,
        });
        router.push(`/customers/${customerToEdit.id}`);
      } else {
        await addCustomer(values);
        toast({
          title: "Customer Added",
          description: `${values.name} has been added to your customer list.`,
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
    if (!customerToEdit) return;
    try {
      await deleteCustomer(customerToEdit.id);
      toast({
        title: "Customer Deleted",
        description: `${customerToEdit.name} has been removed.`,
      });
      router.push("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete customer.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header
        title={isEditing ? "Edit Customer" : "Add New Customer"}
        leftNode={
          <Button asChild variant="outline" size="icon">
            <Link href={isEditing ? `/customers/${customerId}` : "/"}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:px-6 max-w-md">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. John Doe" {...field} />
                    </FormControl>
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
                  {isEditing ? "Save Changes" : "Save Customer"}
                </Button>
              </div>
            </form>
          </Form>

          {isEditing && (
            <div className="mt-8 pt-8 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Customer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the customer from your list. Their transactions will be preserved in the database but hidden. This action cannot be easily undone.
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
