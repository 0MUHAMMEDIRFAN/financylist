"use client";

import { createContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { Customer, Transaction, TransactionType } from '@/lib/types';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';

interface AppContextType {
  customers: Customer[];
  transactions: Transaction[];
  tags: string[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'isDeleted' | 'date'>) => Promise<void>;
  batchAddTransactions: (rows: Array<{ customerName: string; amount: number; type: TransactionType; description: string; tags: string[]; date: string; isRefund: boolean }>) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  getCustomerById: (id: string) => Customer | undefined;
  getTransactionsByCustomerId: (customerId: string) => Transaction[];
  addTag: (tag: string) => Promise<void>;
  loading: boolean;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCustomers([]);
      setTransactions([]);
      setTags([]);
      setLoading(false);
      return;
    }

    let customersLoaded = false;
    let transactionsLoaded = false;
    let tagsLoaded = false;

    const checkLoaded = () => {
      if (customersLoaded && transactionsLoaded && tagsLoaded) {
        setLoading(false);
      }
    };

    const customersRef = collection(db, `users/${user.uid}/customers`);
    const unsubscribeCustomers = onSnapshot(customersRef, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Customer).filter(c => !c.isDeleted);
      setCustomers(data);
      customersLoaded = true;
      checkLoaded();
    });

    const transactionsRef = collection(db, `users/${user.uid}/transactions`);
    const unsubscribeTransactions = onSnapshot(transactionsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Transaction);
      setTransactions(data);
      transactionsLoaded = true;
      checkLoaded();
    });
    
    const tagsRef = collection(db, `users/${user.uid}/tags`);
    const unsubscribeTags = onSnapshot(tagsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data().name as string);
      setTags(data);
      tagsLoaded = true;
      checkLoaded();
    });

    return () => {
      unsubscribeCustomers();
      unsubscribeTransactions();
      unsubscribeTags();
    };
  }, [user, authLoading]);

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    if (!user) return;
    const newId = `cus_${crypto.randomUUID()}`;
    const newCustomer: Customer = {
      ...customerData,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, `users/${user.uid}/customers`, newId), newCustomer);
  };

  const updateCustomer = async (customer: Customer) => {
    if (!user) return;
    await updateDoc(doc(db, `users/${user.uid}/customers`, customer.id), {
      ...customer
    });
  };

  const deleteCustomer = async (customerId: string) => {
    if (!user) return;
    await updateDoc(doc(db, `users/${user.uid}/customers`, customerId), {
      isDeleted: true
    });
  };

  const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'isDeleted'>) => {
    if (!user) return;
    const newId = `txn_${crypto.randomUUID()}`;
    const newTransaction: Transaction = {
      ...transactionData,
      id: newId,
      isDeleted: false,
    };
    await setDoc(doc(db, `users/${user.uid}/transactions`, newId), newTransaction);
  };

  const batchAddTransactions = async (rows: Array<{ customerName: string; amount: number; type: TransactionType; description: string; tags: string[]; date: string; isRefund: boolean }>) => {
    if (!user) return;
    const batch = writeBatch(db);
    let operationCount = 0;
    
    // Quick helper to commit and reset batch if limit reached (500 limit, let's use 400 to be safe)
    let currentBatch = batch;
    const commitBatchIfNeeded = async () => {
      if (operationCount >= 400) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    };

    const customerMap = new Map<string, string>(); // name to ID
    // Initialize map with existing customers
    customers.forEach(c => customerMap.set(c.name.toLowerCase().trim(), c.id));

    for (const row of rows) {
      const nameKey = row.customerName.toLowerCase().trim();
      let customerId = customerMap.get(nameKey);
      
      if (!customerId) {
        // Create new customer
        customerId = `cus_${crypto.randomUUID()}`;
        customerMap.set(nameKey, customerId);
        
        const newCustomer: Customer = {
          name: row.customerName.trim(),
          id: customerId,
          createdAt: new Date().toISOString(),
        };
        
        const customerRef = doc(db, `users/${user.uid}/customers`, customerId);
        currentBatch.set(customerRef, newCustomer);
        operationCount++;
        await commitBatchIfNeeded();
      }

      const newTxnId = `txn_${crypto.randomUUID()}`;
      const newTransaction: Transaction = {
        id: newTxnId,
        customerId,
        amount: row.amount,
        type: row.type,
        description: row.description,
        tags: row.tags,
        date: row.date,
        isRefund: row.isRefund,
        isDeleted: false,
      };

      const txnRef = doc(db, `users/${user.uid}/transactions`, newTxnId);
      currentBatch.set(txnRef, newTransaction);
      operationCount++;
      await commitBatchIfNeeded();
    }

    if (operationCount > 0) {
      await currentBatch.commit();
    }
  };

  const updateTransaction = async (updatedTransaction: Transaction) => {
    if (!user) return;
    await updateDoc(doc(db, `users/${user.uid}/transactions`, updatedTransaction.id), {
      ...updatedTransaction
    });
  };

  const deleteTransaction = async (transactionId: string) => {
    if (!user) return;
    await updateDoc(doc(db, `users/${user.uid}/transactions`, transactionId), {
      isDeleted: true
    });
  };
  
  const addTag = async (tag: string) => {
      if (!user) return;
      if (tags.includes(tag)) return;
      const newId = `tag_${crypto.randomUUID()}`;
      await setDoc(doc(db, `users/${user.uid}/tags`, newId), { name: tag, id: newId });
  }

  const getCustomerById = (id: string) => {
    return customers.find((c) => c.id === id);
  };

  const getTransactionsByCustomerId = (customerId: string) => {
    return transactions.filter((t) => t.customerId === customerId && !t.isDeleted).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const contextValue = useMemo(() => ({
    customers,
    transactions,
    tags,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addTransaction,
    batchAddTransactions,
    updateTransaction,
    deleteTransaction,
    getCustomerById,
    getTransactionsByCustomerId,
    addTag,
    loading,
  }), [customers, transactions, tags, user, loading]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}
