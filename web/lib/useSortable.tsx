import { useState, useMemo } from "react";

export type SortDir = "asc" | "desc";

export interface SortState<T extends string> {
  col: T | null;
  dir: SortDir;
}

export function useSortable<T extends string>(defaultCol?: T, defaultDir: SortDir = "asc") {
  const [sort, setSort] = useState<SortState<T>>({ col: defaultCol ?? null, dir: defaultDir });

  function toggle(col: T) {
    setSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" }
    );
  }

  function sortItems<Item>(items: Item[], getVal: (col: T, item: Item) => string | number | null): Item[] {
    if (!sort.col) return items;
    const key = sort.col;
    return [...items].sort((a, b) => {
      const va = getVal(key, a) ?? "";
      const vb = getVal(key, b) ?? "";
      const cmp = typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }

  return { sort, toggle, sortItems };
}

/** Renders a small sort chevron indicator */
export function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return (
    <span className="inline-block ml-1 opacity-0 group-hover:opacity-40 transition-opacity">
      <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    </span>
  );
  return dir === "asc" ? (
    <svg className="w-3 h-3 inline ml-1 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-3 h-3 inline ml-1 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
