import { Card, CardContent } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </CardContent>
    </Card>
  );
}
