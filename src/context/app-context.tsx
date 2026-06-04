"use client";

import { createContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { Account, Transaction, TransactionType } from '@/lib/types';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  writeBatch,
  deleteField
} from 'firebase/firestore';

interface AppContextType {
  accounts: Account[];
  transactions: Transaction[];
  tags: string[];
  accountTypes: Array<{ id: string; name: string; isAsset: boolean }>;
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'isDeleted'>) => Promise<void>;
  batchAddTransactions: (rows: Array<{ customerName: string; amount: number; isGot: boolean; description: string; tags: string[]; date: string; isRefund: boolean }>) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  getAccountById: (id: string) => Account | undefined;
  getTransactionsByAccountId: (accountId: string) => Transaction[];
  addTag: (tag: string) => Promise<void>;
  loading: boolean;
}

export const defaultTypes = [
  { id: 'CUSTOMER', name: 'Customer', isAsset: true },
  { id: 'SUPPLIER', name: 'Supplier', isAsset: false },
  { id: 'BANK', name: 'Bank', isAsset: true },
  { id: 'PERSONAL', name: 'Personal', isAsset: false }
];

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [rawAccounts, setRawAccounts] = useState<Account[]>([]);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  const [tagDocs, setTagDocs] = useState<Array<{ id: string; name: string }>>([]);
  const [dbAccountTypes, setDbAccountTypes] = useState<Array<{ id: string; name: string; isAsset: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  const tags = useMemo(() => tagDocs.map(t => t.name), [tagDocs]);
  const accountTypes = useMemo(() => {
    return dbAccountTypes.length > 0 ? dbAccountTypes : defaultTypes;
  }, [dbAccountTypes]);

  // Always derive isAsset from the current type definitions, never trust the stored value
  const accounts = useMemo(() => {
    return rawAccounts.map(acc => {
      const typeDef = accountTypes.find(t => t.id === acc.type) || defaultTypes.find(t => t.id === acc.type);
      return {
        ...acc,
        isAsset: typeDef ? typeDef.isAsset : false,
      };
    });
  }, [rawAccounts, accountTypes]);

  const transactions = useMemo(() => {
    return rawTransactions.map(t => {
      // Resolve tag references to tag name strings
      const resolvedTags = (t.tagRefs || []).map((ref: any) => {
        const match = tagDocs.find(td => td.id === ref.id);
        return match ? match.name : ref.id;
      });
      return {
        ...t,
        tags: resolvedTags.length > 0 ? resolvedTags : (t.tags || []),
      } as Transaction;
    });
  }, [rawTransactions, tagDocs]);

    useEffect(() => {
      if (authLoading) return;
      if (!user) {
        setRawAccounts([]);
        setRawTransactions([]);
        setTagDocs([]);
        setDbAccountTypes([]);
        setLoading(false);
        return;
      }

      let accountsLoaded = false;
      let transactionsLoaded = false;
      let tagsLoaded = false;
      let typesLoaded = false;

      const checkLoaded = () => {
        if (accountsLoaded && transactionsLoaded && tagsLoaded && typesLoaded) {
          setLoading(false);
        }
      };

      const accountsRef = collection(db, `users/${user.uid}/accounts`);
      const unsubscribeAccounts = onSnapshot(accountsRef, (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const d = doc.data() as Account;
          return { ...d };
        }).filter(c => !c.isDeleted);
        setRawAccounts(data);
        accountsLoaded = true;
        checkLoaded();
      });

      const transactionsRef = collection(db, `users/${user.uid}/transactions`);
      const unsubscribeTransactions = onSnapshot(transactionsRef, (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            accountId: d.accountId || d.customerId, // Handle renaming legacy customerId
            amount: Number(d.amount),
            isGot: typeof d.isGot === 'boolean' ? d.isGot : d.type === 'GOT',
            description: d.description || "",
            tagRefs: d.tagRefs || [],
            tags: d.tags || [],
            date: d.date,
            isRefund: !!d.isRefund,
            isDeleted: !!d.isDeleted,
            refundOfTransactionId: d.refundOfTransactionRef?.id || d.refundOfTransactionId || undefined,
            refundedByTransactionId: d.refundedByTransactionRef?.id || d.refundedByTransactionId || undefined,
          };
        });
        setRawTransactions(data);
        transactionsLoaded = true;
        checkLoaded();
      });
      
      const tagsRef = collection(db, `users/${user.uid}/tags`);
      const unsubscribeTags = onSnapshot(tagsRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name as string
        }));
        setTagDocs(data);
        tagsLoaded = true;
        checkLoaded();
      });

      const typesRef = collection(db, `users/${user.uid}/types`);
      const unsubscribeTypes = onSnapshot(typesRef, (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          const knownDefault = defaultTypes.find(dt => dt.id === doc.id || dt.id === (d.name as string)?.toUpperCase());
          // Use explicit isAsset from Firestore if it's a boolean, otherwise fall back to known default
          let isAsset: boolean;
          if (typeof d.isAsset === 'boolean') {
            isAsset = d.isAsset;
          } else if (knownDefault) {
            isAsset = knownDefault.isAsset;
          } else {
            isAsset = false; // Unknown types default to liability (safe default)
          }
          return {
            id: doc.id,
            name: d.name as string,
            isAsset
          };
        });
        setDbAccountTypes(data);
        typesLoaded = true;
        checkLoaded();
      });

      return () => {
        unsubscribeAccounts();
        unsubscribeTransactions();
        unsubscribeTags();
        unsubscribeTypes();
      };
    }, [user, authLoading]);

  const addAccount = async (accountData: Omit<Account, 'id' | 'createdAt'>) => {
    if (!user) return;
    const newId = `acc_${crypto.randomUUID()}`;
    
    const selectedType = accountTypes.find(t => t.id === accountData.type) || defaultTypes.find(t => t.id === accountData.type);
    const isAsset = selectedType ? selectedType.isAsset : true;

    const newAccount: Account = {
      ...accountData,
      isAsset,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, `users/${user.uid}/accounts`, newId), newAccount);
  };

  const updateAccount = async (account: Account) => {
    if (!user) return;
    
    const selectedType = accountTypes.find(t => t.id === account.type) || defaultTypes.find(t => t.id === account.type);
    const isAsset = selectedType ? selectedType.isAsset : true;

    await updateDoc(doc(db, `users/${user.uid}/accounts`, account.id), {
      ...account,
      isAsset
    });
  };

  const deleteAccount = async (accountId: string) => {
    if (!user) return;
    await updateDoc(doc(db, `users/${user.uid}/accounts`, accountId), {
      isDeleted: true
    });
  };

  const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'isDeleted'>) => {
    if (!user) return;
    const newId = `txn_${crypto.randomUUID()}`;
    
    const refundOfTransactionRef = transactionData.refundOfTransactionId
      ? doc(db, `users/${user.uid}/transactions`, transactionData.refundOfTransactionId)
      : null;

    // Resolve tags to DocumentReferences in Firestore
    const tagRefs = await Promise.all((transactionData.tags || []).map(async (tagName) => {
      const cleanName = tagName.trim();
      let match = tagDocs.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
      let tagId = match?.id;
      if (!tagId) {
        tagId = `tag_${crypto.randomUUID()}`;
        await setDoc(doc(db, `users/${user.uid}/tags`, tagId), { name: cleanName, id: tagId });
      }
      return doc(db, `users/${user.uid}/tags`, tagId);
    }));

    const newTransactionDoc = {
      accountId: transactionData.accountId,
      amount: transactionData.amount,
      isGot: transactionData.isGot,
      description: transactionData.description,
      tagRefs,
      date: transactionData.date,
      isRefund: transactionData.isRefund,
      isDeleted: false,
      id: newId,
      ...(refundOfTransactionRef ? { refundOfTransactionRef } : {}),
    };

    await setDoc(doc(db, `users/${user.uid}/transactions`, newId), newTransactionDoc);

    // If this is a refund linked to an original transaction, update the original with a back-reference
    if (transactionData.isRefund && transactionData.refundOfTransactionId) {
      await updateDoc(doc(db, `users/${user.uid}/transactions`, transactionData.refundOfTransactionId), {
        refundedByTransactionRef: doc(db, `users/${user.uid}/transactions`, newId),
      });
    }
  };

  const batchAddTransactions = async (rows: Array<{ customerName: string; amount: number; isGot: boolean; description: string; tags: string[]; date: string; isRefund: boolean }>) => {
    if (!user) return;
    const batch = writeBatch(db);
    let operationCount = 0;
    
    let currentBatch = batch;
    const commitBatchIfNeeded = async () => {
      if (operationCount >= 400) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    };

    const accountMap = new Map<string, string>(); // name to ID
    accounts.forEach(c => accountMap.set(c.name.toLowerCase().trim(), c.id));

    for (const row of rows) {
      const nameKey = row.customerName.toLowerCase().trim();
      let accountId = accountMap.get(nameKey);
      
      if (!accountId) {
        // Create new account as CUSTOMER by default
        accountId = `acc_${crypto.randomUUID()}`;
        accountMap.set(nameKey, accountId);
        
        const newAccount: Account = {
          name: row.customerName.trim(),
          id: accountId,
          type: 'CUSTOMER',
          createdAt: new Date().toISOString(),
        };
        
        const accountRef = doc(db, `users/${user.uid}/accounts`, accountId);
        currentBatch.set(accountRef, newAccount);
        operationCount++;
        await commitBatchIfNeeded();
      }

      // Resolve tag references in batch (safely creating tag docs)
      const tagRefs = await Promise.all((row.tags || []).map(async (tagName) => {
        const cleanName = tagName.trim();
        let match = tagDocs.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
        let tagId = match?.id;
        if (!tagId) {
          tagId = `tag_${crypto.randomUUID()}`;
          const tagDocRef = doc(db, `users/${user.uid}/tags`, tagId);
          await setDoc(tagDocRef, { name: cleanName, id: tagId });
        }
        return doc(db, `users/${user.uid}/tags`, tagId);
      }));

      const newTxnId = `txn_${crypto.randomUUID()}`;
      const newTransactionDoc = {
        id: newTxnId,
        accountId,
        amount: row.amount,
        isGot: row.isGot,
        description: row.description,
        tagRefs,
        date: row.date,
        isRefund: row.isRefund,
        isDeleted: false,
      };

      const txnRef = doc(db, `users/${user.uid}/transactions`, newTxnId);
      currentBatch.set(txnRef, newTransactionDoc);
      operationCount++;
      await commitBatchIfNeeded();
    }

    if (operationCount > 0) {
      await currentBatch.commit();
    }
  };

  const updateTransaction = async (updatedTransaction: Transaction) => {
    if (!user) return;
    
    const previousTransaction = transactions.find(t => t.id === updatedTransaction.id);
    
    const refundOfTransactionRef = updatedTransaction.refundOfTransactionId
      ? doc(db, `users/${user.uid}/transactions`, updatedTransaction.refundOfTransactionId)
      : null;

    // Resolve tag references in updates
    const tagRefs = await Promise.all((updatedTransaction.tags || []).map(async (tagName) => {
      const cleanName = tagName.trim();
      let match = tagDocs.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
      let tagId = match?.id;
      if (!tagId) {
        tagId = `tag_${crypto.randomUUID()}`;
        await setDoc(doc(db, `users/${user.uid}/tags`, tagId), { name: cleanName, id: tagId });
      }
      return doc(db, `users/${user.uid}/tags`, tagId);
    }));

    const transactionDoc = {
      accountId: updatedTransaction.accountId,
      amount: updatedTransaction.amount,
      isGot: updatedTransaction.isGot,
      description: updatedTransaction.description,
      tagRefs,
      date: updatedTransaction.date,
      isRefund: updatedTransaction.isRefund,
      isDeleted: updatedTransaction.isDeleted,
      id: updatedTransaction.id,
      refundOfTransactionRef: refundOfTransactionRef || deleteField(),
    };

    await updateDoc(doc(db, `users/${user.uid}/transactions`, updatedTransaction.id), transactionDoc);

    // If linking changed, update the original transaction(s)
    if (previousTransaction) {
      const prevLink = previousTransaction.refundOfTransactionId;
      const newLink = updatedTransaction.refundOfTransactionId;

      if (prevLink !== newLink) {
        // Clean up previous original transaction link
        if (prevLink) {
          await updateDoc(doc(db, `users/${user.uid}/transactions`, prevLink), {
            refundedByTransactionRef: deleteField()
          });
        }
        // Link to the new original transaction
        if (newLink && updatedTransaction.isRefund) {
          await updateDoc(doc(db, `users/${user.uid}/transactions`, newLink), {
            refundedByTransactionRef: doc(db, `users/${user.uid}/transactions`, updatedTransaction.id)
          });
        }
      }
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    if (!user) return;
    const transaction = transactions.find(t => t.id === transactionId);
    
    await updateDoc(doc(db, `users/${user.uid}/transactions`, transactionId), {
      isDeleted: true
    });

    if (transaction) {
      // If deleting a refund transaction, clean up the original transaction link
      if (transaction.refundOfTransactionId) {
        await updateDoc(doc(db, `users/${user.uid}/transactions`, transaction.refundOfTransactionId), {
          refundedByTransactionRef: deleteField()
        });
      }
      // If deleting an original transaction that was refunded, clean up the refund transaction link
      if (transaction.refundedByTransactionId) {
        await updateDoc(doc(db, `users/${user.uid}/transactions`, transaction.refundedByTransactionId), {
          refundOfTransactionRef: deleteField()
        });
      }
    }
  };
  
  const addTag = async (tag: string) => {
    if (!user) return;
    if (tags.includes(tag)) return;
    const newId = `tag_${crypto.randomUUID()}`;
    await setDoc(doc(db, `users/${user.uid}/tags`, newId), { name: tag, id: newId });
  };

  const getAccountById = (id: string) => {
    return accounts.find((c) => c.id === id);
  };

  const getTransactionsByAccountId = (accountId: string) => {
    return transactions.filter((t) => t.accountId === accountId && !t.isDeleted).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const contextValue = useMemo(() => ({
    accounts,
    transactions,
    tags,
    accountTypes,
    addAccount,
    updateAccount,
    deleteAccount,
    addTransaction,
    batchAddTransactions,
    updateTransaction,
    deleteTransaction,
    getAccountById,
    getTransactionsByAccountId,
    addTag,
    loading,
  }), [accounts, transactions, tags, accountTypes, user, loading]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}
