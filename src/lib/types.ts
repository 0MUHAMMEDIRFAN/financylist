export type Customer = {
  id: string;
  name: string;
  mobile?: string;
  createdAt: string;
  isDeleted?: boolean;
};

export type TransactionType = 'GAVE' | 'GOT';

export type Transaction = {
  id: string;
  customerId: string;
  amount: number;
  isGot: boolean;
  description: string;
  tags: string[];
  date: string;
  isRefund: boolean;
  refundOfTransactionId?: string;
  refundedByTransactionId?: string;
  isDeleted: boolean;
};
