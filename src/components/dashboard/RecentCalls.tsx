import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface RecentCall {
  id: string;
  queryType: string;
  provider: string;
  createdAt: string;
  apiKey: { label: string; keyPrefix: string } | null;
}

interface RecentCallsProps {
  records?: RecentCall[];
  loading?: boolean;
}

export function RecentCalls({ records, loading }: RecentCallsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          最近查询记录
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !records || records.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            暂无查询记录
          </p>
        ) : (
          <div className="space-y-2">
            {records.slice(0, 10).map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={record.queryType === "balance" ? "default" : "secondary"}
                    className="px-1.5 py-0 text-[10px]"
                  >
                    {record.queryType === "balance" ? "余额" : "用量"}
                  </Badge>
                  <span className="font-medium text-muted-foreground">
                    {record.apiKey?.label ?? "未知 Key"}
                  </span>
                </div>
                <time
                  className={cn(
                    "tabular-nums text-muted-foreground",
                    "text-[10px]",
                  )}
                >
                  {new Date(record.createdAt).toLocaleString("zh-CN", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
