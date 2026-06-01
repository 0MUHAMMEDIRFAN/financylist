import { cn, formatCurrency } from "@/lib/utils";

type BalanceProps = {
  balance: number;
  label: string;
  className?: string;
  isLarge?: boolean;
};

export function Balance({ balance, label, className, isLarge = false }: BalanceProps) {
  const balanceColor = balance < 0 ? "text-destructive" : balance > 0 ? "text-positive-DEFAULT" : "text-muted-foreground";
  const balanceLabel = balance < 0 ? "You'll Get" : balance > 0 ? "You'll Give" : "Settled";
  
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
