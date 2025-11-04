export const MEASUREMENT_UNITS = [
  "g",
  "kg",
  "mg",
  "lb",
  "oz",
  "ml",
  "l",
  "pcs",
  "tbsp",
  "tsp",
  "cup",
] as const;

export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];
