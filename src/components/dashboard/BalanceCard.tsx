import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  availableBalance?: number;
  totalSpent?: number;
  currency?: string;
  loading?: boolean;
  error?: string;
}

export function BalanceCard({
  availableBalance,
  totalSpent,
  currency = "CNY",
  loading,
  error,
}: BalanceCardProps) {
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          可用余额
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight">
                {availableBalance?.toFixed(2) ?? "—"}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  currency === "CNY" ? "text-orange-500" : "text-green-500",
                )}
              >
                {currency}
              </span>
            </div>
            {totalSpent !== undefined && (
              <p className="mt-1 text-xs text-muted-foreground">
                历史总消耗：{totalSpent.toFixed(2)} {currency}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
