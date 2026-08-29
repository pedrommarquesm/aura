import { Button } from "@/components/ui/button";

export function Pagination({
  offset,
  limit,
  total,
  onPage,
}: {
  offset: number;
  limit: number;
  total: number;
  onPage: (offset: number) => void;
}) {
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));

  if (total <= limit) return null;

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <p className="text-caption text-text-muted">
        {total} total · page {page} of {pages}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={offset === 0}
          onClick={() => onPage(Math.max(0, offset - limit))}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={offset + limit >= total}
          onClick={() => onPage(offset + limit)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
