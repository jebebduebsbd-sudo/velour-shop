import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/format";

export function StockBadge({ availableUnits }: { availableUnits: number }) {
  if (availableUnits <= 0) {
    return <Badge variant="muted">Out of stock</Badge>;
  }
  return (
    <Badge variant="success">In stock · {formatCount(availableUnits)}</Badge>
  );
}
