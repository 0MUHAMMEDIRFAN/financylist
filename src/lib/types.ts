export type AccountType = string;

export type Account = {
  id: string;
  name: string;
  mobile?: string;
  type: AccountType;
  createdAt: string;
  isDeleted?: boolean;
  isAsset?: boolean;
};

export type TransactionType = 'GAVE' | 'GOT';

export type Transaction = {
  id: string;
  accountId: string;
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
