interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, pageCount, total, pageSize, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-[13px]"
    >
      <p className="text-ink-mute">
        <span className="font-mono tabular-nums text-ink-soft">{from}–{to}</span> sur{' '}
        <span className="font-mono tabular-nums text-ink-soft">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <PageButton label="Page précédente" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </PageButton>
        <span aria-current="page" className="px-2 font-medium text-ink">Page {page} / {pageCount}</span>
        <PageButton label="Page suivante" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </PageButton>
      </div>
    </nav>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg border border-border text-ink-mute transition hover:border-border-strong hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
