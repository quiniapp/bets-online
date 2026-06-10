// Home sections render in this grid and must always show EXACTLY 2 full rows
// on desktop: base 4 cols → 8 items, sm 5 → 10, md 6 → 12, lg 7 → 14, xl 8 → 16.
// Items beyond each breakpoint's 2×cols are hidden with per-index classes.
export const SECTION_GRID =
  "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1.5 sm:gap-2"

export const TWO_ROW_MAX_ITEMS = 16

/** Category sections: mobile (base) shows 2 rows of 4 as well. */
export function twoRowItemClass(idx: number): string {
  if (idx < 8) return ""
  if (idx < 10) return "hidden sm:block"
  if (idx < 12) return "hidden md:block"
  if (idx < 14) return "hidden lg:block"
  return "hidden xl:block"
}

/**
 * Featured section: mobile keeps its current 16-item layout (4 rows of 4);
 * from sm up it collapses to exactly 2 rows per breakpoint.
 */
export function featuredItemClass(idx: number): string {
  if (idx < 10) return ""
  if (idx < 12) return "sm:hidden md:block"
  if (idx < 14) return "sm:hidden lg:block"
  return "sm:hidden xl:block"
}
