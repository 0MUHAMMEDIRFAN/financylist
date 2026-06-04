import type { Account, Transaction } from './types';

export const initialCustomers: Account[] = [
  { id: 'cus_1', name: 'Ramesh Patel', mobile: '9876543210', type: 'CUSTOMER', createdAt: '2023-01-15T09:00:00Z' },
  { id: 'cus_2', name: 'Sunita Sharma', mobile: '9876543211', type: 'SUPPLIER', createdAt: '2023-02-20T11:30:00Z' },
  { id: 'cus_3', name: 'Amit Singh', type: 'PERSONAL', createdAt: '2023-03-10T15:45:00Z' },
];

export const initialTransactions: Transaction[] = [
  // Transactions for Ramesh Patel
  { id: 'txn_1', accountId: 'cus_1', amount: 5000, isGot: false, description: 'Personal loan', tags: ['loan'], date: '2023-10-01T10:00:00Z', isRefund: false, isDeleted: false },
  { id: 'txn_2', accountId: 'cus_1', amount: 1500, isGot: true, description: 'Loan repayment', tags: ['repayment'], date: '2023-10-15T14:00:00Z', isRefund: false, isDeleted: false },
  { id: 'txn_3', accountId: 'cus_1', amount: 300, isGot: false, description: 'Lunch expenses', tags: ['food'], date: '2023-11-05T13:00:00Z', isRefund: false, isDeleted: false },
  { id: 'txn_7', accountId: 'cus_1', amount: 1500, isGot: true, description: 'Loan repayment', tags: ['repayment'], date: '2023-11-15T18:00:00Z', isRefund: false, isDeleted: false },

  // Transactions for Sunita Sharma
  { id: 'txn_4', accountId: 'cus_2', amount: 2500, isGot: true, description: 'Project advance', tags: ['work', 'advance'], date: '2023-10-25T11:00:00Z', isRefund: false, isDeleted: false },
  { id: 'txn_5', accountId: 'cus_2', amount: 1000, isGot: false, description: 'Material purchase', tags: ['work', 'materials'], date: '2023-11-02T16:00:00Z', isRefund: false, isDeleted: false },
  { id: 'txn_8', accountId: 'cus_2', amount: 500, isGot: false, description: 'Office supplies', tags: ['work', 'supplies'], date: '2023-11-20T12:00:00Z', isRefund: false, isDeleted: false },

  // Transactions for Amit Singh
  { id: 'txn_6', accountId: 'cus_3', amount: 10000, isGot: false, description: 'Bike purchase help', tags: ['personal', 'loan'], date: '2023-11-10T19:00:00Z', isRefund: false, isDeleted: false },
];
