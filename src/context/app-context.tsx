"use client";

import { createContext, useState, useMemo, type ReactNode } from 'react';
import type { Customer, Transaction, TransactionType } from '@/lib/types';
import { initialCustomers, initialTransactions } from '@/lib/data';

interface AppContextType {
  customers: Customer[];
  transactions: Transaction[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'isDeleted' | 'date'>) => void;
  updateTransaction: (transaction: Transaction) => void;
  deleteTransaction: (transactionId: string) => void;
  getCustomerById: (id: string) => Customer | undefined;
  getTransactionsByCustomerId: (customerId: string) => Transaction[];
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer: Customer = {
      ...customerData,
      id: `cus_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [...prev, newCustomer]);
  };

  const addTransaction = (transactionData: Omit<Transaction, 'id' | 'isDeleted'| 'date'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: `txn_${crypto.randomUUID()}`,
      date: new Date().toISOString(),
      isDeleted: false,
    };
    setTransactions((prev) => [...prev, newTransaction]);
  };

  const updateTransaction = (updatedTransaction: Transaction) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedTransaction.id ? updatedTransaction : t))
    );
  };

  const deleteTransaction = (transactionId: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? { ...t, isDeleted: true } : t))
    );
  };
  
  const getCustomerById = (id: string) => {
    return customers.find((c) => c.id === id);
  };

  const getTransactionsByCustomerId = (customerId: string) => {
    return transactions.filter((t) => t.customerId === customerId && !t.isDeleted).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };


  const contextValue = useMemo(() => ({
    customers,
    transactions,
    addCustomer,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getCustomerById,
    getTransactionsByCustomerId,
  }), [customers, transactions]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}
