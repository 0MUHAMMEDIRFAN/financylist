"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/hooks/use-app";
import { calculateBalance, formatCurrency, cn } from "@/lib/utils";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, Settings, Upload, UserPlus, LogOut, ArrowUpRight, ArrowDownLeft, Folder, Users } from "lucide-react";
import { Balance } from "./balance";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { AddTransactionSheet } from "./add-transaction-sheet";

export function AccountListPage() {
  const { accounts, transactions, getTransactionsByAccountId, tags, loading } = useApp();
  const { logout } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  
  const [activeTab, setActiveTab] = useState<"accounts" | "tags">(
    tabParam === "tags" ? "tags" : "accounts"
  );
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sheet states for adding transaction from tags view
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetIsGot, setSheetIsGot] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);

  const filteredAccounts = accounts.filter((acc) =>
    acc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTags = tags.filter((tag) =>
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  let totalYouWillGive = 0;
  let totalYouWillGet = 0;

  accounts.forEach(acc => {
    const accTxns = getTransactionsByAccountId(acc.id);
    const balance = calculateBalance(accTxns);
    const isAsset = acc.isAsset !== false;
    
    if (balance > 0) {
      if (acc.type === 'BANK') {
        // Overdrawn bank: you owe them
        totalYouWillGive += balance;
      } else if (isAsset) {
        // Asset account with positive balance: you received money (e.g. customer paid you)
        // This is "You Got" — add to the green side
        totalYouWillGet += balance;
      } else {
        // Liability account with positive balance: you owe them (e.g. supplier gave you stock, friend lent you money)
        // This is "You'll Give"
        totalYouWillGive += balance;
      }
    } else if (balance < 0) {
      // Negative balance: they owe you money (or standard deposits > withdrawals for BANK, or extra paid for SUPPLIER)
      // This is "You'll Get"
      totalYouWillGet += Math.abs(balance);
    }
  });

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case "CUSTOMER": return "Customer";
      case "SUPPLIER": return "Supplier";
      case "BANK": return "Bank";
      case "PERSONAL": return "Personal";
      default: return type;
    }
  };

  const getAccountTypeBadgeClass = (type: string) => {
    switch (type) {
      case "CUSTOMER": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20";
      case "SUPPLIER": return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20";
      case "BANK": return "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20";
      case "PERSONAL": return "bg-teal-500/10 text-teal-500 hover:bg-teal-500/20 border-teal-500/20";
      default: return "";
    }
  };

  const handleAddTransactionFromTag = (tag: string, isGot: boolean) => {
    setSelectedTag(tag);
    setSheetIsGot(isGot);
    setSheetOpen(true);
  };

  return (
    <div className="flex min-h-screen w-full flex-col pb-24 relative bg-muted/20">
      <Header>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/import">
                <Upload className="mr-2 h-4 w-4" />
                Import Data
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Header>
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 md:px-6">
          {/* Header Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <Card className="bg-positive/10 border-positive/20 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs font-semibold text-positive uppercase tracking-wide mb-1">You will give</p>
                <p className="text-xl font-bold text-positive">{formatCurrency(totalYouWillGive)}</p>
              </CardContent>
            </Card>
            <Card className="bg-destructive/10 border-destructive/20 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs font-semibold text-destructive uppercase tracking-wide mb-1">You will get</p>
                <p className="text-xl font-bold text-destructive">{formatCurrency(totalYouWillGet)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Search Box */}
          <div className="mb-6 flex gap-4 items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">
              {activeTab === "accounts" ? "Accounts" : "Tags"}
            </h1>
            <div className="flex-1 w-full max-w-xs relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={activeTab === "accounts" ? "Search Accounts..." : "Search Tags..."}
                className="w-full bg-background pl-9 h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Main Loading skeletons */}
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
          ) : activeTab === "accounts" ? (
            /* Accounts panel */
            filteredAccounts.length > 0 ? (
              <div className="flex flex-col gap-3">
                {filteredAccounts.map((acc) => {
                  const accTxns = getTransactionsByAccountId(acc.id);
                  const balance = calculateBalance(accTxns);
                  return (
                    <Link href={`/accounts/${acc.id}`} key={acc.id} className="group">
                      <Card className="transform transition-all duration-200 ease-in-out group-hover:bg-muted/30 border-muted-foreground/10">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="text-sm font-bold bg-primary/20 text-primary uppercase">
                                {acc.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-base font-semibold text-foreground">{acc.name}</p>
                                <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 h-4 font-semibold uppercase tracking-wider rounded-sm", getAccountTypeBadgeClass(acc.type))}>
                                  {getAccountTypeLabel(acc.type)}
                                </Badge>
                              </div>
                              {acc.mobile && <p className="text-xs text-muted-foreground">{acc.mobile}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <Balance balance={balance} label="" isAsset={acc.isAsset !== false} accountType={acc.type} />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-background/50 py-16 text-center">
                <h3 className="text-lg font-semibold text-muted-foreground">No Accounts Found</h3>
                <p className="text-muted-foreground text-sm mt-1">Start by adding a new account.</p>
              </div>
            )
          ) : (
            /* Tags panel */
            filteredTags.length > 0 ? (
              <div className="flex flex-col gap-3">
                {filteredTags.map((tag) => {
                  // Calculate Spent vs Got
                  const tagTxns = transactions.filter(t => t.tags.includes(tag) && !t.isDeleted);
                  const spent = tagTxns.reduce((sum, t) => {
                    return sum + (!t.isGot ? t.amount : 0);
                  }, 0);
                  const got = tagTxns.reduce((sum, t) => {
                    return sum + (t.isGot ? t.amount : 0);
                  }, 0);
                  
                  return (
                    <Link href={`/tags/${encodeURIComponent(tag)}`} key={tag} className="group">
                      <Card className="transform transition-all duration-200 ease-in-out group-hover:bg-muted/30 border-muted-foreground/10">
                        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {/* Tag details */}
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Folder className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-base font-bold text-foreground">#{tag}</p>
                              <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                                <span>Spent: <strong className="text-destructive font-semibold">{formatCurrency(spent)}</strong></span>
                                <span>•</span>
                                <span>Got: <strong className="text-positive font-semibold">{formatCurrency(got)}</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* Quick actions for tags */}
                          {/* <div className="flex gap-2 shrink-0" onClick={(e) => e.preventDefault()}>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs border-destructive/20 text-destructive hover:bg-destructive/10 bg-destructive/5"
                              onClick={() => handleAddTransactionFromTag(tag, false)}
                            >
                              <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> Spend
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs border-positive/20 text-positive hover:bg-positive/10 bg-positive/5"
                              onClick={() => handleAddTransactionFromTag(tag, true)}
                            >
                              <ArrowDownLeft className="mr-1 h-3.5 w-3.5" /> Add
                            </Button>
                          </div> */}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-background/50 py-16 text-center">
                <h3 className="text-lg font-semibold text-muted-foreground">No Tags Found</h3>
                <p className="text-muted-foreground text-sm mt-1">Tags will appear here when added to transactions.</p>
              </div>
            )
          )}
        </div>
      </main>

      {/* Floating Add Account FAB (Only visible in Accounts Tab) */}
      {activeTab === "accounts" && (
        <Button asChild size="icon" className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg z-40 transition-transform duration-200">
          <Link href="/accounts/new">
            <UserPlus className="h-6 w-6" />
          </Link>
        </Button>
      )}

      {/* Bottom Tabs Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 py-2 px-4 shadow-[0_-4px_10px_-10px_rgba(0,0,0,0.1)] z-50">
        <div className="container mx-auto max-w-md flex justify-around">
          <Button 
            variant="ghost" 
            className={cn(
              "flex flex-col gap-1 items-center justify-center h-12 w-20 text-muted-foreground rounded-lg transition-colors hover:bg-muted/50",
              activeTab === "accounts" && "text-primary bg-primary/10 hover:bg-primary/15"
            )}
            onClick={() => {
              setActiveTab("accounts");
              setSearchQuery("");
            }}
          >
            <Users className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Accounts</span>
          </Button>

          <Button 
            variant="ghost" 
            className={cn(
              "flex flex-col gap-1 items-center justify-center h-12 w-20 text-muted-foreground rounded-lg transition-colors hover:bg-muted/50",
              activeTab === "tags" && "text-primary bg-primary/10 hover:bg-primary/15"
            )}
            onClick={() => {
              setActiveTab("tags");
              setSearchQuery("");
            }}
          >
            <Folder className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Tags</span>
          </Button>
        </div>
      </div>

      {/* Add Transaction Sheet for tag-view actions */}
      <AddTransactionSheet
        isOpen={sheetOpen}
        setIsOpen={setSheetOpen}
        isGot={sheetIsGot}
        preselectedTag={selectedTag}
      />
    </div>
  );
}
