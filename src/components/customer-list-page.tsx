"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/hooks/use-app";
import { calculateBalance, formatCurrency } from "@/lib/utils";
import { Header } from "@/components/header";
import { ImportDialog } from "@/components/import-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, Settings, Upload, UserPlus, LogOut } from "lucide-react";
import { Balance } from "./balance";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";

export function CustomerListPage() {
  const { customers, getTransactionsByCustomerId, loading } = useApp();
  const { logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  let totalYouWillGive = 0;
  let totalYouWillGet = 0;

  customers.forEach(customer => {
    const transactions = getTransactionsByCustomerId(customer.id);
    const balance = calculateBalance(transactions);
    if (balance > 0) {
      totalYouWillGive += balance;
    } else if (balance < 0) {
      totalYouWillGet += Math.abs(balance);
    }
  });

  return (
    <div className="flex min-h-screen w-full flex-col pb-20 relative">
      <Header>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Header>
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 md:px-6">
          <div className="mb-6 grid grid-cols-2 gap-4">
            <Card className="bg-destructive/10 border-destructive/20 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-medium text-destructive mb-1">You will give</p>
                <p className="text-xl font-bold text-destructive">{formatCurrency(totalYouWillGive)}</p>
              </CardContent>
            </Card>
            <Card className="bg-positive/10 border-positive/20 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-medium text-positive mb-1">You will get</p>
                <p className="text-xl font-bold text-positive">{formatCurrency(totalYouWillGet)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6 flex gap-4 items-center justify-between">
            <h1 className="text-2xl font-bold md:text-3xl">Customers</h1>
            <div className="flex-1 w-full max-w-xs">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="w-full bg-background pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCustomers.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filteredCustomers.map((customer) => {
                const transactions = getTransactionsByCustomerId(customer.id);
                const balance = calculateBalance(transactions);
                return (
                  <Link href={`/customers/${customer.id}`} key={customer.id} className="group">
                    <Card className="transform transition-all duration-200 ease-in-out group-hover:bg-muted/50">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-sm font-bold bg-primary/20 text-primary">
                              {customer.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-base font-semibold">{customer.name}</p>
                            {customer.mobile && <p className="text-xs text-muted-foreground">{customer.mobile}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <Balance balance={balance} label="" />
                        </div>
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
      <Button asChild size="icon" className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg">
        <Link href="/customers/new">
          <UserPlus className="h-6 w-6" />
        </Link>
      </Button>
      <ImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
}
