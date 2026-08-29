export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-label text-text">{title}</p>
      {body ? <p className="mt-1 text-caption text-text-muted">{body}</p> : null}
    </div>
  );
}

export function QueryError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-danger/40 bg-danger/10 px-5 py-4 text-label text-danger">
      {message}
    </div>
  );
}
