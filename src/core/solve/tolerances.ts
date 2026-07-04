/** Every numeric tolerance in the solve layer, named, in one place. */
export const TOL = {
  /** Newton polish stops when |step| ≤ polishRel · (1 + |x|). */
  polishRel: 1e-15,
  /** Newton polish iteration cap per root. */
  polishMaxIter: 4,
} as const;
