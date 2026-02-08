package com.mealplaner.util;

import java.util.List;

public final class Units {
  public static final List<String> MEASUREMENT_UNITS = List.of(
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
      "cup"
  );

  private Units() {}

  public static String sanitize(String value) {
    if (value == null) {
      return MEASUREMENT_UNITS.get(0);
    }
    String normalized = value.trim().toLowerCase();
    for (String unit : MEASUREMENT_UNITS) {
      if (unit.equals(normalized)) {
        return unit;
      }
    }
    return MEASUREMENT_UNITS.get(0);
  }
}
