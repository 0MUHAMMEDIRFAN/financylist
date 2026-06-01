export type Customer = {
  id: string;
  name: string;
  mobile?: string;
  createdAt: string;
};

export type TransactionType = 'GAVE' | 'GOT';

export type Transaction = {
  id: string;
  customerId: string;
  amount: number;
  type: TransactionType;
  description: string;
  tags: string[];
  date: string;
  isRefund: boolean;
  refundOfTransactionId?: string;
  isDeleted: boolean;
};
