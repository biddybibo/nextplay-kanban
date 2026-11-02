const GAP = 1024

/**
 * Position for a card placed between `before` and `after` (either may be
 * missing at the ends of a column). Midpoints keep each move to a single
 * row update; float precision gives ~50 nested inserts at one spot before
 * values collide, which is plenty for a personal board.
 */
export function positionBetween(before?: number, after?: number): number {
  if (before === undefined && after === undefined) return GAP
  if (before === undefined) return after! - GAP
  if (after === undefined) return before + GAP
  return (before + after) / 2
}
