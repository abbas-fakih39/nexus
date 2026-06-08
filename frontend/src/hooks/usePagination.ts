import { useEffect, useMemo, useState } from 'react';

export interface Pagination<T> {
  page: number;
  pageCount: number;
  pageItems: T[];
  total: number;
  pageSize: number;
  setPage: (p: number) => void;
}

/**
 * Pagination côté client d'une liste déjà chargée.
 * `resetKey` (ex. le texte de recherche) ramène à la page 1 quand il change.
 */
export function usePagination<T>(
  items: T[],
  pageSize = 10,
  resetKey?: unknown,
): Pagination<T> {
  const [page, setPage] = useState(1);

  // Retour à la première page dès que le filtre/la recherche change.
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  // Clamp en rendu : si la liste rétrécit, on ne reste pas sur une page hors limites.
  const current = Math.min(page, pageCount);

  const pageItems = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize],
  );

  return { page: current, pageCount, pageItems, total: items.length, pageSize, setPage };
}
