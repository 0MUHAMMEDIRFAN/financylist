import { cn, formatCurrency } from "@/lib/utils";

type BalanceProps = {
  balance: number;
  label: string;
  className?: string;
  isLarge?: boolean;
  isAsset?: boolean;
  accountType?: string;
};

export function Balance({ balance, label, className, isLarge = false, isAsset = true, accountType }: BalanceProps) {
  const getAccountTypeLabel = (type?: string) => {
    switch (type) {
      case "CUSTOMER": return "Customer";
      case "SUPPLIER": return "Supplier";
      case "BANK": return "Bank";
      case "PERSONAL": return "Personal";
      default: return type || "Settled";
    }
  };

  let balanceColor = "text-muted-foreground";
  let balanceLabel = label || (accountType ? getAccountTypeLabel(accountType) : "Settled");

  if (balance > 0) {
    if (accountType === 'BANK') {
      balanceLabel = "You'll Give";
      balanceColor = "text-positive";
    } else if (isAsset) {
      balanceLabel = "You Got";
      balanceColor = "text-positive";
    } else {
      balanceLabel = "You'll Give";
      balanceColor = "text-positive";
    }
  } else if (balance < 0) {
    if (accountType === 'SUPPLIER') {
      balanceLabel = "You Gave";
      balanceColor = "text-destructive";
    } else {
      balanceLabel = "You'll Get";
      balanceColor = "text-destructive";
    }
  }
  
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
        <div className="flex flex-col">
            <span className={cn(
                "font-bold tracking-tight",
                balanceColor,
                isLarge ? "text-3xl" : "text-xl"
                )}>
                {formatCurrency(balance)}
            </span>
            <span className={cn("text-xs font-medium", balanceColor)}>
                {balanceLabel}
            </span>
        </div>
    </div>
  );
}
