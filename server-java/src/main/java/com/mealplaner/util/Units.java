package com.mealplaner.util;

import java.util.List;
import java.util.Map;

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
  private static final Map<String, String> UNIT_ALIASES = Map.ofEntries(
      Map.entry("г", "g"),
      Map.entry("гр", "g"),
      Map.entry("kg", "kg"),
      Map.entry("кг", "kg"),
      Map.entry("кг.", "kg"),
      Map.entry("g", "g"),
      Map.entry("mg", "mg"),
      Map.entry("мг", "mg"),
      Map.entry("ml", "ml"),
      Map.entry("мл", "ml"),
      Map.entry("l", "l"),
      Map.entry("л", "l"),
      Map.entry("pcs", "pcs"),
      Map.entry("шт", "pcs"),
      Map.entry("шт.", "pcs"),
      Map.entry("pc", "pcs")
  );

  private Units() {}

  public static String resolve(String value) {
    if (value == null) {
      return null;
    }
    String normalized = value.trim().toLowerCase();
    if (normalized.isEmpty()) {
      return null;
    }
    String alias = UNIT_ALIASES.get(normalized);
    if (alias != null) {
      return alias;
    }
    for (String unit : MEASUREMENT_UNITS) {
      if (unit.equals(normalized)) {
        return unit;
      }
    }
    return null;
  }

  public static String sanitize(String value) {
    String resolved = resolve(value);
    return resolved == null ? MEASUREMENT_UNITS.get(0) : resolved;
  }
}
