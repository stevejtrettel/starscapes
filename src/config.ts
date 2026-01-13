// Configuration constants for the polynomial root visualizer

export const CONFIG = {
  // Initial polynomial count for development
  INITIAL_POLYNOMIAL_COUNT: 10_000,

  // Maximum polynomials supported
  MAX_POLYNOMIAL_COUNT: 1_000_000,

  // Coefficient range for integer grid family
  COEFFICIENT_RANGE: {
    MIN: -50,
    MAX: 50,
  },

  // Disk rendering
  RADIUS_SCALE: 0.02, // Multiplier for radius = RADIUS_SCALE * im

  // Camera defaults
  CAMERA: {
    INITIAL_CENTER: [0, 1] as [number, number],
    INITIAL_SCALE: 10, // Units visible in smaller viewport dimension
    ZOOM_SPEED: 1.1,
    MIN_SCALE: 0.001,
    MAX_SCALE: 1000,
  },
} as const;
