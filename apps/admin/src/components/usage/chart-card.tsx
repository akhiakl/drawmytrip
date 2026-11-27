import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** A titled chart box; `summary` is the same data in words for screen readers. */
export function ChartCard({
  title,
  summary,
  empty,
  emptyLabel,
  children,
}: Readonly<{
  title: string;
  summary: string;
  empty: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="py-10 text-center text-ink-soft">{emptyLabel}</p>
        ) : (
          <div role="img" aria-label={`${title}. ${summary}`}>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
