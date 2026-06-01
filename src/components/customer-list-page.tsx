"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/hooks/use-app";
import { calculateBalance } from "@/lib/utils";
import { Header } from "@/components/header";
import { AddCustomerDialog } from "@/components/add-customer-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Balance } from "./balance";

export function CustomerListPage() {
  const { customers, getTransactionsByCustomerId } = useApp();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header>
        <AddCustomerDialog />
      </Header>
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 md:px-6">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold md:text-3xl">Customers</h1>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          {filteredCustomers.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCustomers.map((customer) => {
                const transactions = getTransactionsByCustomerId(customer.id);
                const balance = calculateBalance(transactions);
                return (
                  <Link href={`/customers/${customer.id}`} key={customer.id} className="group">
                    <Card className="h-full transform transition-all duration-200 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1">
                      <CardHeader className="flex flex-row items-center gap-4 pb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="text-lg font-bold bg-primary/20 text-primary">
                            {customer.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold">{customer.name}</CardTitle>
                          {customer.mobile && <p className="text-sm text-muted-foreground">{customer.mobile}</p>}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Balance balance={balance} label="Overall Balance" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-20 text-center">
              <h3 className="text-xl font-semibold text-muted-foreground">No Customers Found</h3>
              <p className="text-muted-foreground mt-2">Start by adding a new customer.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
