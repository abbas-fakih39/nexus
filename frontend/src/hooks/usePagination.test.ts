import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from './usePagination';

const items = Array.from({ length: 25 }, (_, i) => i + 1);

describe('usePagination', () => {
  it('découpe la liste en pages', () => {
    const { result } = renderHook(() => usePagination(items, 10));
    expect(result.current.pageCount).toBe(3);
    expect(result.current.total).toBe(25);
    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('renvoie les bons éléments après changement de page', () => {
    const { result } = renderHook(() => usePagination(items, 10));
    act(() => result.current.setPage(3));
    expect(result.current.pageItems).toEqual([21, 22, 23, 24, 25]);
  });

  it('ramène à une page valide quand la liste rétrécit', () => {
    const { result, rerender } = renderHook(({ arr }) => usePagination(arr, 10), {
      initialProps: { arr: items },
    });
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
    rerender({ arr: items.slice(0, 5) }); // une seule page désormais
    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5]);
  });

  it('revient à la page 1 quand resetKey change (nouvelle recherche)', () => {
    const { result, rerender } = renderHook(({ key }) => usePagination(items, 10, key), {
      initialProps: { key: 'a' },
    });
    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);
    rerender({ key: 'b' });
    expect(result.current.page).toBe(1);
  });
});
