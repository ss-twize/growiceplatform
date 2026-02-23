import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  title: string;
  value: string;
  hint?: string;
  className?: string;
  valueClassName?: string;
};

export function KpiCard({ title, value, hint, className, valueClassName }: KpiCardProps) {
  return (
    <Card className={cn("border-border", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold text-white", valueClassName)}>{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
