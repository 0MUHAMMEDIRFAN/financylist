import type { Customer, Transaction } from './types';

export const initialCustomers: Customer[] = [
  { id: 'cus_1', name: 'Ramesh Patel', mobile: '9876543210', createdAt: '2023-01-15T09:00:00Z' },
  { id: 'cus_2', name: 'Sunita Sharma', mobile: '9876543211', createdAt: '2023-02-20T11:30:00Z' },
  { id: 'cus_3', name: 'Amit Singh', createdAt: '2023-03-10T15:45:00Z' },
];

export const initialTransactions: Transaction[] = [
  // Transactions for Ramesh Patel
  { id: 'txn_1', customerId: 'cus_1', amount: 5000, type: 'GAVE', description: 'Personal loan', tags: ['loan'], date: '2023-10-01T10:00:00Z', isRefund: false, isDeleted: false },
  { id: 'txn_2', customerId: 'cus_1', amount: 1500, type: 'GOT', description: 'Loan repayment', tags: ['repayment'], date: '2023-10-15T14:00:00Z', isRefund: false, isDeleted: false },
  { id: 'txn_3', customerId: 'cus_1', amount: 300, type: 'GAVE', description: 'Lunch expenses', tags: ['food'], date: '2023-11-05T13:00:00Z', isRefund: false, isDeleted: false },
  { id: 'txn_7', customerId: 'cus_1', amount: 1500, type: 'GOT', description: 'Loan repayment', tags: ['repayment'], date: '2023-11-15T18:00:00Z', isRefund: false, isDeleted: false },


  // Transactions for Sunita Sharma
  { id: 'txn_4', customerId: 'cus_2', amount: 2500, type: 'GOT', description: 'Project advance', tags: ['work', 'advance'], date: '2023-10-25T11:00:00Z', isRefund: false, isDeleted: false },
  { id: 'txn_5', customerId: 'cus_2', amount: 1000, type: 'GAVE', description: 'Material purchase', tags: ['work', 'materials'], date: '2023-11-02T16:00:00Z', isRefund: false, isDeleted: false },
  { id: 'txn_8', customerId: 'cus_2', amount: 500, type: 'GAVE', description: 'Office supplies', tags: ['work', 'supplies'], date: '2023-11-20T12:00:00Z', isRefund: false, isDeleted: false },

  // Transactions for Amit Singh
  { id: 'txn_6', customerId: 'cus_3', amount: 10000, type: 'GAVE', description: 'Bike purchase help', tags: ['personal', 'loan'], date: '2023-11-10T19:00:00Z', isRefund: false, isDeleted: false },
];
